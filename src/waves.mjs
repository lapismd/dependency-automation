import { createHash } from "node:crypto";
import semver from "semver";
import { runtimeCycles } from "./policy.mjs";
import {
  verifiedPublication,
  validatePublicationEvidence,
} from "./publications.mjs";
import { releaseIntent } from "./changesets.mjs";
import { canonicalDevelopmentUpdate } from "./canonical-admission.mjs";
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
        "retry-approved",
      ].includes(operation.status) ||
      (operation.runId !== undefined && !/^\d+$/.test(operation.runId))
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

function released(intent, graph, repo) {
  if (!intent.requires.length) return false;
  const own = repo.manifests.find(
    (p) => p.manifest.name === intent.name,
  )?.manifest;
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
    metadata.publication.channel.admitted !== true ||
    !(graph.available[intent.name] ?? []).includes(own.version)
  )
    return false;
  return intent.requires.every((req) => {
    const range = metadata[req.type]?.[req.name];
    return (
      semver.validRange(range) &&
      semver.satisfies(req.target, range) &&
      (req.type === "peerDependencies" ||
        semver.gte(semver.minVersion(range), req.target))
    );
  });
}

// Earlier planners could invent publication intent for a lock-only compound
// update. Retire only that disproved wait, never claim a new publication.
function obsoleteCompoundIntent(intent, graph, repo) {
  const entry = repo.manifests.find((p) => p.manifest.name === intent.name);
  const own = entry?.manifest;
  const metadata = graph.registry?.[intent.name]?.[own?.version];
  if (
    !entry ||
    !semver.valid(own.version) ||
    !metadata?.integrity ||
    !verifiedPublication(metadata, repo, own) ||
    metadata.publication.channel.admitted !== true ||
    !(graph.available[intent.name] ?? []).includes(own.version)
  )
    return false;
  return intent.requires.every((req) => {
    const range = own[req.type]?.[req.name];
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
    return resolved && semver.gte(resolved, req.target);
  });
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
      holds = [];
    if (graph.coverage?.length) holds.push("incomplete public source coverage");
    if (repo.holdReason) holds.push(repo.holdReason);
    holds.push(...repo.nonPortable);
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
      const versions = graph.available[edge.name] ?? [];
      const target = versions.at(-1);
      if (!target) {
        holds.push(`${edge.name}: unavailable registry prerequisite`);
        continue;
      }
      if (!resolved.version) {
        holds.push(`${edge.name}: unknown resolved lock version`);
        continue;
      }
      if (
        !semver.gt(target, resolved.version) ||
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
        obsoleteCompoundIntent(release, graph, repo)
      ) {
        release.status = "superseded";
        release.supersededSourceSha = node.sourceSha;
      }
      if (
        release.status === "waiting" &&
        released(release, graph, repo) &&
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
        !node.updates.some((u) => u.releaseIntent === r.name),
    )) {
      const own = repo.manifests.find(
        (p) => p.manifest.name === release.name,
      )?.manifest;
      const metadata = graph.registry?.[release.name]?.[own?.version];
      const publication = metadata?.publication;
      if (publication?.channel.admitted === false)
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
  for (const node of nodes) {
    const sourceHeld = node.holds.length > 0;
    const blocked = new Map();
    const block = (u, reason) => {
      blocked.set(`${u.path}:${u.type}:${u.name}`, reason);
      const text = `${u.path}:${u.name}: ${reason}`;
      if (!node.holds.includes(text)) node.holds.push(text);
    };
    const repo = graph.repositories.find(
      (r) => r.repository === node.repository,
    );
    const independent = canonicalDevelopmentUpdate(repo, node, graph);
    // Scope repair/orphan ownership to the exact rolling or compatibility family.
    for (const u of node.updates) {
      if (node.waits.some((w) => w.path === u.path) && !independent)
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
      targets: node.admittedUpdates
        .map((u) => [u.path, u.type, u.name, u.target])
        .sort(),
    });
    const old = state.operations[node.operationId];
    // An invocation without observed PR/source progress has uncertain outcome. Never replay it blindly.
    const unresolved = Object.values(previous.operations).find((operation) => {
      if (
        operation.repository !== node.repository ||
        (!["admitted", "uncertain"].includes(operation.status) &&
          (!operation.runId ||
            ["accepted-on-main", "retry-approved"].includes(operation.status)))
      )
        return false;
      const repo = graph.repositories.find(
        (r) => r.repository === node.repository,
      );
      return (
        !operation.targets.length ||
        !operation.targets.every((t) => {
          const edge = graph.edges.find(
            (e) =>
              e.repository === node.repository &&
              e.path === t.path &&
              e.type === t.type &&
              e.name === t.name,
          );
          const manifest = repo.manifests.find(
            (p) => p.path === t.path,
          )?.manifest;
          if (
            !edge &&
            repo.sourceSha !== operation.sourceSha &&
            !Object.hasOwn(manifest?.[t.type] ?? {}, t.name)
          )
            return true;
          if (edge?.type === "peerDependencies")
            return semver.satisfies(t.target, edge.range);
          const current = edge && lockVersion(repo, edge).version;
          return current && semver.gte(current, t.target);
        })
      );
    });
    if (
      node.status === "admitted" &&
      unresolved &&
      !graph.repositories.find((r) => r.repository === node.repository).evidence
        ?.prs?.length
    ) {
      node.status = "uncertain";
      node.holds.push(
        `previous admission ${unresolved.id} has no observed PR; reconcile operation before retry`,
      );
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
      operation.targets.every((t) => {
        const edge = graph.edges.find(
          (e) =>
            e.repository === operation.repository &&
            e.path === t.path &&
            e.name === t.name &&
            e.type === t.type,
        );
        const manifest = repo.manifests.find(
          (p) => p.path === t.path,
        )?.manifest;
        if (!edge && !Object.hasOwn(manifest?.[t.type] ?? {}, t.name))
          return true;
        if (edge?.type === "peerDependencies")
          return semver.satisfies(t.target, edge.range);
        const current = edge && lockVersion(repo, edge).version;
        return current && semver.gte(current, t.target);
      })
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
  if (
    !repo ||
    repo.sourceSha !== operation.sourceSha ||
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
  };
  return state;
}
