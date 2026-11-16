import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import {
  selectCohortEntries,
  collectToolingCohort,
} from "../src/tooling-collect.mjs";
import { workflowPackageManager } from "../src/tooling-provenance.mjs";
const sha = "a".repeat(40),
  hash = (text) => createHash("sha256").update(text).digest("hex");
const workflow =
  "jobs:\n  version:\n    steps:\n      - name: Set up pnpm\n        run: |\n          corepack enable\n          corepack prepare pnpm@10.32.1 --activate\n";
const reference = {
  source: "workflow-pin",
  version: "10.32.1",
  path: ".github/workflows/release.yml",
  sha256: hash(workflow),
  job: "version",
  step: "Set up pnpm",
};
const fixture = () => ({
  repository: "lapismd/example",
  sourceSha: sha,
  defaultBranch: "main",
  toolingManifestSha256: "b".repeat(64),
  toolingLockSha256: "c".repeat(64),
  toolingInputs: [],
  manifests: [
    {
      path: "package.json",
      manifest: {
        packageManager: "pnpm@10.32.1",
        devDependencies: { vitest: "^4.1.0" },
      },
    },
  ],
  lock: {
    importers: { ".": { devDependencies: { vitest: { version: "4.1.12" } } } },
  },
});
const existing = {
  sourceSha: "d".repeat(40),
  pnpm: "10.32.1",
  tools: { vitest: "~4.1.0" },
  ci: {},
};

test("refresh preserves supported ranges while binding exact source and resolved bytes", async () => {
  const result = await collectToolingCohort(fixture(), existing, async () => ({
    workflow_runs: [],
  }));
  assert.deepEqual(result.cohort.tools, existing.tools);
  assert.equal(result.cohort.sourceSha, sha);
  assert.equal(result.cohort.evidence.resolved.vitest, "4.1.12");
  assert.equal(result.cohort.evidence.packageManager.source, "manifest");
  assert.equal(result.declaredRangeDifferences[0].observed, "^4.1.0");
  assert.equal(result.cohort.evidence.recipe.qualification, "unqualified");
  const bad = fixture();
  bad.lock.importers["."].devDependencies.vitest.version = "5.0.0";
  await assert.rejects(
    collectToolingCohort(bad, existing, async () => ({ workflow_runs: [] })),
    /cohort/,
  );
});
test("workflow pin evidence never invents a root packageManager and changed commands reject", async () => {
  assert.deepEqual(workflowPackageManager(workflow, reference), reference);
  for (const changed of [
    workflow.replace("10.32.1", "10.34.5"),
    workflow.replace("corepack enable", "echo setup"),
    workflow.replace("Set up pnpm", "Different step"),
  ])
    assert.throws(
      () => workflowPackageManager(changed, reference),
      /package.manager/i,
    );
  const snapshot = fixture();
  delete snapshot.manifests[0].manifest.packageManager;
  const previous = { ...existing, evidence: { packageManager: reference } };
  const result = await collectToolingCohort(snapshot, previous, async (path) =>
    path.includes("/contents/")
      ? { content: Buffer.from(workflow).toString("base64") }
      : { workflow_runs: [] },
  );
  assert.equal(snapshot.manifests[0].manifest.packageManager, undefined);
  assert.equal(result.cohort.evidence.packageManager.source, "workflow-pin");
  assert.deepEqual(result.cohort.tools, existing.tools);
});
test("refresh selection cannot widen held, excluded or unknown source scope", () => {
  const policy = {
    repositories: [
      { repository: "lapismd/example", phase: "full" },
      { repository: "lapismd/held", phase: "full", holdReason: "hold" },
      { repository: "lapismd/excluded", phase: "full" },
    ],
    monitoring: { excludedRepositories: ["lapismd/excluded"] },
  };
  const tooling = { repositories: { "lapismd/example": existing } };
  assert.deepEqual(selectCohortEntries(policy, tooling, []), []);
  assert.deepEqual(selectCohortEntries(policy, tooling, ["--refresh"]), [
    policy.repositories[0],
  ]);
  for (const name of ["lapismd/held", "lapismd/excluded", "lapismd/unknown"])
    assert.throws(
      () => selectCohortEntries(policy, tooling, ["--refresh", name]),
      /eligible/,
    );
  assert.throws(
    () => selectCohortEntries(policy, tooling, ["--write"]),
    /refresh/,
  );
});

test("collection retains skipped current validation and independently bound prior-source success", async () => {
  const current = {
    id: 7,
    run_attempt: 1,
    event: "push",
    head_branch: "main",
    head_sha: sha,
    status: "completed",
    conclusion: "success",
    path: ".github/workflows/ci.yml",
    created_at: "2026-11-16T00:00:00Z",
    updated_at: "2026-11-16T00:01:00Z",
  };
  const previous = {
    ...current,
    id: 6,
    head_sha: "d".repeat(40),
    created_at: "2026-11-15T00:00:00Z",
  };
  const calls = [];
  const result = await collectToolingCohort(
    fixture(),
    { ...existing, ci: { [current.path]: ["Validate"] } },
    async (url) => {
      calls.push(url);
      if (url.includes("/actions/runs?"))
        return { workflow_runs: [current, previous] };
      const run = url.includes("/runs/7/") ? current : previous;
      return {
        total_count: 1,
        jobs: [
          {
            id: run.id + 10,
            run_id: run.id,
            run_attempt: 1,
            head_sha: run.head_sha,
            name: "Validate",
            status: "completed",
            conclusion: run.id === 7 ? "skipped" : "success",
          },
        ],
      };
    },
  );
  assert.equal(result.cohort.evidence.sourceCi.state, "prior-source");
  assert.equal(result.cohort.evidence.sourceCi.runId, "6");
  assert.equal(result.observations[0].requiredJobs[0].conclusion, "skipped");
  assert.equal(calls.length, 3);
  assert.ok(
    calls
      .slice(1)
      .every((url) => url.includes("/attempts/1/jobs?per_page=100")),
  );
});
