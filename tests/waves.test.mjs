import test from "node:test";
import assert from "node:assert/strict";
import { planWaves, emptyState, validateState } from "../src/waves.mjs";
import {
  qualification,
  branchOwnership,
  lockVersion,
} from "../src/wave-evidence.mjs";
import { observedPublication } from "./publication-fixtures.mjs";
import { repositoryConfig } from "../src/renovate.mjs";
const sha = "a".repeat(40),
  policyRevision = "b".repeat(40);
const options = {
  policyRevision,
  botLogin: "dependency[bot]",
  botAuthor: "Bot <bot@example.com>",
  phase: "full",
  writes: true,
  now: "2026-11-15T21:00:00Z",
};
const evidence = () => ({
  sha,
  expected: [1],
  runs: [
    {
      head_sha: sha,
      workflow_id: 1,
      run_number: 1,
      run_attempt: 1,
      event: "push",
      status: "completed",
      conclusion: "success",
    },
  ],
  checks: [],
  statuses: [],
  prs: [],
  orphanBranches: [],
});
function fixture() {
  const repositories = ["foundation", "publisher", "app"].map((name) => ({
    repository: `lapismd/${name}`,
    visibility: "public",
    sourceSha: sha,
    phase: "pilot",
    workspace: {},
    paths: ["package.json"],
    nonPortable: [],
    manifests: [
      {
        path: "package.json",
        manifest: {
          name: `@lapismd/${name}`,
          version: "1.0.0",
          ...(name === "app" ? { private: true } : {}),
          dependencies:
            name === "foundation"
              ? {}
              : {
                  [`@lapismd/${name === "publisher" ? "foundation" : "publisher"}`]:
                    "^1.0.0",
                },
        },
      },
    ],
    lock: {
      importers: {
        ".": {
          dependencies: {
            [`@lapismd/${name === "publisher" ? "foundation" : "publisher"}`]: {
              version: "1.0.0",
            },
          },
        },
      },
    },
    evidence: evidence(),
  }));
  const packages = repositories
    .filter((r) => !r.manifests[0].manifest.private)
    .map((r) => ({
      ...r.manifests[0],
      name: r.manifests[0].manifest.name,
      repository: r.repository,
    }));
  const edges = repositories.flatMap((r) =>
    Object.entries(r.manifests[0].manifest.dependencies).map(
      ([name, range]) => ({
        name,
        range,
        type: "dependencies",
        repository: r.repository,
        path: "package.json",
        consumer: r.manifests[0].manifest.name,
      }),
    ),
  );
  const graph = {
    repositories,
    packages,
    edges,
    available: {
      "@lapismd/foundation": ["1.0.0", "1.0.1"],
      "@lapismd/publisher": ["1.0.0"],
    },
    unpublished: [],
    cycles: [],
    registry: {
      "@lapismd/foundation": {
        "1.0.0": { integrity: "x" },
        "1.0.1": { integrity: "y" },
      },
      "@lapismd/publisher": { "1.0.0": { integrity: "z" } },
    },
  };
  return graph;
}
const node = (plan, name) =>
  plan.report.nodes.find((n) => n.repository === `lapismd/${name}`);

test("pilot writes select one ready consumer and another activates only after its own entry changes", () => {
  const graph = fixture(),
    app = graph.repositories[2];
  app.manifests[0].manifest.dependencies = { "@lapismd/foundation": "^1.0.0" };
  app.lock.importers["."].dependencies = {
    "@lapismd/foundation": { version: "1.0.0" },
  };
  graph.edges.find((edge) => edge.repository === app.repository).name =
    "@lapismd/foundation";
  graph.repositories[0].phase = "full";
  app.phase = "full";
  assert.deepEqual(
    planWaves(graph, emptyState(), { ...options, phase: "full" }).admitted,
    ["lapismd/publisher", "lapismd/app"],
  );
  const pilot = planWaves(graph, emptyState(), { ...options, phase: "pilot" });
  assert.deepEqual(pilot.admitted, ["lapismd/publisher"]);
  assert.ok(node(pilot, "app").holds.includes("outside pilot phase"));
  app.phase = "pilot";
  assert.deepEqual(
    planWaves(graph, emptyState(), { ...options, phase: "pilot" }).admitted,
    ["lapismd/publisher", "lapismd/app"],
  );
});

test("foundation update admits publisher and waits downstream until registry publication and complete qualification", () => {
  const graph = fixture();
  const first = planWaves(graph, emptyState(), options);
  assert.deepEqual(first.admitted, ["lapismd/publisher"]);
  assert.equal(node(first, "app").status, "upstream-wait");
  assert.equal(first.state.releases["@lapismd/publisher"].baseline, "1.0.0");
  const publisher = graph.repositories[1];
  publisher.sourceSha = "c".repeat(40);
  publisher.evidence = {
    ...evidence(),
    sha: publisher.sourceSha,
    runs: [{ ...evidence().runs[0], head_sha: publisher.sourceSha }],
  };
  publisher.manifests[0].manifest.version = "1.0.1";
  publisher.manifests[0].manifest.dependencies["@lapismd/foundation"] =
    "^1.0.1";
  graph.edges[0].range = "^1.0.1";
  publisher.lock.importers["."].dependencies["@lapismd/foundation"].version =
    "1.0.1";
  assert.equal(
    node(planWaves(graph, first.state, options), "app").status,
    "upstream-wait",
  );
  graph.available["@lapismd/publisher"].push("1.0.1");
  graph.registry["@lapismd/publisher"]["1.0.1"] = {
    integrity: "new",
    gitHead: publisher.sourceSha,
    dependencies: { "@lapismd/foundation": "^1.0.1" },
  };
  observedPublication(publisher, graph.registry["@lapismd/publisher"]["1.0.1"]);
  publisher.evidence.runs[0].status = "in_progress";
  assert.equal(
    node(planWaves(graph, first.state, options), "app").status,
    "upstream-wait",
  );
  publisher.evidence.runs[0].status = "completed";
  const done = planWaves(graph, first.state, options);
  assert.deepEqual(done.admitted, ["lapismd/app"]);
  assert.equal(done.state.releases["@lapismd/publisher"].status, "published");
  assert(
    Object.values(done.state.operations).some(
      (o) => o.status === "accepted-on-main",
    ),
  );
});

test("duplicate, old and missing hints coalesce to registry identities and stable operations", () => {
  const graph = fixture();
  const first = planWaves(graph, emptyState(), options);
  const duplicate = planWaves(graph, first.state, options);
  assert.equal(
    Object.keys(first.state.publications).length,
    Object.keys(duplicate.state.publications).length,
  );
  assert.equal(
    Object.keys(first.state.operations).length,
    Object.keys(duplicate.state.operations).length,
  );
  assert.equal(
    node(duplicate, "publisher").operationId,
    node(first, "publisher").operationId,
  );
  assert.equal(node(duplicate, "publisher").status, "uncertain");
  assert.equal(
    node(planWaves(graph, duplicate.state, options), "publisher").status,
    "uncertain",
  );
  // No notification is needed: adding registry availability discovers a new target.
  graph.available["@lapismd/foundation"].push("1.0.2");
  graph.registry["@lapismd/foundation"]["1.0.2"] = { integrity: "latest" };
  assert.equal(
    node(planWaves(graph, first.state, options), "publisher").updates[0].target,
    "1.0.2",
  );
});

test("dry-run state does not consume writable admission", () => {
  const graph = fixture();
  const first = planWaves(graph, emptyState(), { ...options, writes: false });
  assert.equal(
    first.state.operations[node(first, "publisher").operationId].status,
    "planned",
  );
  assert.equal(
    node(planWaves(graph, first.state, options), "publisher").status,
    "admitted",
  );
});

test("held, unpublished, excluded and unknown-lock prerequisites remain explicit", () => {
  for (const change of [
    (g) => {
      g.repositories[1].holdReason = "explicit pilot hold";
    },
    (g) => {
      g.available["@lapismd/foundation"] = [];
    },
    (g) => {
      g.repositories[1].lock = null;
    },
    (g) => {
      g.coverage = [{ opaqueId: "opaque", reason: "source unavailable" }];
    },
  ]) {
    const graph = fixture();
    change(graph);
    const result = planWaves(graph, emptyState(), options);
    assert.equal(node(result, "publisher").status, "held");
    assert(node(result, "publisher").holds.length);
  }
  const graph = fixture();
  graph.excludedPackages = ["@lapismd/foundation"];
  assert.equal(
    node(planWaves(graph, emptyState(), options), "publisher").updates.length,
    0,
  );
});

test("dev-only tooling does not invent publication waits", () => {
  const graph = fixture();
  const repo = graph.repositories[1];
  repo.manifests[0].manifest.devDependencies =
    repo.manifests[0].manifest.dependencies;
  delete repo.manifests[0].manifest.dependencies;
  repo.lock.importers["."].devDependencies =
    repo.lock.importers["."].dependencies;
  graph.edges[0].type = "devDependencies";
  const result = planWaves(graph, emptyState(), options);
  assert.equal(node(result, "publisher").status, "admitted");
  assert.equal(node(result, "publisher").updates[0].releaseIntent, null);
  assert.equal(node(result, "app").status, "unchanged");
  assert.deepEqual(result.state.releases, {});
});

test("multiple publishers all block downstream while independent consumers progress", () => {
  const graph = fixture();
  const other = structuredClone(graph.repositories[1]);
  other.repository = "lapismd/other";
  other.manifests[0].manifest.name = "@lapismd/other";
  graph.repositories.push(other);
  graph.packages.push({
    ...other.manifests[0],
    name: "@lapismd/other",
    repository: other.repository,
  });
  graph.available["@lapismd/other"] = ["1.0.0"];
  graph.edges.push(
    {
      ...graph.edges[0],
      repository: other.repository,
      consumer: "@lapismd/other",
    },
    { ...graph.edges[1], name: "@lapismd/other" },
  );
  graph.repositories[2].manifests[0].manifest.dependencies["@lapismd/other"] =
    "^1.0.0";
  graph.repositories[2].lock.importers["."].dependencies["@lapismd/other"] = {
    version: "1.0.0",
  };
  graph.repositories[1].evidence.runs[0].conclusion = "failure";
  const result = planWaves(graph, emptyState(), options);
  assert.equal(node(result, "publisher").status, "failed");
  assert.equal(node(result, "other").status, "admitted");
  assert.equal(node(result, "app").waits.length, 2);
});

test("peer/runtime repository cycles are safe explicit holds", () => {
  const graph = fixture();
  graph.edges.push({
    name: "@lapismd/publisher",
    range: "^1.0.0",
    type: "peerDependencies",
    repository: "lapismd/foundation",
    path: "package.json",
  });
  graph.repositories[0].manifests[0].manifest.peerDependencies = {
    "@lapismd/publisher": "^1.0.0",
  };
  const result = planWaves(graph, emptyState(), options);
  assert.equal(node(result, "publisher").status, "held");
  assert(node(result, "publisher").holds.some((r) => r.includes("cyclic")));
});

test("breaking families remain drafts and compatible versions are restricted by real admission", () => {
  const graph = fixture();
  graph.available["@lapismd/foundation"].push("2.0.0");
  graph.registry["@lapismd/foundation"]["2.0.0"] = { integrity: "major" };
  const plan = planWaves(graph, emptyState(), options);
  assert.equal(node(plan, "publisher").updates[0].compatibility, "breaking");
  graph.waveAdmission = plan.report;
  const config = repositoryConfig(graph.repositories[1], graph, process.cwd());
  assert(
    config.packageRules.some(
      (r) => r.matchUpdateTypes?.includes("major") && r.draftPR && !r.automerge,
    ),
  );
  assert.equal(config.packageRules.at(-1).allowedVersions, "/^(?:2\\.0\\.0)$/");
  assert.throws(
    () => repositoryConfig(graph.repositories[2], graph, process.cwd()),
    /not admitted/,
  );
});

test("current complete CI prevents stale, early-green and incomplete acceptance", () => {
  assert.equal(qualification(evidence(), sha).state, "qualified");
  const unrelated = evidence();
  unrelated.runs.push({
    ...unrelated.runs[0],
    workflow_id: 2,
    event: "workflow_dispatch",
    conclusion: "failure",
  });
  unrelated.checks.push({
    name: "manual publisher",
    app: "github-actions",
    status: "completed",
    conclusion: "failure",
  });
  assert.equal(qualification(unrelated, sha).state, "qualified");
  unrelated.checks.push({
    name: "external gate",
    app: "external-ci",
    status: "completed",
    conclusion: "failure",
  });
  assert.equal(qualification(unrelated, sha).state, "failed");
  const concurrent = evidence();
  concurrent.runs.unshift({
    ...concurrent.runs[0],
    run_number: 0,
    status: "in_progress",
    conclusion: null,
  });
  assert.equal(qualification(concurrent, sha).state, "waiting");
  assert.equal(qualification(evidence(), "c".repeat(40)).state, "unknown");
  const e = evidence();
  e.expected.push(2);
  assert.equal(qualification(e, sha).state, "unknown");
  e.runs.push({
    ...e.runs[0],
    workflow_id: 2,
    status: "in_progress",
    conclusion: null,
  });
  assert.equal(qualification(e, sha).state, "waiting");
  e.runs[1].status = "completed";
  e.runs[1].conclusion = "failure";
  assert.equal(qualification(e, sha).state, "failed");
  e.runs[1].conclusion = "success";
  e.statuses.push({ context: "external", state: "pending" });
  assert.equal(qualification(e, sha).state, "waiting");
});

test("repair commits are detected by commit author, never rerun actor", () => {
  const pr = {
    number: 4,
    user: { login: options.botLogin },
    head: { sha },
    commits: [
      {
        author: { login: options.botLogin },
        commit: { author: { name: "Bot", email: "bot@example.com" } },
      },
    ],
  };
  assert.equal(
    branchOwnership([pr], options.botLogin, options.botAuthor).state,
    "bot-owned",
  );
  pr.commits.push({
    author: { login: "human" },
    commit: { author: { name: "Human", email: "human@example.com" } },
    actor: options.botLogin,
  });
  assert.equal(
    branchOwnership([pr], options.botLogin, options.botAuthor).state,
    "repair-owned",
  );
  const graph = fixture();
  graph.repositories[1].evidence.prs = [pr];
  assert.equal(
    node(planWaves(graph, emptyState(), options), "publisher").status,
    "held",
  );
});

test("unknown/orphan branches stop regeneration and public storage rejects non-public graph", () => {
  const graph = fixture();
  graph.repositories[1].evidence.orphanBranches = [
    { branch: "lapis-dependencies/old", head: sha },
  ];
  assert.equal(
    node(planWaves(graph, emptyState(), options), "publisher").status,
    "held",
  );
  graph.repositories[1].visibility = "private";
  assert.throws(() => planWaves(graph, emptyState(), options), /Non-public/);
});

test("large pnpm importer format uses exact lock version, peer range is distinct evidence", () => {
  const graph = fixture();
  const repo = graph.repositories[1];
  repo.lock.importers["."].dependencies["@lapismd/foundation"].version =
    "1.0.1(peer@2.0.0)";
  assert.deepEqual(lockVersion(repo, graph.edges[0]), {
    version: "1.0.1",
    basis: "lock",
  });
  assert.equal(
    lockVersion(repo, { ...graph.edges[0], type: "peerDependencies" }).basis,
    "peer-support",
  );
});

test("manual recovery re-admits only exact completed empty attempts, preserving repair ownership", async () => {
  const { recoverEmptyOperation } = await import("../src/waves.mjs");
  const graph = fixture();
  graph.repositories[1].evidence.dependencyBranches = [];
  const first = planWaves(graph, emptyState(), { ...options, runId: "123" });
  const id = node(first, "publisher").operationId,
    revision = "d".repeat(40);
  const recovery = {
    operationId: id,
    expectedRevision: revision,
    revision,
    completedRun: {
      id: 123,
      status: "completed",
      path: ".github/workflows/reconcile.yml",
    },
  };
  const recovered = recoverEmptyOperation(first.state, graph, recovery);
  assert.equal(
    node(planWaves(graph, recovered, options), "publisher").status,
    "admitted",
  );
  assert.throws(
    () =>
      recoverEmptyOperation(first.state, graph, {
        ...recovery,
        expectedRevision: "old",
      }),
    /exact operation/,
  );
  assert.throws(
    () =>
      recoverEmptyOperation(first.state, graph, {
        ...recovery,
        completedRun: { ...recovery.completedRun, status: "in_progress" },
      }),
    /must be complete/,
  );
  graph.repositories[1].evidence.dependencyBranches.push({
    branch: "lapis-dependencies/repair",
    head: sha,
  });
  assert.throws(
    () => recoverEmptyOperation(first.state, graph, recovery),
    /empty branch/,
  );
});

test("manual operation reconciliation records a strict main-absorbed target subset before fresh planning", async () => {
  const { reconcilePartiallyAcceptedOperation } =
    await import("../src/waves.mjs");
  const graph = fixture(),
    repo = graph.repositories[1],
    edge = graph.edges.find((entry) => entry.repository === repo.repository);
  repo.manifests[0].manifest.optionalDependencies = {
    "@lapismd/foundation": "^1.0.0",
  };
  repo.lock.importers["."].optionalDependencies = {
    "@lapismd/foundation": { version: "1.0.0" },
  };
  const optionalEdge = { ...edge, type: "optionalDependencies" };
  graph.edges.push(optionalEdge);
  repo.evidence.dependencyBranches = [];
  const first = planWaves(graph, emptyState(), {
      ...options,
      runId: "123",
    }),
    operation = first.state.operations[node(first, "publisher").operationId],
    revision = "d".repeat(40);
  assert.equal(operation.targets.length, 2);
  repo.sourceSha = "c".repeat(40);
  repo.evidence = {
    ...repo.evidence,
    sha: repo.sourceSha,
    runs: [{ ...repo.evidence.runs[0], head_sha: repo.sourceSha }],
    dependencyBranches: [],
  };
  repo.manifests[0].manifest.dependencies["@lapismd/foundation"] = "^1.0.1";
  edge.range = "^1.0.1";
  repo.lock.importers["."].dependencies["@lapismd/foundation"].version =
    "1.0.1";
  const request = {
    operationId: operation.id,
    expectedRevision: revision,
    revision,
    completedRun: {
      id: 123,
      status: "completed",
      path: ".github/workflows/reconcile.yml",
    },
    now: "2026-11-19T23:30:00Z",
  };
  const reconciled = reconcilePartiallyAcceptedOperation(
      first.state,
      graph,
      request,
    ),
    receipt = reconciled.operations[operation.id].reconciliation;
  assert.equal(
    reconciled.operations[operation.id].status,
    "partially-accepted-on-main",
  );
  assert.equal(validateState(reconciled), reconciled);
  assert.deepEqual(
    receipt.absorbedTargets.map((target) => target.type),
    ["dependencies"],
  );
  assert.deepEqual(
    receipt.remainingTargets.map((target) => target.type),
    ["optionalDependencies"],
  );
  const replanned = planWaves(graph, reconciled, options);
  assert.equal(node(replanned, "publisher").status, "admitted");
  assert.deepEqual(
    node(replanned, "publisher").admittedUpdates.map((update) => update.type),
    ["optionalDependencies"],
  );
  for (const mutate of [
    (value) => ({ ...value, expectedRevision: "old" }),
    (value) => ({
      ...value,
      completedRun: { ...value.completedRun, status: "in_progress" },
    }),
  ])
    assert.throws(
      () =>
        reconcilePartiallyAcceptedOperation(
          first.state,
          graph,
          mutate(request),
        ),
      /Operation reconciliation|originating reconcile run/,
    );
  for (const key of ["dependencyBranches", "prs", "orphanBranches"]) {
    repo.evidence[key].push({ branch: "lapis-dependencies/repair" });
    assert.throws(
      () => reconcilePartiallyAcceptedOperation(first.state, graph, request),
      /empty branch\/PR state/,
    );
    repo.evidence[key] = [];
  }
  repo.evidence.runs[0].conclusion = "failure";
  assert.throws(
    () => reconcilePartiallyAcceptedOperation(first.state, graph, request),
    /qualified advanced public source/,
  );
  repo.evidence.runs[0].conclusion = "success";
  repo.lock.importers["."].optionalDependencies["@lapismd/foundation"].version =
    "1.0.1";
  repo.manifests[0].manifest.optionalDependencies["@lapismd/foundation"] =
    "^1.0.1";
  optionalEdge.range = "^1.0.1";
  assert.throws(
    () => reconcilePartiallyAcceptedOperation(first.state, graph, request),
    /strict partially accepted target partition/,
  );
  repo.manifests[0].manifest.dependencies["@lapismd/foundation"] = "^1.0.0";
  repo.manifests[0].manifest.optionalDependencies["@lapismd/foundation"] =
    "^1.0.0";
  edge.range = "^1.0.0";
  optionalEdge.range = "^1.0.0";
  repo.lock.importers["."].dependencies["@lapismd/foundation"].version =
    "1.0.0";
  repo.lock.importers["."].optionalDependencies["@lapismd/foundation"].version =
    "1.0.0";
  assert.throws(
    () => reconcilePartiallyAcceptedOperation(first.state, graph, request),
    /strict partially accepted target partition/,
  );
});

test("source-advanced empty recovery requires exact proof and preserves all write gates", async () => {
  const { recoverEmptyOperation } = await import("../src/waves.mjs");
  const graph = fixture();
  const repo = graph.repositories[1];
  repo.evidence.dependencyBranches = [];
  const first = planWaves(graph, emptyState(), { ...options, runId: "123" });
  const id = node(first, "publisher").operationId,
    sourceSha = repo.sourceSha;
  repo.sourceSha = "e".repeat(40);
  const recovery = {
    operationId: id,
    expectedRevision: sha,
    revision: sha,
    completedRun: {
      id: 123,
      status: "completed",
      path: ".github/workflows/reconcile.yml",
    },
    expectedSourceSha: repo.sourceSha,
    sourceProof: {
      schemaVersion: 1,
      repository: repo.repository,
      sourceSha,
      currentSourceSha: repo.sourceSha,
      projectionSha256: "f".repeat(64),
    },
  };
  for (const patch of [
    { sourceProof: undefined },
    { expectedSourceSha: sourceSha },
    { sourceProof: { ...recovery.sourceProof, sourceSha: repo.sourceSha } },
    { sourceProof: { ...recovery.sourceProof, repository: "lapismd/other" } },
    { sourceProof: { ...recovery.sourceProof, projectionSha256: "invalid" } },
  ])
    assert.throws(
      () =>
        recoverEmptyOperation(first.state, graph, { ...recovery, ...patch }),
      /unchanged public source/,
    );
  const recovered = recoverEmptyOperation(first.state, graph, recovery);
  assert.deepEqual(
    recovered.operations[id].recovery.sourceTransition,
    recovery.sourceProof,
  );
  assert.equal(first.state.operations[id].status, "admitted");
  assert.equal(recovered.operations[id].status, "retry-approved");
  assert.equal(
    node(
      planWaves(graph, recovered, { ...options, writes: false }),
      "publisher",
    ).status,
    "qualification-wait",
  );
  repo.evidence.sha = repo.sourceSha;
  repo.evidence.runs[0].head_sha = repo.sourceSha;
  const replanned = planWaves(graph, recovered, { ...options, writes: false });
  assert.equal(node(replanned, "publisher").status, "admitted");
  assert.equal(
    replanned.state.operations[node(replanned, "publisher").operationId].status,
    "planned",
  );
  repo.evidence.dependencyBranches.push({
    branch: "lapis-dependencies/repair",
    head: sha,
  });
  assert.throws(
    () => recoverEmptyOperation(first.state, graph, recovery),
    /empty branch/,
  );
});

test("package DAG admits an API while another package in its repository waits, without inventing a repository cycle", () => {
  const graph = fixture();
  const apiRepo = graph.repositories[0];
  const app = structuredClone(graph.repositories[2].manifests[0]);
  app.path = "packages/application/package.json";
  app.manifest.private = false;
  apiRepo.manifests.push(app);
  apiRepo.paths.push(app.path);
  graph.packages.push({
    ...app,
    repository: apiRepo.repository,
    name: app.manifest.name,
  });
  graph.edges[1].repository = apiRepo.repository;
  graph.edges[1].path = app.path;
  graph.repositories.pop();
  apiRepo.lock.importers["packages/application"] = {
    dependencies: { "@lapismd/publisher": { version: "1.0.0" } },
  };
  // seed -> API -> publisher -> application; API+application share one repo.
  apiRepo.manifests[0].manifest.dependencies = { "@lapismd/seed": "^1.0.0" };
  apiRepo.lock.importers["."].dependencies["@lapismd/seed"] = {
    version: "1.0.0",
  };
  graph.edges.push({
    name: "@lapismd/seed",
    range: "^1.0.0",
    type: "dependencies",
    repository: apiRepo.repository,
    path: "package.json",
    consumer: "@lapismd/foundation",
  });
  graph.available["@lapismd/seed"] = ["1.0.0", "1.0.1"];
  graph.registry["@lapismd/seed"] = { "1.0.1": { integrity: "seed" } };
  const result = planWaves(graph, emptyState(), options);
  assert.equal(node(result, "foundation").status, "admitted");
  assert.equal(node(result, "foundation").admittedUpdates.length, 1);
  assert.equal(node(result, "publisher").status, "upstream-wait");
  assert(node(result, "foundation").waits.some((w) => w.path === app.path));
  assert(!node(result, "foundation").holds.some((h) => h.includes("cyclic")));
  graph.waveAdmission = result.report;
  const config = repositoryConfig(apiRepo, graph, process.cwd());
  assert(
    config.packageRules.some(
      (r) => r.matchFileNames?.includes(app.path) && r.enabled === false,
    ),
  );
});

test("already supported peer contracts do not invent downstream publication requirements", () => {
  const graph = fixture();
  const publisher = graph.repositories[1];
  publisher.manifests[0].manifest.peerDependencies =
    publisher.manifests[0].manifest.dependencies;
  delete publisher.manifests[0].manifest.dependencies;
  graph.edges[0].type = "peerDependencies";
  const state = emptyState();
  state.releases["@lapismd/foundation"] = {
    name: "@lapismd/foundation",
    repository: "lapismd/foundation",
    sourceSha: sha,
    baseline: "1.0.1",
    requires: [
      { name: "@lapismd/seed", type: "dependencies", target: "1.0.1" },
    ],
    status: "waiting",
    policyRevision,
  };
  const result = planWaves(graph, state, options);
  assert.equal(node(result, "publisher").status, "upstream-wait");
  assert(!result.state.releases["@lapismd/publisher"]);
  assert.equal(node(result, "app").status, "unchanged");
});

test("abandoned breaking family preserves its branch while unrelated compatible updates proceed", () => {
  const graph = fixture();
  graph.repositories[1].evidence.orphanBranches = [
    { branch: "lapis-dependencies/lapis-foundation-compatibility", head: sha },
  ];
  let result = planWaves(graph, emptyState(), options);
  assert.equal(node(result, "publisher").status, "admitted");
  assert.equal(
    node(result, "publisher").branchHolds[0].family,
    "lapis-foundation-compatibility",
  );
  graph.available["@lapismd/foundation"].push("2.0.0");
  graph.registry["@lapismd/foundation"]["2.0.0"] = { integrity: "major" };
  result = planWaves(graph, emptyState(), options);
  assert.equal(node(result, "publisher").status, "held");
  assert.equal(node(result, "publisher").admittedUpdates.length, 0);
  assert(graph.repositories[1].evidence.orphanBranches.length);
});

test("shared catalogs require joint importer admission and workspace-file version restrictions", () => {
  const graph = fixture();
  const repo = graph.repositories[1];
  const second = structuredClone(repo.manifests[0]);
  second.path = "packages/leaf/package.json";
  second.manifest.name = "@lapismd/leaf";
  repo.manifests.push(second);
  repo.paths.push(second.path, "pnpm-workspace.yaml");
  graph.packages.push({
    ...second,
    name: second.manifest.name,
    repository: repo.repository,
  });
  repo.lock.importers["packages/leaf"] = structuredClone(
    repo.lock.importers["."],
  );
  graph.edges.push({
    ...graph.edges[0],
    path: second.path,
    consumer: second.manifest.name,
  });
  repo.workspace.catalog = { "@lapismd/foundation": "^1.0.0" };
  for (const p of repo.manifests)
    p.manifest.dependencies["@lapismd/foundation"] = "catalog:";
  let result = planWaves(graph, emptyState(), options);
  assert.equal(node(result, "publisher").admittedUpdates.length, 2);
  graph.waveAdmission = result.report;
  assert(
    repositoryConfig(repo, graph, process.cwd()).packageRules.some(
      (r) =>
        r.matchFileNames?.includes("pnpm-workspace.yaml") &&
        r.enabled &&
        r.allowedVersions === "/^(?:1\\.0\\.1)$/",
    ),
  );
  // The same catalog is also referenced by a supported peer. A runtime bump
  // cannot silently narrow that public support contract or move one importer.
  second.manifest.peerDependencies = second.manifest.dependencies;
  delete second.manifest.dependencies;
  graph.edges.at(-1).type = "peerDependencies";
  result = planWaves(graph, emptyState(), options);
  assert.equal(node(result, "publisher").status, "held");
  assert.equal(node(result, "publisher").admittedUpdates.length, 0);
  assert(
    node(result, "publisher").holds.some((h) => h.includes("shared catalog")),
  );
});

test("compatible automerge waits for complete exact existing PR candidate evidence", () => {
  const graph = fixture();
  const repo = graph.repositories[1];
  const candidate = structuredClone(repo);
  candidate.lock.importers["."].dependencies["@lapismd/foundation"].version =
    "1.0.1";
  candidate.manifests[0].manifest.dependencies["@lapismd/foundation"] =
    "^1.0.1";
  const pr = {
    user: { login: options.botLogin },
    head: { ref: "lapis-dependencies/lapis-first-party", sha },
    qualification: { state: "waiting" },
    basedOnCurrentSource: true,
    candidate,
    commits: [
      {
        author: { login: options.botLogin },
        commit: { author: { name: "Bot", email: "bot@example.com" } },
      },
    ],
  };
  repo.evidence.prs = [pr];
  graph.waveAdmission = planWaves(graph, emptyState(), options).report;
  const permitted = () =>
    repositoryConfig(repo, graph, process.cwd()).packageRules.some(
      (r) => r.automerge === true,
    );
  assert.equal(permitted(), false);
  pr.qualification.state = "qualified";
  assert.equal(permitted(), true);
  pr.basedOnCurrentSource = false;
  assert.equal(permitted(), false);
  pr.basedOnCurrentSource = true;
  candidate.lock.importers["."].dependencies["@lapismd/foundation"].version =
    "1.0.0";
  assert.equal(permitted(), false);
});

test("uncertain observations retain the originating write run across newer candidates", () => {
  const graph = fixture();
  const first = planWaves(graph, emptyState(), { ...options, runId: "123" });
  const original = node(first, "publisher").operationId;
  const second = planWaves(graph, first.state, { ...options, runId: "456" });
  assert.equal(second.state.operations[original].runId, "123");
  graph.available["@lapismd/foundation"].push("1.0.2");
  graph.registry["@lapismd/foundation"]["1.0.2"] = { integrity: "later" };
  const later = planWaves(graph, second.state, { ...options, runId: "789" });
  const current = node(later, "publisher");
  assert.equal(current.status, "uncertain");
  assert.notEqual(current.operationId, original);
  assert.equal(later.state.operations[current.operationId].status, "held");
  assert.equal(later.state.operations[current.operationId].runId, undefined);
  assert.equal(later.state.operations[original].runId, "123");
  assert(current.holds.some((h) => h.includes(original)));
  assert.equal(current.attention[0].code, "operation-reconciliation");
  assert.equal(
    current.attention[0].summary,
    "Dependency operation requires reconciliation",
  );
  assert.match(current.attention[0].detail, new RegExp(original));
});

test("Renovate validates admitted path/catalog rules and enforces them with its native rule engine", async () => {
  const { validateConfig } = await import("renovate/dist/config/validation.js");
  const { applyPackageRules } =
    await import("renovate/dist/util/package-rules/index.js");
  const graph = fixture();
  const repo = graph.repositories[1];
  graph.waveAdmission = planWaves(graph, emptyState(), options).report;
  const config = repositoryConfig(repo, graph, process.cwd());
  const validation = await validateConfig("global", config);
  assert.deepEqual(validation.errors, []);
  assert.deepEqual(validation.warnings, []);
  const effective = await applyPackageRules({
    ...config,
    datasource: "npm",
    versioning: "npm",
    depName: "@lapismd/foundation",
    packageName: "@lapismd/foundation",
    packageFile: "package.json",
    depType: "dependencies",
    currentValue: "^1.0.0",
    currentVersion: "1.0.0",
    newVersion: "1.0.1",
    updateType: "patch",
  });
  assert.equal(effective.enabled, true);
  assert.equal(effective.allowedVersions, "/^(?:1\\.0\\.1)$/");
  assert.equal(effective.automerge, false, "new heads must acquire fresh CI");
  const outside = await applyPackageRules({
    ...config,
    datasource: "npm",
    versioning: "npm",
    depName: "@lapismd/unadmitted",
    packageName: "@lapismd/unadmitted",
    packageFile: "pnpm-workspace.yaml",
    depType: "catalog",
    currentValue: "^1.0.0",
    currentVersion: "1.0.0",
    newVersion: "1.0.1",
    updateType: "patch",
  });
  assert.equal(outside.enabled, false);
});

test("merged peer widening is accepted on main while preserving older support", () => {
  const graph = fixture(),
    repo = graph.repositories[1];
  repo.manifests[0].manifest.peerDependencies = {
    "@lapismd/foundation": "1.0.0",
  };
  delete repo.manifests[0].manifest.dependencies;
  graph.edges[0].type = "peerDependencies";
  graph.edges[0].range = "1.0.0";
  const first = planWaves(graph, emptyState(), options);
  const id = node(first, "publisher").operationId;
  repo.sourceSha = "c".repeat(40);
  repo.manifests[0].manifest.peerDependencies["@lapismd/foundation"] =
    "1.0.0 || ^1.0.1";
  graph.edges[0].range = "1.0.0 || ^1.0.1";
  const after = planWaves(graph, first.state, options);
  assert.equal(after.state.operations[id].status, "accepted-on-main");
  assert.equal(node(after, "publisher").updates.length, 0);
});

test("source removal supersedes stale intent without claiming publication or blocking new work", () => {
  const graph = fixture(),
    repo = graph.repositories[1];
  const first = planWaves(graph, emptyState(), { ...options, runId: "123" });
  const id = node(first, "publisher").operationId;
  repo.sourceSha = "c".repeat(40);
  delete repo.manifests[0].manifest.dependencies["@lapismd/foundation"];
  graph.edges.shift();
  const after = planWaves(graph, first.state, options);
  assert.equal(after.state.operations[id].status, "accepted-on-main");
  assert.equal(after.state.releases["@lapismd/publisher"].status, "superseded");
  assert.equal(
    after.state.releases["@lapismd/publisher"].supersededSourceSha,
    repo.sourceSha,
  );
  assert.equal(node(after, "app").status, "unchanged");
  assert.doesNotThrow(() => planWaves(graph, after.state, options));
});

test("compound runtime support updates only its admitted lock and requires that exact candidate before merge", async () => {
  const { applyPackageRules } =
    await import("renovate/dist/util/package-rules/index.js");
  const { getNewValue } =
    await import("renovate/dist/modules/versioning/npm/range.js");
  const graph = fixture(),
    repo = graph.repositories[1],
    range = "^0.7.0 || ^1.0.0";
  repo.manifests[0].manifest.dependencies["@lapismd/foundation"] = range;
  graph.edges[0].range = range;
  graph.waveAdmission = planWaves(graph, emptyState(), options).report;
  const update = graph.waveAdmission.nodes.find(
    (n) => n.repository === repo.repository,
  ).admittedUpdates[0];
  assert.equal(
    update.targetRange,
    range,
    "Preserve all previously supported release lines",
  );
  assert.equal(
    update.releaseIntent,
    null,
    "An unchanged public manifest does not invent a release",
  );
  const candidate = structuredClone(repo);
  const pr = {
    user: { login: options.botLogin },
    head: { ref: "lapis-dependencies/lapis-first-party", sha },
    qualification: { state: "qualified" },
    basedOnCurrentSource: true,
    candidate,
    commits: [
      {
        author: { login: options.botLogin },
        commit: { author: { name: "Bot", email: "bot@example.com" } },
      },
    ],
  };
  repo.evidence.prs = [pr];
  const effective = async () =>
    applyPackageRules({
      ...repositoryConfig(repo, graph, process.cwd()),
      datasource: "npm",
      versioning: "npm",
      depName: "@lapismd/foundation",
      packageName: "@lapismd/foundation",
      packageFile: "package.json",
      depType: "dependencies",
      currentValue: range,
      currentVersion: "1.0.0",
      newVersion: "1.0.1",
      updateType: "patch",
    });
  let config = await effective();
  assert.equal(config.rangeStrategy, "update-lockfile");
  assert.equal(
    getNewValue({
      currentValue: range,
      rangeStrategy: config.rangeStrategy,
      currentVersion: "1.0.0",
      newVersion: "1.0.1",
    }),
    range,
  );
  assert.equal(
    config.automerge,
    false,
    "An unchanged old lock must remain blocked",
  );
  candidate.lock.importers["."].dependencies["@lapismd/foundation"].version =
    "1.0.1";
  assert.equal((await effective()).automerge, true);
  pr.qualification.state = "waiting";
  assert.equal(
    (await effective()).automerge,
    false,
    "A new head must qualify itself",
  );
});

test("compound runtime support outside its contract requires source compatibility review", () => {
  const graph = fixture(),
    repo = graph.repositories[1];
  repo.manifests[0].manifest.dependencies["@lapismd/foundation"] =
    "^0.7.0 || 1.0.0";
  graph.edges[0].range = "^0.7.0 || 1.0.0";
  const result = planWaves(graph, emptyState(), options),
    publisher = node(result, "publisher");
  assert.equal(publisher.admittedUpdates.length, 0);
  assert(
    publisher.holds.some((h) =>
      h.includes("compound range requires source-owned compatibility review"),
    ),
  );
});

test("persisted compound release waits retire only after qualified main locks and identical published support", () => {
  const graph = fixture(),
    repo = graph.repositories[1],
    range = "^0.7.0 || ^1.0.0";
  repo.manifests[0].manifest.dependencies["@lapismd/foundation"] = range;
  graph.edges[0].range = range;
  const state = emptyState();
  state.releases["@lapismd/publisher"] = {
    name: "@lapismd/publisher",
    repository: repo.repository,
    sourceSha: "c".repeat(40),
    baseline: "1.0.0",
    requires: [
      { name: "@lapismd/foundation", type: "dependencies", target: "1.0.1" },
    ],
    status: "waiting",
    policyRevision,
  };
  const metadata = graph.registry["@lapismd/publisher"]["1.0.0"];
  Object.assign(metadata, {
    gitHead: "d".repeat(40),
    dependencies: { "@lapismd/foundation": range },
  });
  repo.lock.importers["."].dependencies["@lapismd/foundation"].version =
    "1.0.1";
  observedPublication(repo, metadata);
  const result = planWaves(graph, state, options);
  assert.equal(
    result.state.releases["@lapismd/publisher"].status,
    "superseded",
    "No publication is needed for unchanged published support",
  );
  assert.equal(
    result.state.releases["@lapismd/publisher"].supersededSourceSha,
    repo.sourceSha,
  );
  assert.notEqual(
    result.state.releases["@lapismd/publisher"].status,
    "published",
  );
  for (const mutate of [
    (g) => {
      g.repositories[1].lock.importers["."].dependencies[
        "@lapismd/foundation"
      ].version = "1.0.0";
    },
    (g) => {
      g.repositories[1].evidence.runs[0].status = "in_progress";
      g.repositories[1].evidence.runs[0].conclusion = null;
    },
    (g) => {
      delete g.registry["@lapismd/publisher"]["1.0.0"].integrity;
    },
    (g) => {
      delete g.registry["@lapismd/publisher"]["1.0.0"].publication;
    },
    (g) => {
      g.registry["@lapismd/publisher"]["1.0.0"].dependencies[
        "@lapismd/foundation"
      ] = "^1.0.0";
    },
    (g) => {
      g.repositories[1].manifests[0].manifest.dependencies[
        "@lapismd/foundation"
      ] = "^1.0.0";
      g.edges[0].range = "^1.0.0";
    },
  ]) {
    const bad = structuredClone(graph);
    mutate(bad);
    assert.equal(
      planWaves(bad, state, options).state.releases["@lapismd/publisher"]
        .status,
      "waiting",
    );
  }
  assert.doesNotThrow(() => planWaves(graph, result.state, options));
});

test("verified publication receipts survive transient observations without granting stale release authority", () => {
  const graph = fixture(),
    repo = graph.repositories[1];
  const metadata = graph.registry["@lapismd/publisher"]["1.0.0"];
  observedPublication(repo, metadata);
  metadata.publication.channel = {
    policy: "latest",
    admitted: false,
    latest: "0.1.0",
    tags: ["next"],
  };
  graph.available["@lapismd/publisher"] = ["0.1.0"];
  repo.lock.importers["."].dependencies["@lapismd/foundation"].version =
    "1.0.1";
  const state = emptyState();
  state.releases["@lapismd/publisher"] = {
    name: "@lapismd/publisher",
    repository: repo.repository,
    sourceSha: sha,
    baseline: "0.9.0",
    requires: [
      { name: "@lapismd/foundation", type: "dependencies", target: "1.0.1" },
    ],
    status: "waiting",
    policyRevision,
  };
  const first = planWaves(graph, state, options);
  assert.equal(first.state.releases["@lapismd/publisher"].status, "waiting");
  assert(
    node(first, "publisher").waits.some((w) =>
      w.reason.startsWith("channel-not-admitted:"),
    ),
  );
  const old = Object.values(first.state.publications).find(
    (p) => p.name === "@lapismd/publisher",
  );
  assert.equal(old.evidence.state, "verified");
  assert.equal(old.verifiedEvidence.state, "verified");
  metadata.publication = {
    ...metadata.publication,
    state: "unknown",
    reason: "provenance-unknown",
    matchesCurrentContract: false,
  };
  delete metadata.publication.proof;
  const second = planWaves(graph, first.state, options);
  const current = Object.values(second.state.publications).find(
    (p) => p.name === "@lapismd/publisher",
  );
  assert.equal(current.evidence.state, "unknown");
  assert.deepEqual(current.verifiedEvidence, old.verifiedEvidence);
  assert.equal(second.state.releases["@lapismd/publisher"].status, "waiting");
  assert(
    node(second, "publisher").waits.some((w) =>
      w.reason.startsWith("provenance-unknown:"),
    ),
  );
});
