import assert from "node:assert/strict";
import test from "node:test";
import semver from "semver";
import { channelFixture, options, revision } from "./channel-fixtures.mjs";
import { observedPublication } from "./publication-fixtures.mjs";
import { emptyState, planWaves } from "../src/waves.mjs";
import { repositoryConfig } from "../src/renovate.mjs";

const core = "@lapismd/design-core",
  profile = "@lapis-notes/app-profile";
const runOptions = { ...options, writes: true };
function fixture() {
  const graph = channelFixture(),
    repo = graph.repositories[0];
  const entry = repo.manifests.find((p) => p.manifest.name === profile);
  entry.manifest.dependencies[core] = "^0.13.3";
  const edge = graph.edges.find(
    (e) =>
      e.repository === repo.repository &&
      e.path === entry.path &&
      e.name === core,
  );
  edge.range = "^0.13.3";
  graph.registry[core]["0.13.3"] = { integrity: "previous-core" };
  const state = emptyState();
  state.releases[profile] = {
    name: profile,
    repository: repo.repository,
    sourceSha: "c".repeat(40),
    baseline: entry.manifest.version,
    requires: [{ name: core, type: "dependencies", target: "0.13.4" }],
    status: "waiting",
    policyRevision: revision,
  };
  const node = (plan) =>
    plan.report.nodes.find((n) => n.repository === repo.repository);
  return {
    graph,
    repo,
    entry,
    edge,
    state,
    node,
    plan: () => planWaves(graph, state, runOptions),
  };
}
test("an incidental lock update cannot strand an existing required runtime minimum", () => {
  const f = fixture(),
    before = JSON.stringify(f.graph),
    plan = f.plan();
  const update = f
    .node(plan)
    .admittedUpdates.find((u) => u.path === f.entry.path && u.name === core);
  assert.ok(
    update,
    "The still-required manifest minimum must remain actionable",
  );
  assert.equal(update.current, "0.13.4");
  assert.equal(update.target, "0.13.4");
  assert.equal(update.targetRange, "^0.13.4");
  assert.equal(update.releaseIntent, profile);
  assert.equal(update.compatibility, "compatible");
  assert.equal(plan.state.releases[profile].status, "waiting");
  assert.equal(JSON.stringify(f.graph), before);
  const replay = planWaves(f.graph, plan.state, {
    ...runOptions,
    writes: false,
  });
  assert.equal(f.node(replay).operationId, f.node(plan).operationId);
  assert.deepEqual(replay.state.releases, plan.state.releases);
});
test("native Renovate proposes the manifest bump even with the target already locked", async () => {
  const { applyPackageRules } =
    await import("renovate/dist/util/package-rules/index.js");
  const { getCurrentVersion } =
    await import("renovate/dist/workers/repository/process/lookup/current.js");
  const { filterVersions } =
    await import("renovate/dist/workers/repository/process/lookup/filter.js");
  const versioning =
    await import("renovate/dist/modules/versioning/npm/index.js");
  const f = fixture();
  f.graph.waveAdmission = f.plan().report;
  assert.equal(f.node({ report: f.graph.waveAdmission }).status, "admitted");
  const config = await applyPackageRules({
    ...repositoryConfig(f.repo, f.graph, process.cwd()),
    datasource: "npm",
    versioning: "npm",
    packageName: core,
    depName: core,
    packageFile: f.entry.path,
    depType: "dependencies",
    currentValue: f.edge.range,
    lockedVersion: "0.13.4",
    updateType: "patch",
    newVersion: "0.13.4",
  });
  const api = versioning.api;
  assert.equal(config.rangeStrategy, "bump");
  const current = getCurrentVersion(
    f.edge.range,
    "0.13.4",
    api,
    config.rangeStrategy,
    "0.13.4",
    ["0.13.3", "0.13.4"],
  );
  assert.equal(current, "0.13.3");
  assert.deepEqual(
    filterVersions(
      config,
      current,
      "0.13.4",
      [{ version: "0.13.3" }, { version: "0.13.4" }],
      api,
    ).map((r) => r.version),
    ["0.13.4"],
  );
  assert.equal(
    api.getNewValue({
      currentValue: f.edge.range,
      rangeStrategy: config.rangeStrategy,
      currentVersion: "0.13.4",
      newVersion: "0.13.4",
    }),
    "^0.13.4",
  );
  assert.equal(
    config.automerge,
    false,
    "A newly generated candidate still needs its own CI",
  );
});
for (const [reason, change] of [
  ["no retained release", (f) => delete f.state.releases[profile]],
  [
    "already published release",
    (f) => (f.state.releases[profile].status = "published"),
  ],
  [
    "another owner",
    (f) => (f.state.releases[profile].repository = "lapismd/lapis-plugins"),
  ],
  [
    "another required target",
    (f) => (f.state.releases[profile].requires[0].target = "0.13.5"),
  ],
  [
    "already raised minimum",
    (f) => {
      f.entry.manifest.dependencies[core] = f.edge.range = "^0.13.4";
    },
  ],
  [
    "unsupported older release line",
    (f) => {
      f.entry.manifest.dependencies[core] = f.edge.range = "^0.12.3";
    },
  ],
  [
    "compound support",
    (f) => {
      f.entry.manifest.dependencies[core] = f.edge.range = "^0.9.0 || ^0.13.3";
    },
  ],
  [
    "development-only field",
    (f) => {
      f.edge.type = "devDependencies";
      f.state.releases[profile].requires[0].type = "devDependencies";
      f.entry.manifest.devDependencies = { [core]: "^0.13.3" };
      f.repo.lock.importers["packages/app-profile"].devDependencies = {
        [core]: { version: "0.13.4" },
      };
    },
  ],
  [
    "newer installed version",
    (f) =>
      (f.repo.lock.importers["packages/app-profile"].dependencies[
        core
      ].version = "0.13.5"),
  ],
])
  test(`minimum repair does not invent an update for ${reason}`, () => {
    const f = fixture();
    change(f);
    assert.equal(
      f
        .node(f.plan())
        .updates.some((u) => u.path === f.entry.path && u.name === core),
      false,
    );
  });
for (const state of ["in_progress", "failure"])
  test(`minimum repair preserves ${state} source qualification hold`, () => {
    const f = fixture();
    f.repo.evidence.checks = [
      state === "failure"
        ? { status: "completed", conclusion: "failure" }
        : { status: state },
    ];
    assert.notEqual(f.node(f.plan()).status, "admitted");
  });
test("publication retirement still requires the repaired manifest in a newer verified release", () => {
  const f = fixture(),
    before = f.plan();
  assert.equal(before.state.releases[profile].status, "waiting");
  f.entry.manifest.dependencies[core] = f.edge.range = "^0.13.4";
  assert.equal(f.node(f.plan()).updates.length, 0);
  assert.equal(f.plan().state.releases[profile].status, "waiting");
  assert.equal(f.entry.manifest.version, f.state.releases[profile].baseline);
  const nextVersion = semver.inc(f.entry.manifest.version, "patch");
  assert.ok(nextVersion);
  f.entry.manifest.version = nextVersion;
  f.graph.registry[profile][nextVersion] = observedPublication(
    f.repo,
    { dependencies: f.entry.manifest.dependencies },
    f.entry.manifest,
  );
  f.graph.available[profile] = f.graph.stableCandidates[profile] = [
    "0.1.0",
    nextVersion,
  ];
  const after = f.plan();
  assert.equal(after.state.releases[profile].status, "published");
  assert.equal(after.state.releases[profile].version, nextVersion);
  const replay = planWaves(f.graph, after.state, {
    ...runOptions,
    writes: false,
  });
  assert.deepEqual(replay.state.releases, after.state.releases);
});

test("an unobserved minimum repair remains uncertain across unrelated main commits", () => {
  const f = fixture();
  const first = planWaves(f.graph, f.state, { ...runOptions, runId: "201" });
  const id = f.node(first).operationId;
  f.repo.sourceSha = "d".repeat(40);
  f.repo.evidence.sha = f.repo.sourceSha;
  f.repo.evidence.runs.forEach((r) => (r.head_sha = f.repo.sourceSha));
  const after = planWaves(f.graph, first.state, {
    ...runOptions,
    runId: "202",
  });
  assert.equal(f.node(after).status, "uncertain");
  assert.notEqual(after.state.operations[id].status, "accepted-on-main");
  f.entry.manifest.dependencies[core] = f.edge.range = "^0.13.4";
  const repaired = planWaves(f.graph, after.state, runOptions);
  assert.equal(repaired.state.operations[id].status, "accepted-on-main");
});
test("optional runtime minimum repair retains the owning release intent", () => {
  const f = fixture();
  delete f.entry.manifest.dependencies[core];
  f.entry.manifest.optionalDependencies = { [core]: "^0.13.3" };
  f.edge.type = f.state.releases[profile].requires[0].type =
    "optionalDependencies";
  f.repo.lock.importers["packages/app-profile"].optionalDependencies = {
    [core]: { version: "0.13.4" },
  };
  const update = f
    .node(f.plan())
    .admittedUpdates.find((u) => u.path === f.entry.path && u.name === core);
  assert.equal(update?.targetRange, "^0.13.4");
  assert.equal(update?.releaseIntent, profile);
});
for (const [reason, change] of [
  ["a private current owner", (f) => (f.entry.manifest.private = true)],
  [
    "catalog coupling",
    (f) => {
      f.entry.manifest.dependencies[core] = "catalog:";
      f.repo.workspace.catalog = { [core]: "^0.13.3" };
    },
  ],
])
  test(`minimum repair does not bypass ${reason}`, () => {
    const f = fixture();
    change(f);
    assert.equal(
      f
        .node(f.plan())
        .updates.some((u) => u.path === f.entry.path && u.name === core),
      false,
    );
  });

test("native candidate qualification requires the repaired minimum as well as the existing lock", async () => {
  const { applyPackageRules } =
    await import("renovate/dist/util/package-rules/index.js");
  const f = fixture();
  f.graph.waveAdmission = f.plan().report;
  const candidate = structuredClone(f.repo);
  const pr = {
    user: { login: options.botLogin },
    head: { ref: "lapis-dependencies/lapis-first-party", sha: "e".repeat(40) },
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
  f.repo.evidence.prs = [pr];
  const effective = () =>
    applyPackageRules({
      ...repositoryConfig(f.repo, f.graph, process.cwd()),
      datasource: "npm",
      versioning: "npm",
      packageName: core,
      depName: core,
      packageFile: f.entry.path,
      depType: "dependencies",
      currentValue: f.edge.range,
      currentVersion: "0.13.3",
      lockedVersion: "0.13.4",
      newVersion: "0.13.4",
      updateType: "patch",
    });
  assert.equal((await effective()).automerge, false);
  candidate.manifests.find(
    (p) => p.path === f.entry.path,
  ).manifest.dependencies[core] = "^0.13.4";
  assert.equal((await effective()).automerge, true);
  pr.qualification.state = "waiting";
  assert.equal((await effective()).automerge, false);
});
test("simple compatible tilde minimums retain their operator", () => {
  const f = fixture();
  f.entry.manifest.dependencies[core] = f.edge.range = "~0.13.3";
  const update = f
    .node(f.plan())
    .admittedUpdates.find((u) => u.path === f.entry.path && u.name === core);
  assert.equal(update?.targetRange, "~0.13.4");
});
