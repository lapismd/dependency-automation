import assert from "node:assert/strict";
import test from "node:test";
import {
  validateCohortEvidence,
  assessCohortEvidence,
  sourceCiEvidence,
} from "../src/tooling-evidence.mjs";
const repository = "lapismd/example",
  sourceSha = "a".repeat(40);
const cohort = {
  sourceSha,
  tools: { vitest: "^4.1.0" },
  evidence: {
    observedAt: "2026-11-16T00:00:00.000Z",
    manifestSha256: "b".repeat(64),
    lockSha256: "c".repeat(64),
    resolved: { vitest: "4.1.12" },
    sourceCi: {
      state: "same-source",
      runId: "123",
      sourceSha,
      workflow: ".github/workflows/ci.yml",
      completedAt: "2026-11-15T23:59:00Z",
    },
    recipe: { qualification: "unqualified", command: null, runtimeInputs: [] },
  },
};

test("bounded CI selection rejects failed, unrelated and non-source pipelines", () => {
  const older = {
    id: 1,
    event: "push",
    head_branch: "main",
    status: "completed",
    conclusion: "success",
    head_sha: "a".repeat(40),
    created_at: "2026-11-15T00:00:00Z",
    updated_at: "2026-11-15T01:00:00Z",
    path: ".github/workflows/ci.yml",
  };
  const newer = {
    ...older,
    id: 2,
    head_sha: "b".repeat(40),
    created_at: "2026-11-16T00:00:00Z",
  };
  for (const bad of [
    { ...newer, conclusion: "failure" },
    { ...newer, event: "pull_request" },
    { ...newer, head_branch: "unrelated" },
    { ...newer, path: ".github/workflows/pages.yml" },
    { ...newer, updated_at: null },
  ])
    assert.equal(sourceCiEvidence(sourceSha, [bad, older], "main").runId, "1");
  assert.equal(
    sourceCiEvidence(sourceSha, [older, newer], "main").state,
    "prior-source",
  );
  assert.deepEqual(sourceCiEvidence(sourceSha, [], "main"), {
    state: "unavailable",
  });
  assert.throws(() => sourceCiEvidence(sourceSha, null, "main"), /Unavailable/);
});
test("successful source CI never promotes an unqualified whole recipe", () => {
  validateCohortEvidence(cohort.evidence, cohort);
  const result = assessCohortEvidence(
    { sourceSha, toolingLockSha256: cohort.evidence.lockSha256 },
    cohort,
  );
  assert.equal(result.source, "matches-recorded-source");
  assert.equal(result.lock, "matches-recorded-lock");
  assert.equal(result.recipe.qualification, "unqualified");
  assert.equal(result.recipe.command, null);
  assert.throws(
    () =>
      validateCohortEvidence(
        {
          ...cohort.evidence,
          recipe: { ...cohort.evidence.recipe, qualification: "deno-free" },
        },
        cohort,
      ),
    /evidence/,
  );
});
test("source and lock changes keep historical CI explicit and cannot qualify current source", () => {
  const result = assessCohortEvidence(
    { sourceSha: "d".repeat(40), toolingLockSha256: "e".repeat(64) },
    cohort,
  );
  assert.equal(result.source, "source-changed");
  assert.equal(result.lock, "lock-changed");
  assert.equal(result.sourceCi.state, "same-source");
  assert.equal(result.sourceCi.currentSource, "different-current-source");
  assert.equal(result.recipe.qualification, "unqualified");
  assert.equal(assessCohortEvidence({ sourceSha }, cohort).lock, "unavailable");
  assert.equal(
    assessCohortEvidence({ sourceSha }, { sourceSha }).state,
    "unrecorded",
  );
});
test("mismatched CI source, malformed digests, missing resolved tools and unknown fields reject", () => {
  for (const change of [
    { manifestSha256: "bad" },
    { sourceCi: { ...cohort.evidence.sourceCi, sourceSha: "f".repeat(40) } },
    { resolved: {} },
    { arbitrary: "unsupported" },
  ])
    assert.throws(
      () => validateCohortEvidence({ ...cohort.evidence, ...change }, cohort),
      /evidence/,
    );
  validateCohortEvidence(
    {
      ...cohort.evidence,
      sourceCi: {
        ...cohort.evidence.sourceCi,
        state: "prior-source",
        sourceSha: "f".repeat(40),
      },
    },
    cohort,
  );
});
