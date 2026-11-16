import assert from "node:assert/strict";
import test from "node:test";
import { validateSourceCiReceipt } from "../src/tooling-ci.mjs";
import { sourceCiEvidence } from "../src/tooling-evidence.mjs";
const sha = "a".repeat(40);
const run = {
  id: 7,
  run_attempt: 2,
  event: "push",
  head_branch: "main",
  head_sha: sha,
  status: "completed",
  conclusion: "success",
  path: ".github/workflows/ci.yml",
  created_at: "2026-11-16T00:00:00Z",
  updated_at: "2026-11-16T00:01:00Z",
};
const job = {
  id: 8,
  run_id: 7,
  run_attempt: 2,
  head_sha: sha,
  name: "Validate",
  status: "completed",
  conclusion: "success",
};
const options = (jobs = [job], path = run.path) => ({
  policy: { [path]: ["Validate"] },
  jobsByRun: { 7: { total_count: jobs.length, jobs } },
});

test("reviewed nonstandard workflow requires its actual successful validation job", () => {
  const path = ".github/workflows/publish-web-cloudflare.yml";
  const result = sourceCiEvidence(
    sha,
    [{ ...run, path }],
    "main",
    options([job], path),
  );
  assert.equal(result.runId, "7");
  assert.equal(result.runAttempt, 2);
  assert.deepEqual(result.jobs, [
    { id: "8", name: "Validate", conclusion: "success" },
  ]);
});
for (const conclusion of ["skipped", "failure", "cancelled"])
  test(`a successful workflow with ${conclusion} required validation is unavailable`, () => {
    assert.deepEqual(
      sourceCiEvidence(sha, [run], "main", options([{ ...job, conclusion }])),
      { state: "unavailable" },
    );
  });
test("missing, duplicate, incomplete, wrong-source and wrong-attempt jobs cannot qualify", () => {
  for (const jobs of [
    [],
    [job, { ...job, id: 9 }],
    [{ ...job, status: "in_progress" }],
    [{ ...job, run_id: 6 }],
    [{ ...job, run_attempt: 1 }],
    [{ ...job, head_sha: "b".repeat(40) }],
  ])
    assert.deepEqual(sourceCiEvidence(sha, [run], "main", options(jobs)), {
      state: "unavailable",
    });
  const incomplete = options();
  incomplete.jobsByRun[7].total_count = 2;
  assert.deepEqual(sourceCiEvidence(sha, [run], "main", incomplete), {
    state: "unavailable",
  });
});
test("explicitly unavailable source paths never fall back to filename heuristics", () => {
  assert.deepEqual(
    sourceCiEvidence(sha, [run], "main", { policy: {}, jobsByRun: {} }),
    { state: "unavailable" },
  );
});

test("persisted job receipts require reviewed policy and reject malformed scope", () => {
  const receipt = {
    workflow: run.path,
    runAttempt: 2,
    jobs: [{ id: "8", name: "Validate", conclusion: "success" }],
  };
  assert.throws(() => validateSourceCiReceipt(receipt), /reviewed/);
  validateSourceCiReceipt(receipt, { [run.path]: ["Validate"] });
  for (const changed of [
    { ...receipt, runAttempt: 0 },
    { ...receipt, jobs: [] },
    {
      ...receipt,
      jobs: [{ id: "0", name: "Validate", conclusion: "success" }],
    },
    { ...receipt, jobs: [{ id: "8", name: "Other", conclusion: "success" }] },
    {
      ...receipt,
      jobs: [{ id: "8", name: "Validate", conclusion: "skipped" }],
    },
  ])
    assert.throws(
      () => validateSourceCiReceipt(changed, { [run.path]: ["Validate"] }),
      /receipt/,
    );
});
