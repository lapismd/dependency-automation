import assert from "node:assert/strict";
import test from "node:test";
import { renovateResultFailure } from "../src/renovate-result.mjs";

test("Renovate lockfile errors fail the coordinator runner", () => {
  assert.equal(
    renovateResultFailure(
      JSON.stringify({
        repository: "lapismd/lapis-plugins",
        result: "lockfile-error",
        msg: "Repository finished",
      }),
    ),
    "lapismd/lapis-plugins: lockfile-error",
  );
  assert.equal(
    renovateResultFailure(
      JSON.stringify({
        repository: "lapismd/lapis-plugins",
        result: "done",
        msg: "Repository finished",
      }),
    ),
    null,
  );
  assert.equal(renovateResultFailure("ordinary non-JSON output"), null);
});

test("Renovate artifact update errors fail even when the repository finishes done", () => {
  assert.equal(
    renovateResultFailure(
      JSON.stringify({
        repository: "lapismd/lapis-plugins",
        artifactErrors: [
          {
            stderr:
              "Canonical intake held: unadmitted first-party package metadata or identity",
          },
        ],
        msg: "artifactErrors",
      }),
    ),
    "lapismd/lapis-plugins: artifact-errors",
  );
  assert.equal(
    renovateResultFailure(
      JSON.stringify({
        repository: "lapismd/lapis-plugins",
        artifactErrors: [],
        msg: "artifactErrors",
      }),
    ),
    null,
  );
});
