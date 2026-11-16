import { isDeepStrictEqual } from "node:util";
import semver from "semver";
import {
  developmentIntakeFacts,
  intakeHash,
  validateIntakePolicy,
} from "./canonical-intake.mjs";

/** Only the existing single-development source profile can separate a wait. */
export function canonicalDevelopmentUpdate(repo, node, graph) {
  try {
    const evidence = repo.canonicalIntake;
    if (
      !/^[a-f0-9]{40}$/.test(repo.sourceSha ?? "") ||
      node.sourceSha !== repo.sourceSha ||
      node.repository !== repo.repository ||
      node.acceptance.state !== "qualified" ||
      node.holds.length ||
      node.updates.length !== 1 ||
      typeof evidence?.policyBytes !== "string" ||
      Buffer.byteLength(evidence.policyBytes) > 8192 ||
      intakeHash(evidence.policyBytes) !== evidence.sha256 ||
      !isDeepStrictEqual(JSON.parse(evidence.policyBytes), evidence.policy)
    )
      return false;
    const policy = validateIntakePolicy(evidence.policy, repo.repository);
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
      ) ||
      node.waits.some((wait) => wait.package === name)
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
