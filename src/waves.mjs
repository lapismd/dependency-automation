import { createHash } from "node:crypto";
import semver from "semver";
import { nodeAttention } from "./wave-attention.mjs";
import { channelProjection } from "./channels.mjs";
import { runtimeCycles, dependencies } from "./policy.mjs";
import {
  verifiedPublication,
  validatePublicationEvidence,
} from "./publications.mjs";
import { releaseIntent } from "./changesets.mjs";
import {
  scopeDevelopmentAdmission,
  scopedEligibilityPolicy,
} from "./scoped-admission.mjs";
import {
  canonicalDevelopmentUpdate,
  canonicalPreparationHold,
  canonicalWorkspaceUpdate,
} from "./canonical-admission.mjs";
import {
  lockVersion,
  qualification,
  branchOwnership,
} from "./wave-evidence.mjs";

export const identity = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const emptyState = () => ({
  schemaVersion: 1,
  generation: 0,
  releases: {},
  operations: {},
  publications: {},
});

export function validateState(state) {
  const object = (value) =>
    value && typeof value === "object" && !Array.isArray(value);
  const keys = (value, names) =>
    object(value) && Object.keys(value).every((key) => names.includes(key));
  const sha = (value) => /^[a-f0-9]{40}$/.test(value ?? "");
  const packageName = (value) =>
    /^@(?:lapismd|lapis-notes)\/[a-zA-Z0-9._-]+$/.test(value ?? "");
  const repository = (value) =>
    /^(?:lapismd|stevejuma)\/[\w.-]+$/.test(value ?? "");
  const target = (value) =>
    keys(value, ["name", "type", "target", "path"]) &&
    packageName(value.name) &&
    semver.valid(value.target) &&
    [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
    ].includes(value.type) &&
    (value.path === undefined || typeof value.path === "string");
  if (
    !keys(state, [
      "schemaVersion",
      "generation",
      "releases",
      "operations",
      "publications",
      "policyRevision",
      "observedAt",
    ]) ||
    state.schemaVersion !== 1 ||
    !Number.isSafeInteger(state.generation) ||
    state.generation < 0 ||
    !object(state.releases) ||
    !object(state.operations) ||
    !object(state.publications) ||
    (state.policyRevision !== undefined && !sha(state.policyRevision))
  )
    throw Error("Unsupported wave state");
  for (const release of Object.values(state.releases))
    if (
      !keys(release, [
        "name",
        "repository",
        "sourceSha",
        "baseline",
        "requires",
        "status",
        "policyRevision",
        "qualifiedSourceSha",
        "supersededSourceSha",
        "version",
      ]) ||
      !packageName(release.name) ||
      !repository(release.repository) ||
      !sha(release.sourceSha) ||
      !sha(release.policyRevision) ||
      !semver.valid(release.baseline) ||
      !Array.isArray(release.requires) ||
      !release.requires.every(target) ||
      !["waiting", "published", "superseded"].includes(release.status)
    )
      throw Error("Unsupported stored release evidence");
  for (const operation of Object.values(state.operations))
    if (
      !keys(operation, [
        "id",
        "repository",
        "sourceSha",
        "policyRevision",
        "targets",
        "status",
        "runId",
        "recovery",
        "reconciliation",
        "firstObservedAt",
        "observedAt",
        "ownership",
        "acceptance",
        "reason",
      ]) ||
      !/^[a-f0-9]{64}$/.test(operation.id ?? "") ||
      !repository(operation.repository) ||
      !sha(operation.sourceSha) ||
      !sha(operation.policyRevision) ||
      !Array.isArray(operation.targets) ||
      !operation.targets.every(target) ||
      ![
        "held",
        "upstream-wait",
        "unchanged",
        "publication-wait",
        "qualification-wait",
        "failed",
        "admitted",
        "uncertain",
        "planned",
        "accepted-on-main",
        "observed-on-branch",
        "partially-accepted-on-main",
        "retry-approved",
      ].includes(operation.status) ||
      (operation.runId !== undefined && !/^\d+$/.test(operation.runId)) ||
      (operation.reconciliation !== undefined &&
        (!keys(operation.reconciliation, [
          "action",
          "expectedRevision",
          "currentSourceSha",
          "previousRunId",
          "absorbedTargets",
          "remainingTargets",
          "observedAt",
        ]) ||
          operation.reconciliation.action !== "partition-observed-main" ||
          !sha(operation.reconciliation.expectedRevision) ||
          !sha(operation.reconciliation.currentSourceSha) ||
          !/^\d+$/.test(operation.reconciliation.previousRunId ?? "") ||
          !Array.isArray(operation.reconciliation.absorbedTargets) ||
          !operation.reconciliation.absorbedTargets.every(target) ||
          !operation.reconciliation.absorbedTargets.length ||
          !Array.isArray(operation.reconciliation.remainingTargets) ||
          !operation.reconciliation.remainingTargets.every(target) ||
          !operation.reconciliation.remainingTargets.length ||
          typeof operation.reconciliation.observedAt !== "string"))
    )
      throw Error("Unsupported stored operation evidence");
  for (const publication of Object.values(state.publications))
    if (
      !keys(publication, [
        "name",
        "version",
        "integrity",
        "evidence",
        "verifiedEvidence",
      ]) ||
      !packageName(publication.name) ||
      !semver.valid(publication.version) ||
      typeof publication.integrity !== "string" ||
      !publication.integrity
    )
      throw Error("Unsupported stored publication evidence");
  for (const publication of Object.values(state.publications)) {
    if (publication.evidence) validatePublicationEvidence(publication.evidence);
    if (
      publication.verifiedEvidence &&
      validatePublicationEvidence(publication.verifiedEvidence).state !==
        "verified"
    )
      throw Error("Unsupported verified publication receipt");
  }
  return state;
}

export function updateType(current, target) {
  if (semver.major(current) !== semver.major(target)) return "major";
  if (semver.minor(current) !== semver.minor(target)) return "minor";
  return "patch";
}

function targetRange(edge, target) {
  if (edge.type === "peerDependencies" && !semver.satisfies(target, edge.range))
    return `${edge.range} || ^${target}`;
  if (edge.type === "peerDependencies") return edge.range;
  if (edge.range.includes("||"))
    return semver.satisfies(target, edge.range) ? edge.range : null;
  return /^[~^]/.test(edge.range) ? edge.range[0] + target : target;
}

// A compatible lock refresh can arrive before an already-required manifest bump.
// Reconcile that existing intent only; do not manufacture new minimum policies.
function retainedMinimumRequired(previous, repo, edge, target) {
  const release = previous.releases[edge.consumer];
  const manifest = repo.manifests.find((p) => p.path === edge.path)?.manifest;
  return (
    ["dependencies", "optionalDependencies"].includes(edge.type) &&
    release?.status === "waiting" &&
    release.repository === repo.repository &&
    release.name === manifest?.name &&
    !manifest.private &&
    manifest[edge.type]?.[edge.name] === edge.range &&
    /^[~^]\d+\.\d+\.\d+$/.test(edge.range) &&
    semver.satisfies(target, edge.range) &&
    semver.lt(semver.minVersion(edge.range), target) &&
    release.requires.some(
      (req) =>
        req.name === edge.name &&
        req.type === edge.type &&
        req.target === target,
    )
  );
}

function operationTargetSatisfied(previous, graph, repo, operation, target) {
  const edge = graph.edges.find(
    (entry) =>
      entry.repository === operation.repository &&
      entry.path === target.path &&
      entry.type === target.type &&
      entry.name === target.name,
  );
  const manifest = repo.manifests.find(
    (entry) => entry.path === target.path,
  )?.manifest;
  if (
    !edge &&
    repo.sourceSha !== operation.sourceSha &&
    !Object.hasOwn(manifest?.[target.type] ?? {}, target.name)
  )
    return true;
  if (edge?.type === "peerDependencies")
    return semver.satisfies(target.target, edge.range);
  const current = edge && lockVersion(repo, edge).version;
  return (
    current &&
    semver.gte(current, target.target) &&
    !retainedMinimumRequired(previous, repo, edge, target.target)
  );
}

function compoundRequirement(req, entry, metadata, repo) {
  const range = entry.manifest[req.type]?.[req.name];
  if (
    !["dependencies", "optionalDependencies"].includes(req.type) ||
    typeof range !== "string" ||
    !range.includes("||") ||
    !semver.validRange(range) ||
    !semver.satisfies(req.target, range) ||
    metadata[req.type]?.[req.name] !== range
  )
    return false;
  const resolved = lockVersion(repo, {
    path: entry.path,
    type: req.type,
    name: req.name,
  }).version;
  return !!resolved && semver.gte(resolved, req.target);
}

function released(intent, graph, repo, channels) {
  if (!intent.requires.length) return false;
  const entry = repo.manifests.find((p) => p.manifest.name === intent.name),
    own = entry?.manifest;
  if (
    !own ||
    !semver.valid(own.version) ||
    !semver.gt(own.version, intent.baseline ?? "0.0.0")
  )
    return false;
  const metadata = graph.registry?.[intent.name]?.[own.version];
  if (
    !metadata?.integrity ||
    !verifiedPublication(metadata, repo, own) ||
    (metadata.publication.channel.admitted !== true &&
      !channels.publication(intent.name, own.version)) ||
    (!(graph.available[intent.name] ?? []).includes(own.version) &&
      !channels.publication(intent.name, own.version) &&
      !channels
        .publisherVersions(repo.repository, entry.path, intent.name)
        .includes(own.version))
  )
    return false;
  const floors = intent.requires.map((req) => {
    const range = metadata[req.type]?.[req.name];
    return (
      semver.validRange(range) &&
      semver.satisfies(req.target, range) &&
      (req.type === "peerDependencies" ||
        semver.gte(semver.minVersion(range), req.target))
    );
  });
  return (
    floors.some(Boolean) &&
    intent.requires.every(
      (req, n) => floors[n] || compoundRequirement(req, entry, metadata, repo),
    )
  );
}

// Earlier planners could invent publication intent for a lock-only compound
// update. Retire only that disproved wait, never claim a new publication.
function obsoleteCompoundIntent(intent, graph, repo, channels) {
  const entry = repo.manifests.find((p) => p.manifest.name === intent.name);
  const own = entry?.manifest;
  const metadata = graph.registry?.[intent.name]?.[own?.version];
  if (
    !entry ||
    !semver.valid(own.version) ||
    !metadata?.integrity ||
    !verifiedPublication(metadata, repo, own) ||
    (metadata.publication.channel.admitted !== true &&
      !channels.publication(intent.name, own.version)) ||
    (!(graph.available[intent.name] ?? []).includes(own.version) &&
      !channels.publication(intent.name, own.version) &&
      !channels
        .publisherVersions(repo.repository, entry.path, intent.name)
        .includes(own.version))
  )
    return false;
  return intent.requires.every((req) =>
    compoundRequirement(req, entry, metadata, repo),
  );
}

// Package SCCs prevent false repository cycles (A's API -> B -> A's app).
function cyclicPackages(graph) {
  const packages = graph.packages.map((p) => ({
    ...p,
    manifest: {
      ...p.manifest,
      dependencies: {
        ...p.manifest.dependencies,
        ...p.manifest.optionalDependencies,
        ...Object.fromEntries(
          Object.entries(p.manifest.peerDependencies ?? {}).filter(
            ([name]) => !p.manifest.peerDependenciesMeta?.[name]?.optional,
          ),
        ),
      },
    },
  }));
  return new Set(runtimeCycles(packages).flat());
}

function updateFamily(graph, update) {
  if (update.compatibility === "compatible") return "lapis-first-party";
  const owner = graph.packages.find((p) => p.name === update.name)?.repository;
  return owner ? `lapis-${owner.split("/")[1]}-compatibility` : null;
}

function branchFamily(graph, branch) {
  const slug = branch?.replace(/^lapis-dependencies\//, "");
  if (slug === "lapis-first-party") return slug;
  return graph.packages.some(
    (p) => slug === `lapis-${p.repository.split("/")[1]}-compatibility`,
  )
    ? slug
    : null;
}

function observedOperationTargets(repo, operation, graph, options, channels) {
  if (!operation.targets.length) return false;
  return operation.targets.every((target) => {
    const edge = graph.edges.find(
      (e) =>
        e.repository === repo.repository &&
        e.path === target.path &&
        e.type === target.type &&
        e.name === target.name,
    );
    const current = edge && lockVersion(repo, edge).version;
    if (!current) return false;
    const type = updateType(current, target.target);
    const family = updateFamily(graph, {
      ...target,
      compatibility:
        type === "major" || (semver.major(current) === 0 && type === "minor")
          ? "breaking"
          : "compatible",
    });
    return (repo.evidence?.prs ?? []).some((pr) => {
      const candidate = pr.candidate;
      if (
        !family ||
        branchFamily(graph, pr.head?.ref) !== family ||
        branchOwnership([pr], options.botLogin, options.botAuthor).state !==
          "bot-owned" ||
        !/^[a-f0-9]{40}$/.test(pr.head?.sha ?? "") ||
        candidate?.sourceSha !== pr.head.sha ||
        candidate.visibility !== "public"
      )
        return false;
      const manifest = candidate.manifests?.find(
        (p) => p.path === target.path,
      )?.manifest;
      const range =
        manifest &&
        dependencies(manifest, candidate.workspace).find(
          (e) => e.type === target.type && e.name === target.name,
        )?.range;
      if (!semver.validRange(range)) return false;
      if (target.type === "peerDependencies")
        return (
          semver.satisfies(target.target, range) &&
          semver.subset(edge.range, range)
        );
      const resolved = lockVersion(candidate, target).version,
        expected = targetRange(edge, target.target);
      if (
        !resolved ||
        !channels.versions(edge).includes(resolved) ||
        !semver.satisfies(resolved, range) ||
        semver.prerelease(resolved) ||
        semver.lt(resolved, target.target) ||
        semver.major(resolved) !== semver.major(target.target) ||
        (semver.major(resolved) === 0 &&
          semver.minor(resolved) !== semver.minor(target.target))
      )
        return false;
      if (range === expected) return true;
      // A later compatible result may cover an older uncertain target. Compound
      // ranges must remain exact; simple ranges retain their original operator.
      return (
        /^[~^]?\d+\.\d+\.\d+$/.test(expected ?? "") &&
        /^[~^]?\d+\.\d+\.\d+$/.test(range) &&
        (range.match(/^[~^]/)?.[0] ?? "") ===
          (expected.match(/^[~^]/)?.[0] ?? "") &&
        semver.gte(semver.minVersion(range), semver.minVersion(expected))
      );
    });
  });
}

function successorWriterReceipt(state, operation) {
  if (!operation.runId) return null;
  const origin = BigInt(operation.runId);
  return Object.values(state.operations)
    .filter(
      (candidate) =>
        candidate.id !== operation.id &&
        candidate.repository === operation.repository &&
        candidate.runId &&
        BigInt(candidate.runId) > origin,
    )
    .sort((a, b) => (BigInt(a.runId) < BigInt(b.runId) ? -1 : 1))[0];
}

export function planWaves(graph, previous = emptyState(), options = {}) {
  validateState(previous);
  const now = options.now ?? new Date().toISOString();
  const state = structuredClone(previous);
  const policyRevision = options.policyRevision;
  if (!/^[a-f0-9]{40}$/.test(policyRevision ?? ""))
    throw Error("Exact coordinator policy revision required");
  // State is public. Persist coordinates only after public repository classification.
  if (graph.repositories.some((r) => r.visibility !== "public"))
    throw Error("Non-public graph cannot enter public wave storage");
  const publicRepos = new Set(graph.repositories.map((r) => r.repository));
  if (
    Object.values(state.releases).some((r) => !publicRepos.has(r.repository)) ||
    Object.values(state.operations).some((r) => !publicRepos.has(r.repository))
  )
    throw Error(
      "Stored source coverage unavailable; hold state without exposing coordinates",
    );
  for (const operation of Object.values(state.operations)) {
    if (!["admitted", "uncertain"].includes(operation.status)) continue;
    const successor = successorWriterReceipt(previous, operation);
    if (!successor) continue;
    operation.status = "observed-on-branch";
    operation.observedAt = now;
    operation.reason =
      `later admitted writer operation ${successor.id} run ${successor.runId} ` +
      "proves exact prior candidate observation";
  }
  const channels = channelProjection(graph);
  const excluded = new Set(graph.excludedPackages ?? []);
  const nodes = graph.repositories.map((repo) => {
    const evidence = repo.evidence;
    const acceptance = qualification(evidence, repo.sourceSha);
    const ownership = branchOwnership(
      evidence?.prs ?? [],
      options.botLogin,
      options.botAuthor,
    );
    const updates = [],
      holds = [],
      sourceHoldFacts = [];
    const hold = (message, kind, edge = {}) => {
      holds.push(message);
      sourceHoldFacts.push({ message, kind, ...edge });
    };
    if (graph.coverage?.length) holds.push("incomplete public source coverage");
    if (repo.holdReason) holds.push(repo.holdReason);
    for (const message of repo.nonPortable) {
      const details = (repo.nonPortableDetails ?? []).filter(
        (f) => f.message === message,
      );
      hold(
        message,
        "unknown-nonportable",
        details.length === 1 ? details[0] : {},
      );
    }
    if (repo.missingChangesets) holds.push("Changesets onboarding required");
    if (options.phase !== "full" && repo.phase !== "pilot")
      holds.push("outside pilot phase");
    if (!evidence || evidence.incomplete)
      holds.push("unknown branch/workflow coverage");
    if (!options.botLogin || !options.botAuthor)
      holds.push("bot identity not configured");
    const branchHolds = [];
    for (const pr of evidence?.prs ?? []) {
      const owned = branchOwnership([pr], options.botLogin, options.botAuthor);
      if (owned.state !== "bot-owned")
        branchHolds.push({
          branch: pr.head.ref,
          head: pr.head.sha,
          family: branchFamily(graph, pr.head.ref),
          reason: "repair-owned branch; preserve manual work",
        });
    }
    for (const branch of evidence?.orphanBranches ?? [])
      branchHolds.push({
        ...branch,
        family: branchFamily(graph, branch.branch),
        reason:
          "retained branch without merged bot ownership; explicit reconciliation required",
      });
    for (const edge of graph.edges.filter(
      (e) => e.repository === repo.repository && !excluded.has(e.name),
    )) {
      // Internal packages stay with their source publisher; Renovate ignores them.
      if (repo.manifests.some((p) => p.manifest.name === edge.name)) continue;
      const resolved = lockVersion(repo, edge);
      const versions = channels.versions(edge);
      const target = versions.at(-1);
      if (!target) {
        hold(
          `${edge.name}: unavailable registry prerequisite`,
          "unavailable-registry",
          {
            path: edge.path,
            type: edge.type,
            name: edge.name,
            range: edge.range,
          },
        );
        continue;
      }
      if (!resolved.version) {
        holds.push(`${edge.name}: unknown resolved lock version`);
        continue;
      }
      if (
        (!semver.gt(target, resolved.version) &&
          !(
            resolved.version === target &&
            retainedMinimumRequired(previous, repo, edge, target)
          )) ||
        (edge.type === "peerDependencies" &&
          semver.satisfies(target, edge.range))
      )
        continue;
      if (!graph.registry?.[edge.name]?.[target]?.integrity) {
        holds.push(`${edge.name}: unverified registry integrity`);
        continue;
      }
      const type = updateType(resolved.version, target);
      const range = targetRange(edge, target);
      if (range === null) {
        holds.push(
          `${edge.name}: compound range requires source-owned compatibility review`,
        );
        continue;
      }
      const p = repo.manifests.find((p) => p.path === edge.path);
      const after = {
        ...p.manifest,
        [edge.type]: { ...p.manifest[edge.type], [edge.name]: range },
      };
      const intent = releaseIntent(p.manifest, after, {
        workspaceBefore: repo.workspace,
        workspaceAfter: repo.workspace,
      });
      updates.push({
        ...edge,
        current: resolved.version,
        target,
        targetRange: range,
        updateType: type,
        compatibility:
          type === "major" ||
          (semver.major(resolved.version) === 0 && type === "minor")
            ? "breaking"
            : "compatible",
        releaseIntent: intent,
        basis: resolved.basis,
      });
    }
    return {
      repository: repo.repository,
      sourceSha: repo.sourceSha,
      visibility: "public",
      acceptance,
      ownership,
      branchHolds,
      updates,
      holds,
      sourceHoldFacts,
      waits: [],
      status: "unchanged",
    };
  });
  const byRepo = new Map(nodes.map((n) => [n.repository, n]));
  // Keep durable publication baselines across merge, version PR and missed hints.
  for (const node of nodes) {
    const repo = graph.repositories.find(
      (r) => r.repository === node.repository,
    );
    const intents = new Set(
      node.updates.map((u) => u.releaseIntent).filter(Boolean),
    );
    for (const name of intents) {
      const requires = node.updates
        .filter((u) => u.releaseIntent === name)
        .map((u) => ({ name: u.name, type: u.type, target: u.target }));
      const old = state.releases[name];
      const same = old && old.status === "waiting";
      state.releases[name] = {
        name,
        repository: node.repository,
        sourceSha: same ? old.sourceSha : node.sourceSha,
        baseline: same
          ? old.baseline
          : (graph.available[name]?.at(-1) ?? "0.0.0"),
        requires: [
          ...new Map(
            [...(same ? old.requires : []), ...requires].map((r) => [
              `${r.type}:${r.name}`,
              r,
            ]),
          ).values(),
        ],
        status: "waiting",
        policyRevision,
      };
    }
    for (const release of Object.values(state.releases).filter(
      (r) => r.repository === node.repository,
    )) {
      const sourceManifest = repo.manifests.find(
        (p) => p.manifest.name === release.name,
      )?.manifest;
      if (
        release.status === "waiting" &&
        release.sourceSha !== node.sourceSha &&
        release.requires.length &&
        release.requires.every(
          (req) => !Object.hasOwn(sourceManifest?.[req.type] ?? {}, req.name),
        )
      ) {
        release.status = "superseded";
        release.supersededSourceSha = node.sourceSha;
      }
      if (
        release.status === "waiting" &&
        release.sourceSha !== node.sourceSha &&
        release.requires.length &&
        !intents.has(release.name) &&
        node.acceptance.state === "qualified" &&
        obsoleteCompoundIntent(release, graph, repo, channels)
      ) {
        release.status = "superseded";
        release.supersededSourceSha = node.sourceSha;
      }
      if (
        release.status === "waiting" &&
        released(release, graph, repo, channels) &&
        node.acceptance.state === "qualified"
      ) {
        release.status = "published";
        release.qualifiedSourceSha = node.sourceSha;
        release.version = repo.manifests.find(
          (p) => p.manifest.name === release.name,
        ).manifest.version;
      }
    }
  }
  for (const node of nodes) {
    const repo = graph.repositories.find(
      (r) => r.repository === node.repository,
    );
    for (const release of Object.values(state.releases).filter(
      (r) =>
        r.repository === node.repository &&
        r.status === "waiting" &&
        r.requires.length &&
        (!node.updates.some((u) => u.releaseIntent === r.name) ||
          previous.releases[r.name]?.status === "waiting"),
    )) {
      const own = repo.manifests.find(
        (p) => p.manifest.name === release.name,
      )?.manifest;
      const metadata = graph.registry?.[release.name]?.[own?.version];
      const publication = metadata?.publication;
      if (
        publication?.channel.admitted === false &&
        !channels.publication(release.name, own.version)
      )
        node.waits.push({
          package: release.name,
          repository: node.repository,
          reason: `channel-not-admitted: ${own.version}; policy latest=${publication.channel.latest ?? "unknown"}; observed ${publication.channel.tags.join(",") || "untagged"}`,
        });
      if (!verifiedPublication(metadata, repo, own ?? {}))
        node.waits.push({
          package: release.name,
          repository: node.repository,
          reason: `provenance-unknown: ${publication?.reason ?? "unobserved"}`,
        });
    }
  }
  // Propagate affected public chains even when a downstream manifest has no update yet.
  let changed;
  do {
    changed = false;
    for (const edge of graph.edges) {
      const upstream = state.releases[edge.name];
      if (
        !upstream ||
        upstream.status !== "waiting" ||
        upstream.repository === edge.repository ||
        excluded.has(edge.name)
      )
        continue;
      const node = byRepo.get(edge.repository);
      if (
        !node.waits.some((w) => w.package === edge.name && w.path === edge.path)
      )
        node.waits.push({
          package: edge.name,
          path: edge.path,
          repository: upstream.repository,
          reason: "upstream qualification/publication required",
        });
      // Supported peers do not require a republish. A future peer widening
      // creates release intent only after a real registry target is known.
      if (["devDependencies", "peerDependencies"].includes(edge.type)) continue;
      const own = graph.packages.find(
        (p) => p.repository === edge.repository && p.path === edge.path,
      );
      if (own && !state.releases[own.name]) {
        state.releases[own.name] = {
          name: own.name,
          repository: own.repository,
          sourceSha: node.sourceSha,
          baseline: graph.available[own.name]?.at(-1) ?? "0.0.0",
          requires: [],
          status: "waiting",
          policyRevision,
        };
        changed = true;
      }
    }
  } while (changed);
  const cycles = cyclicPackages(graph);
  // Validate even an empty/no-update inventory; invalid operator data is global.
  scopedEligibilityPolicy(options.scopedEligibility);
  for (const node of nodes) {
    const repo = graph.repositories.find(
      (r) => r.repository === node.repository,
    );
    scopeDevelopmentAdmission(repo, node, graph, options);
    const sourceHeld = node.holds.length > 0;
    const blocked = new Map();
    const block = (u, reason) => {
      blocked.set(`${u.path}:${u.type}:${u.name}`, reason);
      const text = `${u.path}:${u.name}: ${reason}`;
      if (!node.holds.includes(text)) node.holds.push(text);
    };
    const independent = canonicalDevelopmentUpdate(repo, node, graph);
    // Scope repair/orphan ownership to the exact rolling or compatibility family.
    for (const u of node.updates) {
      const workspaceUpdate =
        repo.canonicalIntake?.policy?.schemaVersion === 2 &&
        canonicalWorkspaceUpdate(repo, node, graph, u);
      const preparationHold = workspaceUpdate
        ? null
        : canonicalPreparationHold(repo, node, graph, u);
      if (preparationHold) block(u, preparationHold);
      if (
        node.waits.some(
          (w) =>
            w.path === u.path &&
            (!workspaceUpdate || !w.package || w.package === u.name),
        ) &&
        !independent
      )
        blocked.set(
          `${u.path}:${u.type}:${u.name}`,
          "upstream publication wait",
        );
      if (cycles.has(u.consumer) || cycles.has(u.name))
        block(
          u,
          "cyclic release chain requires coordinated manual qualification",
        );
      for (const branch of node.branchHolds)
        if (!branch.family || branch.family === updateFamily(graph, u))
          block(u, `${branch.reason}: ${branch.branch}`);
    }
    const catalogEdges = graph.edges.filter(
      (e) =>
        e.repository === node.repository &&
        repo.manifests
          .find((p) => p.path === e.path)
          ?.manifest[e.type]?.[e.name]?.startsWith("catalog:"),
    );
    // A workspace catalog write can touch every importer of that name. Admit
    // the entire coupled set or hold it, including references without updates.
    for (const name of new Set(catalogEdges.map((e) => e.name))) {
      const refs = catalogEdges.filter((e) => e.name === name);
      const coupledHold = refs.some(
        (e) =>
          e.type === "peerDependencies" ||
          node.waits.some((w) => w.path === e.path) ||
          blocked.has(`${e.path}:${e.type}:${e.name}`) ||
          !node.updates.some(
            (u) => u.path === e.path && u.type === e.type && u.name === e.name,
          ),
      );
      if (coupledHold)
        for (const u of node.updates.filter((u) => u.name === name))
          block(
            u,
            "shared catalog references require joint admission and preserved peer support",
          );
    }
    node.admittedUpdates = node.updates.filter(
      (u) => !blocked.has(`${u.path}:${u.type}:${u.name}`),
    );
    node.status = sourceHeld
      ? "held"
      : node.admittedUpdates.length
        ? node.acceptance.state !== "qualified"
          ? node.acceptance.state === "failed"
            ? "failed"
            : "qualification-wait"
          : "admitted"
        : node.holds.length
          ? "held"
          : node.waits.some((wait) => wait.repository !== node.repository)
            ? "upstream-wait"
            : Object.values(state.releases).some(
                  (r) =>
                    r.repository === node.repository && r.status === "waiting",
                )
              ? "publication-wait"
              : "unchanged";
    node.operationId = identity({
      repository: node.repository,
      sourceSha: node.sourceSha,
      policyRevision,
      ...(node.scopedAdmission
        ? {
            scope: node.scopedAdmission.grantSha256,
            scopePolicy: node.scopedAdmission.policySha256,
          }
        : {}),
      targets: node.admittedUpdates
        .map((u) => [u.path, u.type, u.name, u.target])
        .sort(),
    });
    node.attention = nodeAttention(node);
    const old = state.operations[node.operationId];
    // An invocation without observed PR/source progress has uncertain outcome. Never replay it blindly.
    const unresolved = Object.values(state.operations).find((operation) => {
      if (
        operation.repository !== node.repository ||
        (!["admitted", "uncertain"].includes(operation.status) &&
          (!operation.runId ||
            [
              "accepted-on-main",
              "observed-on-branch",
              "partially-accepted-on-main",
              "retry-approved",
            ].includes(operation.status)))
      )
        return false;
      const repo = graph.repositories.find(
        (r) => r.repository === node.repository,
      );
      return (
        !operation.targets.length ||
        !operation.targets.every((target) =>
          operationTargetSatisfied(previous, graph, repo, operation, target),
        )
      );
    });
    const observedUnresolved =
      node.status === "admitted" &&
      unresolved &&
      observedOperationTargets(repo, unresolved, graph, options, channels);
    if (node.status === "admitted" && unresolved && !observedUnresolved) {
      node.status = "uncertain";
      node.holds.push(
        `previous admission ${unresolved.id} has no observed PR; reconcile operation before retry`,
      );
    } else if (observedUnresolved && unresolved.id !== node.operationId) {
      state.operations[unresolved.id].status = "observed-on-branch";
      state.operations[unresolved.id].observedAt = now;
      state.operations[unresolved.id].reason =
        "exact bot-owned candidate observed on reviewed channel";
    }
    state.operations[node.operationId] = {
      id: node.operationId,
      repository: node.repository,
      sourceSha: node.sourceSha,
      policyRevision,
      targets: node.admittedUpdates.map((u) => ({
        name: u.name,
        target: u.target,
        path: u.path,
        type: u.type,
      })),
      status:
        node.status === "admitted" && !options.writes
          ? "planned"
          : node.status === "uncertain" &&
              !old?.runId &&
              !["admitted", "uncertain"].includes(old?.status)
            ? "held"
            : node.status,
      ...(node.status === "admitted" && options.writes && options.runId
        ? { runId: String(options.runId) }
        : old?.runId
          ? { runId: old.runId }
          : {}),
      ...(old?.recovery ? { recovery: old.recovery } : {}),
      firstObservedAt: old?.firstObservedAt ?? now,
      observedAt: now,
      ownership: node.ownership.state,
      reason: [
        ...node.holds,
        ...node.waits.map((w) => w.reason),
        node.acceptance.reason,
      ].join("; "),
      acceptance: node.acceptance.state,
    };
  }
  for (const operation of Object.values(state.operations)) {
    const repo = graph.repositories.find(
      (r) => r.repository === operation.repository,
    );
    if (
      repo.sourceSha !== operation.sourceSha &&
      operation.targets.length &&
      operation.targets.every((target) =>
        operationTargetSatisfied(previous, graph, repo, operation, target),
      )
    )
      operation.status = "accepted-on-main";
  }
  for (const [name, versions] of Object.entries(graph.registry ?? {}))
    for (const [version, metadata] of Object.entries(versions)) {
      if (
        excluded.has(name) ||
        !metadata.integrity ||
        (!(graph.available[name] ?? []).includes(version) &&
          !metadata.publication)
      )
        continue;
      const key = identity([name, version, metadata.integrity]);
      const verifiedEvidence =
        metadata.publication?.state === "verified"
          ? metadata.publication
          : state.publications[key]?.verifiedEvidence;
      state.publications[key] = {
        name,
        version,
        integrity: metadata.integrity,
        ...(metadata.publication ? { evidence: metadata.publication } : {}),
        ...(verifiedEvidence ? { verifiedEvidence } : {}),
      };
    }
  state.generation++;
  state.policyRevision = policyRevision;
  state.observedAt = now;
  const report = {
    schemaVersion: 1,
    kind: "lapis-dependency-waves",
    observedAt: now,
    policyRevision,
    generation: state.generation,
    coverage: graph.coverage ?? [],
    nodes,
    releases: Object.values(state.releases),
    publications: Object.values(state.publications),
    operations: Object.values(state.operations),
  };
  report.reportId = identity(report);
  return {
    state,
    report,
    admitted: nodes
      .filter((n) => n.status === "admitted")
      .map((n) => n.repository),
  };
}

export function recoverEmptyOperation(
  previous,
  graph,
  {
    operationId,
    expectedRevision,
    revision,
    completedRun,
    expectedSourceSha,
    sourceProof,
    now = new Date().toISOString(),
  },
) {
  if (
    !/^[a-f0-9]{64}$/.test(operationId ?? "") ||
    expectedRevision !== revision ||
    !revision
  )
    throw Error("Recovery requires exact operation and current state revision");
  const operation = previous.operations[operationId];
  if (
    !operation ||
    ![
      "admitted",
      "uncertain",
      "held",
      "failed",
      "qualification-wait",
      "upstream-wait",
    ].includes(operation.status) ||
    !operation.runId ||
    String(completedRun?.id) !== operation.runId ||
    completedRun.status !== "completed" ||
    completedRun.path !== ".github/workflows/reconcile.yml"
  )
    throw Error(
      "Prior originating reconcile run must be complete before recovery",
    );
  const repo = graph.repositories.find(
    (r) => r.repository === operation.repository,
  );
  const sourceUnchanged = repo?.sourceSha === operation.sourceSha;
  const sourceTransition =
    !sourceUnchanged &&
    expectedSourceSha === repo?.sourceSha &&
    sourceProof?.schemaVersion === 1 &&
    sourceProof.repository === operation.repository &&
    sourceProof.sourceSha === operation.sourceSha &&
    sourceProof.currentSourceSha === repo?.sourceSha &&
    /^[a-f0-9]{64}$/.test(sourceProof.projectionSha256 ?? "");
  if (
    !repo ||
    repo.visibility !== "public" ||
    (!sourceUnchanged && !sourceTransition) ||
    repo.evidence?.incomplete ||
    !repo.evidence?.dependencyBranches ||
    repo.evidence.dependencyBranches.length ||
    repo.evidence.prs.length ||
    repo.evidence.orphanBranches.length
  )
    throw Error(
      "Recovery requires unchanged public source and proven empty branch/PR state",
    );
  const state = structuredClone(previous);
  state.operations[operationId].status = "retry-approved";
  state.operations[operationId].recovery = {
    action: "retry-empty",
    expectedRevision,
    observedAt: now,
    previousRunId: operation.runId,
    ...(sourceTransition ? { sourceTransition: sourceProof } : {}),
  };
  return state;
}

export function reconcilePartiallyAcceptedOperation(
  previous,
  graph,
  {
    operationId,
    expectedRevision,
    revision,
    completedRun,
    now = new Date().toISOString(),
  },
) {
  if (
    !/^[a-f0-9]{64}$/.test(operationId ?? "") ||
    expectedRevision !== revision ||
    !revision
  )
    throw Error(
      "Operation reconciliation requires exact operation and current state revision",
    );
  const operation = previous.operations[operationId];
  if (
    !operation ||
    !["admitted", "uncertain"].includes(operation.status) ||
    !operation.runId ||
    String(completedRun?.id) !== operation.runId ||
    completedRun.status !== "completed" ||
    completedRun.path !== ".github/workflows/reconcile.yml"
  )
    throw Error(
      "Prior originating reconcile run must be complete before operation reconciliation",
    );
  const repo = graph.repositories.find(
    (entry) => entry.repository === operation.repository,
  );
  if (
    !repo ||
    repo.visibility !== "public" ||
    repo.sourceSha === operation.sourceSha ||
    qualification(repo.evidence, repo.sourceSha).state !== "qualified" ||
    repo.evidence?.incomplete ||
    !Array.isArray(repo.evidence?.dependencyBranches) ||
    repo.evidence.dependencyBranches.length ||
    repo.evidence.prs.length ||
    repo.evidence.orphanBranches.length
  )
    throw Error(
      "Operation reconciliation requires qualified advanced public source and proven empty branch/PR state",
    );
  const absorbedTargets = operation.targets.filter((target) =>
      operationTargetSatisfied(previous, graph, repo, operation, target),
    ),
    remainingTargets = operation.targets.filter(
      (target) => !absorbedTargets.includes(target),
    );
  if (!absorbedTargets.length || !remainingTargets.length)
    throw Error(
      "Operation reconciliation requires a strict partially accepted target partition",
    );
  const state = structuredClone(previous);
  state.operations[operationId].status = "partially-accepted-on-main";
  state.operations[operationId].reconciliation = {
    action: "partition-observed-main",
    expectedRevision,
    currentSourceSha: repo.sourceSha,
    previousRunId: operation.runId,
    absorbedTargets,
    remainingTargets,
    observedAt: now,
  };
  return state;
}
