import { isDeepStrictEqual } from "node:util";
import semver from "semver";
import YAML from "yaml";
import { changesetPath } from "./changesets.mjs";
import { dependencies } from "./policy.mjs";
import { intakeHash, lockShape, slotBounds } from "./canonical-intake.mjs";
import {
  validateWorkspaceIntakePolicy,
  workspaceIntakeInputs,
} from "./canonical-workspace-policy.mjs";

const sections = [
  "dependencies",
  "optionalDependencies",
  "devDependencies",
  "peerDependencies",
];
const fail = (reason) => {
  throw Error(`Canonical intake held: ${reason}`);
};
function parse(policy, bytes) {
  for (const path of workspaceIntakeInputs(policy))
    if (
      typeof bytes[path] !== "string" ||
      Buffer.byteLength(bytes[path]) > 2 * 1024 * 1024
    )
      fail("missing or oversized workspace input");
  return {
    workspace: YAML.parse(bytes["pnpm-workspace.yaml"]),
    lock: YAML.parse(bytes["pnpm-lock.yaml"]),
    manifests: Object.fromEntries(
      policy.manifests.map((path) => [path, JSON.parse(bytes[path])]),
    ),
  };
}

export function workspaceIntakeFacts(policy, bytes) {
  const { workspace, lock, manifests } = parse(policy, bytes);
  for (const [importer, entry] of Object.entries(lock.importers ?? {}))
    for (const type of sections)
      for (const name of policy.dependencies)
        if (
          entry[type]?.[name] &&
          !policy.manifests.includes(
            importer === "." ? "package.json" : `${importer}/package.json`,
          )
        )
          fail("selected dependency has an undeclared importer");
  const facts = {
    schemaVersion: 2,
    repository: policy.repository,
    manifests: {},
  };
  for (const path of [...policy.manifests].sort()) {
    const manifest = manifests[path],
      edges = dependencies(manifest, workspace);
    const importer =
      path === "package.json" ? "." : path.slice(0, -"/package.json".length);
    const selected = {};
    for (const type of sections)
      for (const name of [...policy.dependencies].sort()) {
        const declared = manifest[type]?.[name];
        if (declared === undefined) continue;
        const range = edges.find(
          (edge) => edge.name === name && edge.type === type,
        )?.range;
        if (!range) fail("unsupported workspace dependency range");
        let version = null,
          integrity = null;
        if (type !== "peerDependencies") {
          const entry = lock.importers?.[importer]?.[type]?.[name];
          version = entry?.version?.split("(")[0];
          integrity =
            lock.packages?.[`${name}@${version}`]?.resolution?.integrity;
          if (
            !semver.valid(version) ||
            semver.prerelease(version) ||
            !semver.satisfies(version, range) ||
            !(
              entry.specifier === declared ||
              (declared.startsWith("catalog:") && entry.specifier === range)
            ) ||
            !/^sha512-[A-Za-z0-9+/]{86}==$/.test(integrity ?? "")
          )
            fail("inconsistent workspace dependency or lock integrity");
        }
        (selected[type] ??= {})[name] = { declared, range, version, integrity };
      }
    facts.manifests[path] = selected;
  }
  for (const name of policy.dependencies) {
    const versions = new Set(
      Object.values(facts.manifests).flatMap((entry) =>
        Object.values(entry).flatMap((group) =>
          group[name]?.version ? [group[name].version] : [],
        ),
      ),
    );
    if (versions.size !== 1)
      fail("workspace dependency requires one registry identity");
  }
  return facts;
}

export function workspaceIntakeSlot(policy, facts) {
  const rows = [];
  for (const [path, entry] of Object.entries(facts.manifests))
    for (const [type, group] of Object.entries(entry))
      for (const [name, fact] of Object.entries(group))
        rows.push(
          `| \`${path}\` (${type}) | \`${name}\` | \`${fact.range.replaceAll("|", "\\|")}\` | ${fact.version ? `\`${fact.version}\`` : "Peer support"} |`,
        );
  return [
    `<!-- dependency-intake:${policy.slot}:start -->`,
    "Current registry dependency coordinates; qualification remains separate.",
    "",
    "| Manifest | Dependency | Range | Locked version |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
    `Manifest, peer and integrity facts SHA256: \`${intakeHash(JSON.stringify(facts))}\`.`,
    `<!-- dependency-intake:${policy.slot}:end -->`,
  ].join("\n");
}

function stripManifest(manifest, policy) {
  const copy = structuredClone(manifest);
  for (const type of sections)
    for (const name of policy.dependencies)
      if (Object.hasOwn(copy[type] ?? {}, name))
        copy[type][name] = "<intake-range>";
  return copy;
}
function stripCatalogs(workspace, policy, manifests) {
  const copy = structuredClone(workspace);
  for (const manifest of Object.values(manifests))
    for (const type of sections)
      for (const name of policy.dependencies) {
        const value = manifest[type]?.[name];
        if (typeof value !== "string" || !value.startsWith("catalog:"))
          continue;
        const catalog = value.slice(8)
          ? copy.catalogs?.[value.slice(8)]
          : copy.catalog;
        if (Object.hasOwn(catalog ?? {}, name))
          catalog[name] = "<intake-range>";
      }
  return copy;
}
function normalizedLock(lock, policy, facts) {
  let copy = structuredClone(lock);
  for (const name of policy.dependencies) {
    const version = Object.values(facts.manifests).flatMap((entry) =>
      Object.values(entry).flatMap((group) =>
        group[name]?.version ? [group[name].version] : [],
      ),
    )[0];
    copy = lockShape(copy, name, version);
  }
  for (const importer of Object.values(copy.importers ?? {}))
    for (const type of sections)
      for (const name of policy.dependencies)
        if (importer[type]?.[name] && typeof importer[type][name] === "object")
          importer[type][name].specifier = "<intake-range>";
  for (const catalog of Object.values(copy.catalogs ?? {}))
    for (const name of policy.dependencies)
      if (catalog[name]) catalog[name].specifier = "<intake-range>";
  return copy;
}

function validateLockClosure(previous, candidate, policy, oldFacts, facts) {
  const before = normalizedLock(previous, policy, oldFacts);
  const after = normalizedLock(candidate, policy, facts);
  const settings = ({ packages, snapshots, ...rest }) => rest;
  if (!isDeepStrictEqual(settings(before), settings(after)))
    fail("unrelated direct importer or workspace lock setting");
  // pnpm legitimately refreshes third-party transitives during this update.
  // They retain candidate install/audit/CI gates rather than being described
  // as unchanged. Other first-party identities and metadata stay source-bound.
  const firstParty = (key) => /^@(?:lapismd|lapis-notes)\//.test(key);
  const ownedPackages = (lock) =>
    Object.fromEntries(
      Object.entries(lock.packages ?? {}).filter(([key]) => firstParty(key)),
    );
  if (!isDeepStrictEqual(ownedPackages(before), ownedPackages(after)))
    fail("unadmitted first-party package metadata or identity");
  const peers = (text) =>
    [...text.matchAll(/(?:^|\()(@(?:lapismd|lapis-notes)\/[^()]+)/g)]
      .map((match) => match[1])
      .sort();
  const identity = (text) => ({
    version: text.split("(")[0],
    peers: peers(text),
  });
  const owner = (text) => {
    const primary = text.split("(")[0];
    return firstParty(primary)
      ? primary
      : primary.slice(0, primary.lastIndexOf("@"));
  };
  const ownedEdges = (lock) =>
    [
      ...new Set(
        Object.entries(lock.snapshots ?? {})
          .filter(
            ([key, value]) =>
              firstParty(key) ||
              peers(key).length ||
              ["dependencies", "optionalDependencies"].some((type) =>
                Object.keys(value[type] ?? {}).some(firstParty),
              ),
          )
          .map(([key, value]) =>
            JSON.stringify([
              owner(key),
              peers(key),
              ...["dependencies", "optionalDependencies"].map((type) =>
                Object.entries(value[type] ?? {})
                  .filter(([name]) => firstParty(name))
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([name, version]) => [name, identity(version)]),
              ),
            ]),
          ),
      ),
    ].sort();
  if (!isDeepStrictEqual(ownedEdges(before), ownedEdges(after)))
    fail("unadmitted first-party snapshot edge");
  for (const [key, entry] of Object.entries(candidate.packages ?? {})) {
    if (isDeepStrictEqual(previous.packages?.[key], entry)) continue;
    if (
      Object.keys(entry.resolution ?? {}).length !== 1 ||
      !/^sha512-[A-Za-z0-9+/]{86}==$/.test(entry.resolution?.integrity ?? "")
    )
      fail(
        "changed package requires registry integrity without external resolution",
      );
  }
}

export function prepareWorkspaceIntake(data) {
  const {
    repository,
    sourceSha,
    headSha,
    policyBytes,
    currentPolicyBytes,
    before,
    after,
    baseChapters,
    currentChapters,
    changedFiles,
    admittedUpdates,
    branchName,
  } = data;
  if (
    !/^[a-f0-9]{40}$/.test(sourceSha ?? "") ||
    sourceSha !== headSha ||
    typeof policyBytes !== "string" ||
    Buffer.byteLength(policyBytes) > 8192 ||
    policyBytes !== currentPolicyBytes
  )
    fail("stale source or changed workspace policy");
  const policy = validateWorkspaceIntakePolicy(
    JSON.parse(policyBytes),
    repository,
  );
  if (!Array.isArray(admittedUpdates))
    fail("missing admitted workspace targets");
  const allowed = new Set([
    ...workspaceIntakeInputs(policy),
    ...policy.chapters,
  ]);
  if (branchName !== undefined) {
    if (
      typeof branchName !== "string" ||
      !branchName.startsWith("lapis-dependencies/") ||
      branchName.length > 250
    )
      fail("invalid native workspace branch scope");
    allowed.add(changesetPath(branchName));
  }
  if (changedFiles.some((path) => !allowed.has(path)))
    fail("unexpected workspace candidate scope");
  const previous = parse(policy, before),
    candidate = parse(policy, after);
  const oldFacts = workspaceIntakeFacts(policy, before),
    facts = workspaceIntakeFacts(policy, after);
  for (const update of admittedUpdates) {
    const old = oldFacts.manifests[update.path]?.[update.type]?.[update.name];
    if (
      !old ||
      update.repository !== repository ||
      update.compatibility !== "compatible" ||
      update.current !==
        (old.version ?? semver.minVersion(old.range)?.version) ||
      !semver.valid(update.target) ||
      semver.prerelease(update.target) ||
      !/^sha512-[A-Za-z0-9+/]{86}==$/.test(update.integrity ?? "") ||
      semver.lt(update.target, update.current) ||
      ![null, "patch"].includes(semver.diff(update.current, update.target)) ||
      !semver.satisfies(update.target, update.targetRange)
    )
      fail("invalid admitted workspace target");
  }
  if (
    isDeepStrictEqual(oldFacts, facts) &&
    changedFiles.some((path) => workspaceIntakeInputs(policy).includes(path))
  )
    fail("input changes require an admitted first-party intake");
  for (const path of policy.manifests) {
    if (
      !isDeepStrictEqual(
        stripManifest(previous.manifests[path], policy),
        stripManifest(candidate.manifests[path], policy),
      )
    )
      fail("unrelated manifest or public contract change");
    for (const type of sections)
      for (const name of policy.dependencies) {
        const old = oldFacts.manifests[path][type]?.[name],
          next = facts.manifests[path][type]?.[name];
        if (!old && !next) continue;
        if (!old || !next)
          fail("dependency addition or removal requires source review");
        if (
          (old.declared.startsWith("catalog:") ||
            next.declared.startsWith("catalog:")) &&
          old.declared !== next.declared
        )
          fail("catalog declaration routing changed");
        if (next.version === old.version && next.integrity !== old.integrity)
          fail("same-version registry integrity changed");
        if (
          next.version &&
          (semver.lt(next.version, old.version) ||
            ![null, "patch"].includes(semver.diff(old.version, next.version)))
        )
          fail("workspace intake requires compatible forward patches");
        const changed =
          old.range !== next.range || old.declared !== next.declared;
        if (
          changed &&
          !admittedUpdates.some(
            (u) =>
              u.repository === repository &&
              u.path === path &&
              u.type === type &&
              u.name === name &&
              u.compatibility === "compatible" &&
              u.targetRange === next.range &&
              (type === "peerDependencies"
                ? semver.subset(old.range, next.range) &&
                  semver.satisfies(u.target, next.range)
                : u.target === next.version && u.integrity === next.integrity),
          )
        )
          fail("manifest range is outside admitted targets");
        if (
          next.version &&
          next.version !== old.version &&
          !admittedUpdates.some(
            (u) =>
              u.name === name &&
              u.repository === repository &&
              u.target === next.version &&
              u.integrity === next.integrity &&
              u.compatibility === "compatible",
          )
        )
          fail("locked version is outside admitted targets");
      }
  }
  if (
    !isDeepStrictEqual(
      stripCatalogs(previous.workspace, policy, previous.manifests),
      stripCatalogs(candidate.workspace, policy, candidate.manifests),
    )
  )
    fail("unsupported workspace settings");
  validateLockClosure(previous.lock, candidate.lock, policy, oldFacts, facts);
  const outputs = {};
  for (const path of policy.chapters) {
    const base = baseChapters[path],
      current = currentChapters[path];
    const [a, b] = slotBounds(base, policy);
    if (base.slice(a, b) !== workspaceIntakeSlot(policy, oldFacts))
      fail("stale or manually changed workspace facts");
    const prepared =
      base.slice(0, a) + workspaceIntakeSlot(policy, facts) + base.slice(b);
    if (current !== base && current !== prepared)
      fail("manual canonical edits must be preserved");
    if (
      prepared.split("\n").length > 400 ||
      Buffer.byteLength(prepared) > 32768
    )
      fail("canonical chapter exceeds size bound");
    outputs[path] = prepared;
  }
  return { policy, facts, outputs };
}
