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
