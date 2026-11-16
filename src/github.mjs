import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import YAML from "yaml";
import semver from "semver";
import {
  intakePolicyPath,
  intakeHash,
  validateIntakePolicy,
} from "./canonical-intake.mjs";
import { monitoringRepositories } from "./maintenance-policy.mjs";
import {
  activeManifests,
  dependencies,
  excluded,
  firstParty,
  runtimeCycles,
  availableVersions,
  stableVersions,
  workflowApplies,
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
  if (
    options.publicOnly &&
    info.private !== false &&
    info.visibility !== "public"
  )
    return {
      coverageOnly: true,
      opaqueId: createHash("sha256").update(entry.repository).digest("hex"),
      reason: "non-public or unclassified source held",
    };
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
    const blob = tree.tree.find((p) => p.path === path)?.sha;
    const value = await requestJson(
      blob
        ? `${prefix}/git/blobs/${blob}`
        : `${prefix}/contents/${path}?ref=${sha}`,
      options,
    );
    return Buffer.from(value.content, "base64").toString("utf8");
  }
  if (!paths.includes("package.json"))
    throw new Error(`Missing root npm manifest: ${entry.repository}`);
  const manifestContent = await file("package.json");
  const root = JSON.parse(manifestContent);
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
  const pushWorkflows = [],
    prWorkflows = [],
    prWorkflowRules = [];
  const workflowDocuments = [];
  if (options.waveEvidence)
    for (const path of paths.filter((p) =>
      /^\.github\/workflows\/[^/]+\.ya?ml$/.test(p),
    ))
      workflowDocuments.push({ path, workflow: YAML.parse(await file(path)) });
  let changedPaths = null;
  if (
    workflowDocuments.some(
      ({ workflow }) =>
        workflow.on?.push?.paths || workflow.on?.push?.["paths-ignore"],
    )
  ) {
    const files = [];
    for (let page = 1; page <= 30; page++) {
      const commit = await requestJson(
        `${prefix}/commits/${sha}?per_page=100&page=${page}`,
        options,
      );
      if (!Array.isArray(commit.files))
        throw Error("Incomplete current commit path coverage");
      files.push(
        ...commit.files.flatMap((f) => [
          f.filename,
          ...(f.previous_filename ? [f.previous_filename] : []),
        ]),
      );
      if (commit.files.length < 100) {
        changedPaths = files;
        break;
      }
    }
  }
  for (const { path, workflow } of workflowDocuments) {
    const triggers = workflow.on;
    const has = (event) =>
      triggers === event ||
      (Array.isArray(triggers) && triggers.includes(event)) ||
      (triggers && Object.hasOwn(triggers, event));
    if (
      has("push") &&
      workflowApplies(triggers.push, info.default_branch, changedPaths) !==
        false
    )
      pushWorkflows.push(path);
    if (has("pull_request")) {
      prWorkflows.push(path);
      prWorkflowRules.push({ path, trigger: triggers.pull_request ?? null });
    }
  }
  let canonicalIntake;
  if (paths.includes(intakePolicyPath)) {
    const bytes = await file(intakePolicyPath);
    if (Buffer.byteLength(bytes) > 8192)
      throw Error("Oversized canonical intake policy");
    canonicalIntake = {
      policy: validateIntakePolicy(JSON.parse(bytes), entry.repository),
      sha256: intakeHash(bytes),
    };
  }
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
  const lockContent =
    (options.waveEvidence || options.toolingEvidence) &&
    paths.includes("pnpm-lock.yaml")
      ? await file("pnpm-lock.yaml")
      : null;
  return {
    repository: entry.repository,
    phase: entry.phase,
    ...(entry.emptyChangeset ? { emptyChangeset: true } : {}),
    ...(entry.holdReason ? { holdReason: entry.holdReason } : {}),
    sourceSha: sha,
    ...(canonicalIntake ? { canonicalIntake } : {}),
    pushWorkflows,
    prWorkflows,
    prWorkflowRules,
    visibility:
      info.private === false || info.visibility === "public"
        ? "public"
        : "unknown",
    ...(options.waveEvidence || options.toolingEvidence
      ? {
          lock: lockContent ? YAML.parse(lockContent) : null,
        }
      : {}),
    defaultBranch: info.default_branch,
    packageManager: root.packageManager,
    ...(options.toolingEvidence
      ? {
          toolingManifestSha256: createHash("sha256")
            .update(manifestContent)
            .digest("hex"),
          toolingLockSha256: lockContent
            ? createHash("sha256").update(lockContent).digest("hex")
            : null,
          toolingInputs: paths.filter((path) =>
            ["deno.json", "deno.jsonc"].includes(path),
          ),
        }
      : {}),
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
  const coverage = [];
  for (const entry of entries) {
    let repo;
    try {
      repo = await discoverRepository(entry, options);
    } catch (error) {
      if (!options.publicOnly) throw error;
      coverage.push({
        opaqueId: createHash("sha256").update(entry.repository).digest("hex"),
        reason: "source unavailable; held",
      });
      continue;
    }
    if (repo?.coverageOnly)
      coverage.push({ opaqueId: repo.opaqueId, reason: repo.reason });
    else if (repo) {
      options.progress?.(repo.repository);
      repositories.push(repo);
    }
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
  const unpublished = [...names].filter((n) => !registry.has(n)).sort();
  for (const edge of edges) {
    if (!unpublished.includes(edge.name)) continue;
    const repo = repositories.find((r) => r.repository === edge.repository);
    if (repo.manifests.some((p) => p.manifest.name === edge.name)) continue;
    repo.nonPortable.push(
      `${edge.path}:${edge.type}:${edge.name}: unpublished registry dependency`,
    );
  }
  let publicationEvidence;
  if (options.waveEvidence) {
    const { observePublications } = await import("./publications.mjs");
    publicationEvidence = await observePublications(
      packages,
      registry,
      repositories,
      entries,
      options,
    );
  }
  return {
    schemaVersion: 1,
    coverage,
    ...(options.waveEvidence
      ? {
          publicationCoverage: {
            schemaVersion: 1,
            ...publicationEvidence.counts,
          },
          registry: Object.fromEntries(
            [
              ...new Set([...registry.keys(), ...packages.map((p) => p.name)]),
            ].map((name) => {
              const data = registry.get(name) ?? {};
              const observed = new Set(
                [
                  ...stableVersions(data),
                  ...packages
                    .filter((p) => p.name === name)
                    .map((p) => p.manifest.version),
                  data["dist-tags"]?.latest,
                  data["dist-tags"]?.next,
                  ...(options.publicationVersions?.[name] ?? []).slice(0, 16),
                ].filter((version) => semver.valid(version)),
              );
              return [
                name,
                Object.fromEntries(
                  [...observed].map((version) => {
                    const metadata = data.versions?.[version] ?? {};
                    const publication = publicationEvidence.observations.get(
                      `${name}@${version}`,
                    );
                    return [
                      version,
                      {
                        dependencies: metadata.dependencies,
                        optionalDependencies: metadata.optionalDependencies,
                        peerDependencies: metadata.peerDependencies,
                        peerDependenciesMeta: metadata.peerDependenciesMeta,
                        gitHead: metadata.gitHead,
                        integrity: metadata.dist?.integrity,
                        ...(publication ? { publication } : {}),
                      },
                    ];
                  }),
                ),
              ];
            }),
          ),
        }
      : {}),
    excludedPackages: options.excludedPackages ?? [],
    repositories,
    packages,
    edges,
    cycles: runtimeCycles(packages),
    available: availableVersions(registry),
    unpublished,
  };
}

export async function loadAllowlist(
  url = new URL("../config/repositories.json", import.meta.url),
) {
  const data = await loadPolicy(url);
  if (data.schemaVersion !== 1 || !Array.isArray(data.repositories))
    throw new Error("Unsupported repository allowlist");
  const seen = new Set();
  for (const entry of data.repositories) {
    if (
      !/^(?:lapismd|stevejuma)\/[\w.-]+$/.test(entry.repository) ||
      seen.has(entry.repository) ||
      !["pilot", "full"].includes(entry.phase) ||
      (entry.holdReason !== undefined &&
        (typeof entry.holdReason !== "string" || !entry.holdReason.trim()))
    )
      throw new Error("Invalid or duplicate repository entry");
    seen.add(entry.repository);
  }
  return data.repositories;
}

export async function loadPolicy(
  url = new URL("../config/repositories.json", import.meta.url),
) {
  const data = JSON.parse(await readFile(url, "utf8"));
  if (
    data.excludedPackages !== undefined &&
    (!Array.isArray(data.excludedPackages) ||
      data.excludedPackages.some((name) => !firstParty(name)))
  )
    throw Error("Invalid excluded package policy");
  monitoringRepositories(data);
  return data;
}
