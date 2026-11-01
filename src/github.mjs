import { readFile } from "node:fs/promises";
import YAML from "yaml";
import {
  activeManifests,
  dependencies,
  excluded,
  firstParty,
  runtimeCycles,
  availableVersions,
} from "./policy.mjs";

export async function requestJson(
  url,
  { token, fetcher = fetch, allow404 = false } = {},
) {
  const response = await fetcher(url, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(30000),
  });
  if (response.status === 404 && allow404) return null;
  if (!response.ok)
    throw new Error(
      `Request failed (${response.status}): ${new URL(url).origin}${new URL(url).pathname}`,
    );
  return response.json();
}

export async function discoverRepository(entry, options = {}) {
  const prefix = `https://api.github.com/repos/${entry.repository}`;
  const info = await requestJson(prefix, options);
  if (info.archived) return null;
  const branch = await requestJson(
    `${prefix}/branches/${encodeURIComponent(info.default_branch)}`,
    options,
  );
  const sha = options.revision ?? branch.commit.sha;
  const tree = await requestJson(
    `${prefix}/git/trees/${sha}?recursive=1`,
    options,
  );
  if (tree.truncated) throw new Error(`Truncated tree: ${entry.repository}`);
  const paths = tree.tree
    .filter((p) => p.type === "blob" && !excluded(p.path))
    .map((p) => p.path);
  async function file(path) {
    const value = await requestJson(
      `${prefix}/contents/${path}?ref=${sha}`,
      options,
    );
    return Buffer.from(value.content, "base64").toString("utf8");
  }
  if (!paths.includes("package.json"))
    throw new Error(`Missing root npm manifest: ${entry.repository}`);
  const root = JSON.parse(await file("package.json"));
  const workspace = paths.includes("pnpm-workspace.yaml")
    ? YAML.parse(await file("pnpm-workspace.yaml"))
    : {};
  const manifests = [];
  for (const path of activeManifests(paths, root, workspace))
    manifests.push({
      repository: entry.repository,
      path,
      manifest: path === "package.json" ? root : JSON.parse(await file(path)),
    });
  const nonPortable = [];
  for (const p of manifests)
    for (const section of [
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "optionalDependencies",
    ]) {
      for (const [name, value] of Object.entries(p.manifest[section] ?? {}))
        if (firstParty(name) && /^(?:link:|file:)/.test(value))
          nonPortable.push(`${p.path}:${section}:${name}`);
    }
  for (const [name, value] of Object.entries(workspace.overrides ?? {}))
    if (firstParty(name) && /^(?:link:|file:)/.test(value))
      nonPortable.push(`pnpm-workspace.yaml:overrides:${name}`);
  const needsChangesets = manifests.some(
    (p) =>
      !p.manifest.private &&
      dependencies(p.manifest, workspace).some(
        (d) => d.type !== "devDependencies",
      ),
  );
  const missingChangesets =
    needsChangesets && !paths.includes(".changeset/config.json");
  return {
    ...entry,
    sourceSha: sha,
    defaultBranch: info.default_branch,
    packageManager: root.packageManager,
    manifests,
    workspace,
    nonPortable,
    missingChangesets,
    paths: manifests
      .map((p) => p.path)
      .concat(
        paths.includes("pnpm-workspace.yaml") ? ["pnpm-workspace.yaml"] : [],
      ),
  };
}

export async function inventory(entries, options = {}) {
  const repositories = [];
  for (const entry of entries) {
    options.progress?.(entry.repository);
    const repo = await discoverRepository(entry, options);
    if (repo) repositories.push(repo);
  }
  const packages = repositories
    .flatMap((r) => r.manifests)
    .filter((p) => firstParty(p.manifest.name) && !p.manifest.private)
    .map((p) => ({ ...p, name: p.manifest.name }));
  const owners = new Map();
  for (const p of packages) {
    if (owners.has(p.name))
      throw new Error(`Duplicate package owner: ${p.name}`);
    owners.set(p.name, p.repository);
  }
  const edges = repositories.flatMap((r) =>
    r.manifests.flatMap((p) =>
      dependencies(p.manifest, r.workspace).map((d) => ({
        ...d,
        repository: r.repository,
        path: p.path,
        consumer: p.manifest.name,
      })),
    ),
  );
  const names = new Set([...owners.keys(), ...edges.map((d) => d.name)]);
  // Overrides may introduce a first-party dependency absent from manifests.
  for (const r of repositories)
    for (const source of [
      r.workspace.overrides,
      r.workspace.catalog,
      ...Object.values(r.workspace.catalogs ?? {}),
      ...r.manifests.map((p) => p.manifest.pnpm?.overrides),
    ]) {
      for (const selector of Object.keys(source ?? {}))
        for (const name of selector.match(
          /@(?:lapismd|lapis-notes)\/[a-zA-Z0-9._-]+/g,
        ) ?? [])
          names.add(name);
    }
  const registry = new Map();
  for (const name of names) {
    const data = await requestJson(
      `https://registry.npmjs.org/${encodeURIComponent(name)}`,
      { fetcher: options.fetcher, allow404: true },
    );
    if (data) registry.set(name, data);
  }
  // Discover first-party prerequisites from published metadata as well.
  for (const [name, data] of registry)
    for (const m of Object.values(data.versions ?? {})) {
      for (const dep of Object.keys({
        ...m.dependencies,
        ...m.peerDependencies,
      })) {
        if (!firstParty(dep) || names.has(dep)) continue;
        names.add(dep);
        const nested = await requestJson(
          `https://registry.npmjs.org/${encodeURIComponent(dep)}`,
          { fetcher: options.fetcher, allow404: true },
        );
        if (nested) registry.set(dep, nested);
      }
    }
  return {
    schemaVersion: 1,
    repositories,
    packages,
    edges,
    cycles: runtimeCycles(packages),
    available: availableVersions(registry),
    unpublished: [...names].filter((n) => !registry.has(n)).sort(),
  };
}

export async function loadAllowlist(
  url = new URL("../config/repositories.json", import.meta.url),
) {
  const data = JSON.parse(await readFile(url, "utf8"));
  if (data.schemaVersion !== 1 || !Array.isArray(data.repositories))
    throw new Error("Unsupported repository allowlist");
  const seen = new Set();
  for (const entry of data.repositories) {
    if (
      !/^(?:lapismd|stevejuma)\/[\w.-]+$/.test(entry.repository) ||
      seen.has(entry.repository) ||
      !["pilot", "full"].includes(entry.phase)
    )
      throw new Error("Invalid or duplicate repository entry");
    seen.add(entry.repository);
  }
  return data.repositories;
}
