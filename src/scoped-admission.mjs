import { readFileSync } from "node:fs";
import { isDeepStrictEqual as equal } from "node:util";
import YAML from "yaml";
import { configuredProjection } from "./artifact-projection-policy.mjs";
import {
  projectionRepository,
  projectionDependency,
  projectionHash,
  projectionState,
} from "./artifact-projection.mjs";
import { validateIntakePolicy, intakeHash } from "./canonical-intake.mjs";

const exact = (v, keys) =>
  v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  equal(Object.keys(v).sort(), [...keys].sort());
const digest = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const frozenTypes = new Map([
  ["@lapismd/ai", "dependencies"],
  ["@lapis-notes/app-profile", "dependencies"],
  ["@lapis-notes/lapis-plugin-tasks", "devDependencies"],
]);
const key = (e) => [e.path, e.type, e.name].join(":");

export function scopedEligibilityPolicy(
  bytes = readFileSync(
    new URL("../config/scoped-admissions.json", import.meta.url),
    "utf8",
  ),
) {
  if (
    typeof bytes !== "string" ||
    Buffer.byteLength(bytes) > 8192 ||
    YAML.parseDocument(bytes).errors.length
  )
    throw Error("Invalid trusted scoped admission policy");
  const policy = JSON.parse(bytes);
  if (
    !exact(policy, ["schemaVersion", "repositories"]) ||
    policy.schemaVersion !== 1 ||
    !policy.repositories ||
    typeof policy.repositories !== "object" ||
    Array.isArray(policy.repositories)
  )
    throw Error("Invalid trusted scoped admission policy");
  for (const [repository, grant] of Object.entries(policy.repositories)) {
    if (
      repository !== projectionRepository ||
      !exact(grant, [
        "descriptorSha256",
        "canonicalPolicySha256",
        "immutableShapeSha256",
        "frozenPrerequisites",
      ]) ||
      ![
        grant.descriptorSha256,
        grant.canonicalPolicySha256,
        grant.immutableShapeSha256,
      ].every(digest) ||
      !Array.isArray(grant.frozenPrerequisites) ||
      !grant.frozenPrerequisites.length ||
      grant.frozenPrerequisites.length > 3 ||
      new Set(grant.frozenPrerequisites.map(key)).size !==
        grant.frozenPrerequisites.length ||
      grant.frozenPrerequisites.some(
        (e) =>
          !exact(e, ["path", "type", "name"]) ||
          e.path !== "package.json" ||
          e.type !== frozenTypes.get(e.name),
      )
    )
      throw Error("Invalid trusted scoped admission grant");
  }
  return { policy, sha256: projectionHash(bytes) };
}

export function assertScopedBinding(repository, context, bytes) {
  const policy = scopedEligibilityPolicy(bytes),
    grant = policy.policy.repositories[repository];
  if (!grant && !context) return null;
  if (
    !grant ||
    !exact(context, ["policySha256", "grantSha256", "descriptorSha256"]) ||
    context.policySha256 !== policy.sha256 ||
    context.grantSha256 !== projectionHash(JSON.stringify(grant)) ||
    context.descriptorSha256 !== grant.descriptorSha256
  )
    throw Error("Scoped SDK admission held: missing, revoked or stale grant");
  return grant;
}

/** Exact opt-in changes only the selected view, retaining all deferred evidence. */
export function scopeDevelopmentAdmission(repo, node, graph, options = {}) {
  const policy = scopedEligibilityPolicy(options.scopedEligibility);
  const grant = policy.policy.repositories[repo.repository];
  if (!grant) return;
  // An artifact capability is deliberately insufficient without this second
  // operator decision. Unknown/global/operator holds can never be scoped away.
  try {
    if (
      repo.repository !== projectionRepository ||
      repo.phase !== "pilot" ||
      repo.holdReason ||
      node.acceptance.state !== "qualified" ||
      !Array.isArray(graph.coverage) ||
      graph.coverage.length ||
      !Array.isArray(graph.unpublished) ||
      graph.excludedPackages?.includes(projectionDependency) ||
      node.sourceSha !== repo.sourceSha ||
      !/^[a-f0-9]{40}$/.test(repo.sourceSha ?? "")
    )
      return;
    const artifact = configuredProjection(repo, options.artifactCapabilities),
      source = repo.canonicalIntake;
    if (
      !artifact ||
      artifact.descriptorSha256 !== grant.descriptorSha256 ||
      repo.artifactProjection.descriptor.immutableShapeSha256 !==
        grant.immutableShapeSha256 ||
      typeof source?.policyBytes !== "string" ||
      intakeHash(source.policyBytes) !== grant.canonicalPolicySha256 ||
      source.sha256 !== grant.canonicalPolicySha256 ||
      !equal(JSON.parse(source.policyBytes), source.policy)
    )
      return;
    const canonical = validateIntakePolicy(source.policy, repo.repository);
    if (
      canonical.schemaVersion !== 1 ||
      canonical.dependency !== projectionDependency
    )
      return;
    const bound = projectionState(repo.artifactProjection.inputs);
    if (
      repo.manifests.length !== 1 ||
      repo.manifests[0].path !== "package.json" ||
      !equal(repo.manifests[0].manifest, bound.manifest) ||
      !equal(repo.workspace, bound.workspace) ||
      !equal(repo.lock, bound.lock)
    )
      return;
    const frozen = new Set(grant.frozenPrerequisites.map(key));
    if (
      grant.frozenPrerequisites.some(
        (e) =>
          !bound.manifest[e.type]?.[e.name] ||
          graph.excludedPackages?.includes(e.name),
      )
    )
      return;
    if (
      !Array.isArray(node.sourceHoldFacts) ||
      !equal(
        node.holds,
        node.sourceHoldFacts.map((f) => f.message),
      )
    )
      return;
    for (const fact of node.sourceHoldFacts) {
      if (
        !frozen.has(key(fact)) ||
        bound.manifest[fact.type]?.[fact.name] !== fact.range ||
        !["unavailable-registry", "unpublished-registry"].includes(fact.kind)
      )
        return;
      if (
        fact.kind === "unpublished-registry" &&
        !graph.unpublished?.includes(fact.name)
      )
        return;
    }
    const selected = node.updates.filter(
      (u) =>
        u.path === "package.json" &&
        u.type === "devDependencies" &&
        u.name === projectionDependency,
    );
    if (selected.length > 1) return;
    const view = {
      ...node,
      updates: selected,
      holds: [],
      waits: node.waits.filter((w) => w.package === projectionDependency),
    };
    const deferred = {
      deferredUpdates: node.updates.filter((u) => !selected.includes(u)),
      deferredHolds: [...node.holds],
      deferredHoldFacts: structuredClone(node.sourceHoldFacts),
      deferredWaits: node.waits.filter(
        (w) => w.package !== projectionDependency,
      ),
    };
    Object.assign(node, view, {
      scopedAdmission: {
        kind: "desktop-sdk-development",
        grantSha256: projectionHash(JSON.stringify(grant)),
        policySha256: policy.sha256,
        descriptorSha256: grant.descriptorSha256,
        ...deferred,
      },
    });
  } catch {
    // Malformed/stale source data grants no alternate admission. Existing
    // ordinary holds and the complete original update set remain untouched.
  }
}
