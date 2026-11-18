import test from "node:test";
import assert from "node:assert/strict";
import { planWaves, emptyState } from "../src/waves.mjs";
import { scopedSdkFixture } from "./helpers/scoped-sdk.mjs";
import {
  scopedEligibilityPolicy,
  assertScopedBinding,
} from "../src/scoped-admission.mjs";
import { repositoryConfig } from "../src/renovate.mjs";
import { markUnpublishedDependencies } from "../src/github.mjs";
import { dependencyNotes, scopedContextSummary } from "../src/pr-messages.mjs";

test("separately authorized SDK scope isolates the real patch while preserving frozen pending work", () => {
  const f = scopedSdkFixture(),
    saved = structuredClone(f.graph);
  const plan = planWaves(f.graph, emptyState(), f.options),
    node = plan.report.nodes[0];
  assert.deepEqual(plan.admitted, [f.repo.repository]);
  assert.deepEqual(
    node.admittedUpdates.map((u) => u.name),
    [f.sdk],
  );
  assert.equal(node.scopedAdmission.deferredUpdates.length, 1);
  assert(node.scopedAdmission.deferredHolds.length >= 3);
  assert.equal(
    node.scopedAdmission.deferredUpdates[0].name,
    "@lapismd/design-core",
  );
  assert.deepEqual(f.graph, saved);
});

for (const [name, mutate] of Object.entries({
  "missing separate scope decision": (f) => delete f.options.scopedEligibility,
  "artifact authority alone": (f) =>
    (f.options.scopedEligibility = '{"schemaVersion":1,"repositories":{}}'),
  "scope authority without artifact capability": (f) =>
    delete f.options.artifactCapabilities,
  "full phase": (f) => (f.repo.phase = "full"),
  "explicit operator hold": (f) =>
    (f.repo.holdReason = "Private Profile/API remains held"),
  "incomplete source coverage": (f) =>
    f.graph.coverage.push("unavailable-source"),
  "unknown source coverage": (f) => delete f.graph.coverage,
  "unknown registry absence evidence": (f) => delete f.graph.unpublished,
  "failed current CI": (f) => (f.repo.evidence.runs[0].conclusion = "failure"),
  "pending current CI": (f) => (f.repo.evidence.runs[0].status = "in_progress"),
  "missing current CI": (f) => (f.repo.evidence.runs = []),
  "source evidence SHA drift": (f) => (f.repo.evidence.sha = "f".repeat(40)),
  "stale descriptor bytes": (f) => (f.repo.artifactProjection.bytes += " "),
  "canonical policy bytes drift": (f) =>
    (f.repo.canonicalIntake.policyBytes += " "),
  "canonical policy object drift": (f) =>
    (f.repo.canonicalIntake.policy.dependency = "@lapismd/design-core"),
  "unbound private source change": (f) =>
    (f.repo.manifests[0].manifest.description = "unreviewed"),
  "private input bytes drift": (f) =>
    (f.repo.artifactProjection.inputs["scripts/ci-sources.json"] += " "),
  "nested CI docs bytes drift": (f) =>
    (f.repo.artifactProjection.inputs[".github/ci-docs/package.json"] += " "),
  "workspace drift": (f) => (f.repo.workspace.unknown = true),
  "shared lock drift": (f) => (f.repo.lock.settings.unknown = true),
  "unknown hold without structured origin": (f) =>
    f.repo.nonPortable.push("unknown private hold"),
  "matching human message with unknown origin": (f) =>
    delete f.repo.nonPortableDetails,
  "local path mislabeled by human wording": (f) =>
    (f.repo.nonPortableDetails[0].kind = "local-path"),
  "unpublished fact without registry evidence": (f) =>
    (f.graph.unpublished = []),
  "SDK integrity unavailable": (f) =>
    (f.graph.registry[f.sdk]["0.2.1"].integrity = "unknown"),
  "SDK excluded": (f) => f.graph.excludedPackages.push(f.sdk),
  "frozen prerequisite excluded": (f) =>
    f.graph.excludedPackages.push(f.frozen[0]),
  "foreign reserved branch": (f) =>
    f.repo.evidence.orphanBranches.push({
      branch: "lapis-dependencies/lapis-first-party",
      head: "d".repeat(40),
    }),
  "unregistered frozen prerequisite": (f) => {
    f.grant.frozenPrerequisites.shift();
    f.options.scopedEligibility = JSON.stringify({
      schemaVersion: 1,
      repositories: { [f.repo.repository]: f.grant },
    });
  },
}))
  test(`scoped SDK admission retains rejection for ${name}`, () => {
    const f = scopedSdkFixture();
    mutate(f);
    const saved = structuredClone(f.graph);
    assert.deepEqual(planWaves(f.graph, emptyState(), f.options).admitted, []);
    assert.deepEqual(f.graph, saved);
  });

test("same source and targets receive different durable identity for a different exact grant", () => {
  const f = scopedSdkFixture(),
    first = planWaves(f.graph, emptyState(), f.options).report.nodes[0];
  f.options.scopedEligibility += "\n";
  const second = planWaves(f.graph, emptyState(), f.options).report.nodes[0];
  assert.equal(first.status, "admitted");
  assert.equal(second.status, "admitted");
  assert.notEqual(first.operationId, second.operationId);
});

test("strict generated configuration includes current scope binding and refuses revocation", () => {
  const f = scopedSdkFixture(),
    plan = planWaves(f.graph, emptyState(), f.options);
  f.graph.waveAdmission = plan.report;
  const config = repositoryConfig(
    f.repo,
    f.graph,
    process.cwd(),
    f.options.artifactCapabilities,
    f.options.scopedEligibility,
  );
  assert.deepEqual(config.enabledManagers, ["custom.regex"]);
  const data = JSON.parse(config.postUpgradeTasks.dataFileTemplate),
    context = data.artifactProjection.scopeEligibility;
  assert.equal(
    assertScopedBinding(f.repo.repository, context, f.options.scopedEligibility)
      .canonicalPolicySha256,
    f.grant.canonicalPolicySha256,
  );
  assert.throws(
    () =>
      assertScopedBinding(
        f.repo.repository,
        context,
        '{"schemaVersion":1,"repositories":{}}',
      ),
    /revoked|stale/,
  );
  assert.throws(
    () =>
      repositoryConfig(
        f.repo,
        f.graph,
        process.cwd(),
        f.options.artifactCapabilities,
      ),
    /revoked|stale/,
  );
  assert.throws(
    () => repositoryConfig(f.repo, f.graph, process.cwd()),
    /artifact capability/,
  );
  assert.equal(data.artifactProjection.update.name, f.sdk);
  assert.equal(data.canonicalUpdates, undefined);
  assert.equal(config.postUpgradeTasks.commands.length, 1);
});

test("scope registration is default-off and bounded independently of source data", () => {
  assert.deepEqual(scopedEligibilityPolicy().policy.repositories, {});
  const f = scopedSdkFixture();
  for (const mutate of [
    (p) => (p.schemaVersion = 2),
    (p) => (p.extra = true),
    (p) =>
      (p.repositories["lapismd/nostr-auth"] =
        p.repositories[f.repo.repository]),
    (p) => (p.repositories[f.repo.repository].command = "sh"),
    (p) =>
      p.repositories[f.repo.repository].frozenPrerequisites.push({
        path: "package.json",
        type: "dependencies",
        name: "@lapismd/terminal-host",
      }),
    (p) => (p.repositories[f.repo.repository].descriptorSha256 = "stale"),
  ]) {
    const p = JSON.parse(f.options.scopedEligibility);
    mutate(p);
    assert.throws(() => scopedEligibilityPolicy(JSON.stringify(p)));
  }
  assert.throws(() =>
    scopedEligibilityPolicy(
      '{"schemaVersion":1,"schemaVersion":1,"repositories":{}}',
    ),
  );
  assert.throws(() => scopedEligibilityPolicy(" ".repeat(8193)));
});

test("fresh immutable rediscovery restores complete deferred evidence and operation identity", () => {
  const f = scopedSdkFixture(),
    before = planWaves(f.graph, emptyState(), f.options).report.nodes[0];
  f.repo.nonPortable = [];
  f.repo.nonPortableDetails = [];
  markUnpublishedDependencies([f.repo], f.graph.edges, f.graph.unpublished);
  markUnpublishedDependencies([f.repo], f.graph.edges, f.graph.unpublished);
  const after = planWaves(f.graph, emptyState(), f.options).report.nodes[0];
  assert.equal(after.operationId, before.operationId);
  assert.deepEqual(after.scopedAdmission, before.scopedAdmission);
});

test("rich and human summaries retain the selected scope and deferred Core/private work", () => {
  const f = scopedSdkFixture(),
    plan = planWaves(f.graph, emptyState(), f.options);
  f.graph.waveAdmission = plan.report;
  const summary = scopedContextSummary(plan.report.nodes[0]),
    body = dependencyNotes(f.repo, f.graph);
  for (const output of [summary, body]) {
    assert.match(output, /root SDK development only/);
    assert.match(output, /@lapismd\/design-core/);
    assert.match(output, /frozen prerequisite hold/);
    assert.match(output, /not full-repository acceptance/);
  }
  assert.doesNotMatch(body, /No holds recorded/);
  assert.match(body, /unpublished registry dependency/);
});

test("an unrelated owned PR cannot turn uncertain SDK writes into a retry", () => {
  const f = scopedSdkFixture(),
    opts = { ...f.options, writes: true, runId: "123" },
    first = planWaves(f.graph, emptyState(), opts);
  assert.equal(
    planWaves(f.graph, first.state, opts).report.nodes[0].status,
    "uncertain",
  );
  const head = "d".repeat(40),
    candidate = structuredClone(f.repo);
  candidate.sourceSha = head;
  candidate.manifests[0].manifest.dependencies["@lapismd/design-core"] =
    "^0.13.5";
  const pr = {
    number: 1,
    user: { login: opts.botLogin },
    head: { ref: "lapis-dependencies/lapis-first-party", sha: head },
    commits: [
      {
        author: { login: opts.botLogin },
        commit: { author: { name: "Bot", email: "bot@example.com" } },
      },
    ],
    candidate,
  };
  f.repo.evidence.prs.push(pr);
  assert.equal(
    planWaves(f.graph, first.state, opts).report.nodes[0].status,
    "uncertain",
  );
  candidate.manifests[0].manifest.devDependencies[f.sdk] = "0.2.1";
  candidate.lock.importers["."].devDependencies[f.sdk] = {
    specifier: "0.2.1",
    version: "0.2.1",
  };
  assert.equal(
    planWaves(f.graph, first.state, opts).report.nodes[0].status,
    "admitted",
  );
  candidate.sourceSha = "e".repeat(40);
  assert.equal(
    planWaves(f.graph, first.state, opts).report.nodes[0].status,
    "uncertain",
  );
});

test("a selected SDK publication wait remains blocking despite its separate scope grant", () => {
  const f = scopedSdkFixture(),
    repository = "lapismd/spec-validator",
    sourceSha = "c".repeat(40),
    manifest = { name: f.sdk, version: "0.2.1" };
  f.graph.repositories.push({
    repository,
    sourceSha,
    visibility: "public",
    phase: "full",
    nonPortable: [],
    workspace: {},
    manifests: [{ path: "package.json", manifest }],
    evidence: { ...structuredClone(f.repo.evidence), sha: sourceSha, runs: [] },
  });
  f.graph.packages.push({
    repository,
    name: f.sdk,
    path: "package.json",
    version: "0.2.1",
    manifest,
  });
  const state = emptyState();
  state.releases[f.sdk] = {
    name: f.sdk,
    repository,
    sourceSha,
    baseline: "0.2.0",
    requires: [],
    status: "waiting",
    policyRevision: f.options.policyRevision,
  };
  const plan = planWaves(f.graph, state, f.options),
    node = plan.report.nodes.find((n) => n.repository === f.repo.repository);
  assert.deepEqual(plan.admitted, []);
  assert(node.waits.some((w) => w.package === f.sdk));
  assert.equal(node.admittedUpdates.length, 0);
});

test("a qualified selected-scope no-op retains all deferred runtime work without inventing an update", () => {
  const f = scopedSdkFixture();
  f.graph.available[f.sdk] = ["0.2.0"];
  f.graph.registry[f.sdk]["0.2.0"] = {
    integrity: f.repo.lock.packages[`${f.sdk}@0.2.0`].resolution.integrity,
  };
  const plan = planWaves(f.graph, emptyState(), f.options),
    node = plan.report.nodes[0];
  assert.deepEqual(plan.admitted, []);
  assert.equal(node.status, "unchanged");
  assert.equal(node.updates.length, 0);
  assert.equal(
    node.scopedAdmission.deferredUpdates[0].name,
    "@lapismd/design-core",
  );
  assert.equal(node.scopedAdmission.deferredHolds.length, 4);
});
