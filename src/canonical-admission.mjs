import { isDeepStrictEqual } from "node:util";
import semver from "semver";
import {
  developmentIntakeFacts,
  intakeHash,
  intakePolicyPath,
  validateIntakePolicy,
} from "./canonical-intake.mjs";
import { workspaceIntakeFacts } from "./canonical-workspace.mjs";
import { channelProjection } from "./channels.mjs";

function workspacePreparationSupported(repo, node, graph, policy) {
  const channels = channelProjection(graph);
  const manifests = new Map(
    repo.manifests.map((entry) => [entry.path, entry.manifest]),
  );
  for (const overrides of [
    repo.workspace.overrides,
    ...[...manifests.values()].map((m) => m.pnpm?.overrides),
  ])
    for (const [selector, range] of Object.entries(overrides ?? {}))
      for (const name of policy.dependencies)
        if (
          selector.includes(name) &&
          (selector !== name ||
            !semver.validRange(range) ||
            node.updates.some(
              (update) =>
                update.name === name && !semver.satisfies(update.target, range),
            ))
        )
          return false;
  if (policy.manifests.some((path) => !manifests.has(path))) return false;
  for (const [path, manifest] of manifests)
    for (const type of [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
    ])
      if (
        !policy.manifests.includes(path) &&
        policy.dependencies.some((name) =>
          Object.hasOwn(manifest[type] ?? {}, name),
        )
      )
        return false;
  const facts = workspaceIntakeFacts(policy, {
    "pnpm-workspace.yaml": JSON.stringify(repo.workspace),
    "pnpm-lock.yaml": JSON.stringify(repo.lock),
    ...Object.fromEntries(
      policy.manifests.map((path) => [
        path,
        JSON.stringify(manifests.get(path)),
      ]),
    ),
  });
  return (
    node.updates.length > 0 &&
    node.updates.every((update) => {
      const fact = facts.manifests[update.path]?.[update.type]?.[update.name];
      return (
        fact &&
        update.repository === repo.repository &&
        update.compatibility === "compatible" &&
        semver.valid(update.target) &&
        !semver.prerelease(update.target) &&
        update.current ===
          (fact.version ?? semver.minVersion(fact.range)?.version) &&
        semver.gte(update.target, update.current) &&
        [null, "patch"].includes(semver.diff(update.current, update.target)) &&
        semver.satisfies(update.target, update.targetRange) &&
        channels.versions(update).includes(update.target) &&
        /^sha512-[A-Za-z0-9+/]{86}==$/.test(
          graph.registry?.[update.name]?.[update.target]?.integrity ?? "",
        )
      );
    })
  );
}

/** The complete bounded source capability applies before any writer admission. */
function canonicalPreparationSupported(repo, node, graph) {
  try {
    const evidence = repo.canonicalIntake;
    if (
      !/^[a-f0-9]{40}$/.test(repo.sourceSha ?? "") ||
      node.sourceSha !== repo.sourceSha ||
      node.repository !== repo.repository ||
      !node.updates.length ||
      typeof evidence?.policyBytes !== "string" ||
      Buffer.byteLength(evidence.policyBytes) > 8192 ||
      intakeHash(evidence.policyBytes) !== evidence.sha256 ||
      !isDeepStrictEqual(JSON.parse(evidence.policyBytes), evidence.policy)
    )
      return false;
    const policy = validateIntakePolicy(evidence.policy, repo.repository);
    if (policy.schemaVersion === 2)
      return workspacePreparationSupported(repo, node, graph, policy);
    if (node.updates.length !== 1) return false;
    const update = node.updates[0],
      name = policy.dependency;
    if (
      update.name !== name ||
      update.repository !== repo.repository ||
      update.path !== "package.json" ||
      update.type !== "devDependencies" ||
      update.compatibility !== "compatible" ||
      update.releaseIntent !== null ||
      update.updateType !== "patch" ||
      !semver.gt(update.target, update.current) ||
      semver.diff(update.current, update.target) !== "patch" ||
      update.targetRange !== update.target ||
      !(graph.available[name] ?? []).includes(update.target) ||
      !/^sha512-[A-Za-z0-9+/]{86}==$/.test(
        graph.registry?.[name]?.[update.target]?.integrity ?? "",
      )
    )
      return false;
    const manifest = repo.manifests.find(
      (p) => p.path === "package.json",
    )?.manifest;
    const facts = developmentIntakeFacts(name, {
      manifest,
      workspace: repo.workspace,
      lock: repo.lock,
    });
    if (facts.version !== update.current) return false;
    // A global override must not quietly move an active runtime or another dev importer.
    for (const { path, manifest: entry } of repo.manifests) {
      if (
        entry.dependencies?.[name] ||
        entry.optionalDependencies?.[name] ||
        (path !== "package.json" && entry.devDependencies?.[name]) ||
        Object.keys(entry.pnpm?.overrides ?? {}).some((key) =>
          key.includes(name),
        )
      )
        return false;
      const peer = entry.peerDependencies?.[name];
      if (
        peer &&
        (!semver.validRange(peer) ||
          !semver.satisfies(update.current, peer) ||
          !semver.satisfies(update.target, peer))
      )
        return false;
    }
    if (
      Object.keys(repo.workspace.overrides ?? {}).some(
        (key) => key !== name && key.includes(name),
      ) ||
      Object.hasOwn(repo.workspace.catalog ?? {}, name) ||
      Object.values(repo.workspace.catalogs ?? {}).some((catalog) =>
        Object.hasOwn(catalog, name),
      )
    )
      return false;
    return true;
  } catch {
    // Unknown, stale or malformed source data grants no independent admission.
    return false;
  }
}

export function canonicalPreparationHold(repo, node, graph) {
  if (
    !node.updates.length ||
    (!Object.hasOwn(repo, "canonicalIntake") &&
      !repo.paths?.includes(intakePolicyPath))
  )
    return null;
  return canonicalPreparationSupported(repo, node, graph)
    ? null
    : "source-owned canonical preparation does not support this update set";
}

/** Only the existing single-development source profile can separate a wait. */
export function canonicalDevelopmentUpdate(repo, node, graph) {
  try {
    return (
      node.acceptance.state === "qualified" &&
      repo.canonicalIntake?.policy?.schemaVersion === 1 &&
      node.holds.length === 0 &&
      !node.waits.some((wait) => wait.package === node.updates[0]?.name) &&
      canonicalPreparationSupported(repo, node, graph)
    );
  } catch {
    return false;
  }
}
