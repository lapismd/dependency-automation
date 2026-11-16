import { readFileSync } from "node:fs";
import semver from "semver";
import { prerequisiteClosure } from "./policy.mjs";
import { verifiedPublication } from "./publications.mjs";
import { hash } from "./publication-tool.mjs";
import { publicationReader } from "./publication-transport.mjs";

const names = [
  "@lapis-notes/api",
  "@lapis-notes/ui",
  "@lapis-notes/workspace",
  "@lapis-notes/file-explorer",
];
const repositories = [
  "lapismd/lapis-notes",
  "lapismd/lapis-plugins",
  "lapismd/lapis-plugin-tasks",
  "lapismd/lapis-plugin-docs",
  "lapismd/lapis-plugin-notebook",
  "lapismd/lapis-server",
];
const fields = (v, keys) =>
  v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  JSON.stringify(Object.keys(v).sort()) === JSON.stringify([...keys].sort());
const fail = () => {
  throw Error("Invalid reviewed channel policy");
};
export function validateChannelPolicy(p) {
  if (
    !fields(p, ["schemaVersion", "default", "cohort"]) ||
    p.schemaVersion !== 1 ||
    p.default !== "latest" ||
    !fields(p.cohort, ["id", "channel", "packages", "scopes"]) ||
    p.cohort.id !== "notes-reviewed-2026-11" ||
    p.cohort.channel !== "next" ||
    p.cohort.packages?.length !== 4 ||
    !Array.isArray(p.cohort.scopes) ||
    !p.cohort.scopes.length ||
    p.cohort.scopes.length > 128
  )
    fail();
  const seen = new Set();
  for (const pin of p.cohort.packages) {
    if (
      !fields(pin, [
        "name",
        "version",
        "integrity",
        "repository",
        "sourceSha",
      ]) ||
      !names.includes(pin.name) ||
      seen.has(pin.name) ||
      !semver.valid(pin.version) ||
      semver.prerelease(pin.version) ||
      !/^sha512-[A-Za-z0-9+/]{86}==$/.test(pin.integrity ?? "") ||
      pin.repository !== "lapismd/lapis-notes" ||
      !/^[a-f0-9]{40}$/.test(pin.sourceSha ?? "")
    )
      fail();
    seen.add(pin.name);
  }
  seen.clear();
  for (const scope of p.cohort.scopes) {
    const id = JSON.stringify(scope);
    if (
      !fields(scope, ["repository", "path", "type", "name"]) ||
      !repositories.includes(scope.repository) ||
      !names.includes(scope.name) ||
      !/^(?:[A-Za-z0-9_.-]+\/)*package\.json$/.test(scope.path ?? "") ||
      scope.path.split("/").some((s) => [".", ".."].includes(s)) ||
      ![
        "dependencies",
        "optionalDependencies",
        "devDependencies",
        "peerDependencies",
      ].includes(scope.type) ||
      seen.has(id)
    )
      fail();
    seen.add(id);
  }
  return p;
}
export function loadChannelPolicy() {
  return validateChannelPolicy(
    JSON.parse(
      readFileSync(new URL("../config/channels.json", import.meta.url), "utf8"),
    ),
  );
}
export const channelPolicyDigest = (p = loadChannelPolicy()) =>
  hash(JSON.stringify(validateChannelPolicy(p)));
const matches = (scope, edge, type = true) =>
  ["repository", "path", "name", ...(type ? ["type"] : [])].every(
    (k) => scope[k] === edge[k],
  );

// Raw publication.channel remains a latest-policy observation, never an override.
export function reviewedPublication(
  graph,
  name,
  version,
  policy = loadChannelPolicy(),
) {
  if (graph.channelPolicySha256 !== channelPolicyDigest(policy)) return false;
  const pin = policy.cohort.packages.find(
    (p) => p.name === name && p.version === version,
  );
  const m = graph.registry?.[name]?.[version];
  if (
    !pin ||
    !m ||
    m.integrity !== pin.integrity ||
    m.deprecated ||
    !Array.isArray(m.publication?.channel?.tags) ||
    !m.publication.channel.tags.includes(policy.cohort.channel) ||
    m.publication.proof?.sourceSha !== pin.sourceSha
  )
    return false;
  const repo = graph.repositories.find(
    (r) => r.repository === pin.repository && r.visibility === "public",
  );
  const manifest = repo?.manifests.find(
    (p) => p.manifest.name === name,
  )?.manifest;
  return !!manifest && verifiedPublication(m, repo, manifest);
}
export function channelProjection(graph, policy = loadChannelPolicy()) {
  const cache = new Map();
  const qualified = policy.cohort.packages.filter((p) =>
    reviewedPublication(graph, p.name, p.version, policy),
  );
  function forPath(repository, path) {
    const key = repository + ":" + path;
    if (cache.has(key)) return cache.get(key);
    if (
      graph.channelPolicySha256 !== channelPolicyDigest(policy) ||
      !graph.stableCandidates
    )
      return graph.available;
    const scoped = qualified.filter((p) =>
      policy.cohort.scopes.some(
        (s) =>
          s.repository === repository && s.path === path && s.name === p.name,
      ),
    );
    const pool = new Map(
      Object.entries(graph.stableCandidates).map(([n, vs]) => [n, [...vs]]),
    );
    for (const p of scoped)
      pool.set(
        p.name,
        [...new Set([...(pool.get(p.name) ?? []), p.version])].sort(
          semver.compare,
        ),
      );
    const registry = new Map(
      Object.entries(graph.registry).map(([n, versions]) => [n, { versions }]),
    );
    const result = prerequisiteClosure(registry, pool);
    cache.set(key, result);
    return result;
  }
  return {
    versions(edge) {
      const vs = forPath(edge.repository, edge.path)?.[edge.name] ?? [];
      return vs.filter(
        (v) =>
          !policy.cohort.packages.some(
            (p) => p.name === edge.name && p.version === v,
          ) ||
          (graph.available[edge.name] ?? []).includes(v) ||
          policy.cohort.scopes.some((s) => matches(s, edge)),
      );
    },
    publication(name, version) {
      return reviewedPublication(graph, name, version, policy);
    },
    approved(edge, target) {
      return (
        !(graph.available[edge.name] ?? []).includes(target) &&
        this.versions(edge).includes(target)
      );
    },
  };
}

// Refresh immutable registry coordinates and channel membership before each
// writer; this cannot create publication proof or alter the admitted source.
export async function revalidateChannels(graph, options = {}) {
  if (graph.channelPolicySha256 === undefined) return;
  const policy = loadChannelPolicy();
  if (graph.channelPolicySha256 !== channelPolicyDigest(policy))
    throw Error("Channel policy changed; re-inventory required");
  const reader = publicationReader(options);
  for (const pin of policy.cohort.packages) {
    if (!reviewedPublication(graph, pin.name, pin.version, policy)) continue;
    const encoded = encodeURIComponent(pin.name);
    const tags = await reader.json(
      `https://registry.npmjs.org/-/package/${encoded}/dist-tags`,
      32 * 1024,
    );
    const metadata = await reader.json(
      `https://registry.npmjs.org/${encoded}/${pin.version}`,
      256 * 1024,
    );
    if (
      tags[policy.cohort.channel] !== pin.version ||
      metadata.name !== pin.name ||
      metadata.version !== pin.version ||
      metadata.dist?.integrity !== pin.integrity ||
      metadata.deprecated
    )
      throw Error("Reviewed channel identity changed; re-inventory required");
  }
}
