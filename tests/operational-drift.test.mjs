import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  auditOperationalSource,
  requiredCheckCoverage,
  activationCoverage,
  validateOperationsPolicy,
  updateOwnership,
} from "../src/operational-drift.mjs";
const policy = JSON.parse(
  await readFile(new URL("../config/operations.json", import.meta.url)),
);
const pin = policy.actionPins["actions/setup-node"][0];
const workflow = {
  on: { pull_request: null },
  jobs: {
    check: { name: "Verify", steps: [{ uses: "./.github/actions/setup" }] },
  },
};
test("local composite recursion exposes hidden runtime and unpinned actions", async () => {
  const docs = {
    ".github/actions/setup/action.yml": {
      runs: {
        using: "composite",
        steps: [
          { uses: `actions/setup-node@${pin}`, with: { "node-version": "20" } },
          { uses: "denoland/setup-deno@v2" },
        ],
      },
    },
  };
  const result = await auditOperationalSource(
    workflow,
    async (path) => docs[path],
    policy,
  );
  assert(result.findings.some((f) => f.kind === "node-version-drift"));
  assert(result.findings.some((f) => f.kind === "deno-runtime-source-review"));
  assert(result.findings.some((f) => f.kind === "unpinned-action"));
  assert.equal(result.localActions, 1);
});
test("missing/cyclic actions and reusable workflows stay unknown, never clean", async () => {
  for (const doc of [
    undefined,
    {
      runs: {
        using: "composite",
        steps: [{ uses: "./.github/actions/setup" }],
      },
    },
  ]) {
    const result = await auditOperationalSource(
      workflow,
      async () => doc,
      policy,
    );
    assert(result.unknowns.length > 0);
  }
  const result = await auditOperationalSource(
    { jobs: { test: { uses: "owner/repo/.github/workflows/test.yml@abc" } } },
    async () => null,
    policy,
  );
  assert(
    result.unknowns.some(
      (f) => f.kind === "reusable-workflow-body-uninspected",
    ),
  );
});
test("pins and runtimes matching source contract pass while drift is explicit", async () => {
  const result = await auditOperationalSource(
    {
      jobs: {
        check: {
          steps: [
            {
              uses: `actions/setup-node@${pin}`,
              with: { "node-version": policy.nodeVersion },
            },
          ],
        },
      },
    },
    async () => null,
    policy,
  );
  assert.deepEqual(result.findings, []);
  const bad = await auditOperationalSource(
    {
      jobs: {
        check: { steps: [{ uses: `actions/setup-node@${"a".repeat(40)}` }] },
      },
    },
    async () => null,
    policy,
  );
  assert(bad.findings.some((f) => f.kind === "template-pin-drift"));
});
test("required checks are matched conservatively with unavailable and dynamic gaps", () => {
  const docs = [{ path: "ci.yml", workflow }];
  assert.equal(requiredCheckCoverage(docs, null, null).state, "unavailable");
  const good = requiredCheckCoverage(
    docs,
    { required_status_checks: { contexts: ["Verify"] } },
    [],
  );
  assert.equal(good.state, "source-candidates-matched");
  assert.equal(
    requiredCheckCoverage(
      docs,
      { required_status_checks: { contexts: ["Missing"] } },
      [],
    ).state,
    "source-coverage-gap",
  );
  assert.equal(
    requiredCheckCoverage(
      docs,
      { required_status_checks: { contexts: [] } },
      [],
    ).state,
    "no-requirements-observed",
  );
  assert.equal(
    requiredCheckCoverage(
      docs,
      { required_status_checks: { contexts: ["Verify"] } },
      null,
    ).state,
    "unavailable",
  );
  assert.equal(
    requiredCheckCoverage(
      [
        {
          workflow: { on: { push: null }, jobs: { check: { name: "Verify" } } },
        },
      ],
      { required_status_checks: { contexts: ["Verify"] } },
      [],
    ).state,
    "source-coverage-gap",
  );
});
test("activation and exclusion policy are explicit, sanitized and fail closed", () => {
  validateOperationsPolicy(policy);
  assert.throws(
    () =>
      validateOperationsPolicy({
        ...policy,
        updateOwners: { ...policy.updateOwners, security: "none" },
      }),
    /ownership/,
  );
  const settings = activationCoverage(
    {
      variables: [
        { name: "UNRELATED", value: "secret-like" },
        { name: "LAPIS_DEPENDENCY_WRITES", value: "invalid" },
      ],
    },
    policy,
  );
  assert.equal(settings.state, "drift");
  assert(!JSON.stringify(settings).includes("secret-like"));
  assert(!JSON.stringify(settings).includes("invalid"));
  assert.equal(activationCoverage(null, policy).state, "unavailable");
});
test("one version owner retains security-only updates without blanket ignores", () => {
  const ignores = ["@lapismd/*", "@lapis-notes/*"].map((name) => ({
    "dependency-name": name,
    "update-types": [
      "version-update:semver-major",
      "version-update:semver-minor",
      "version-update:semver-patch",
    ],
  }));
  assert.equal(
    updateOwnership({
      updates: [{ "package-ecosystem": "npm", ignore: ignores }],
    }).state,
    "source-configured",
  );
  assert.equal(
    updateOwnership({
      updates: [
        { "package-ecosystem": "npm", ignore: [{ "dependency-name": "*" }] },
      ],
    }).state,
    "drift",
  );
  assert.equal(updateOwnership(null).state, "unconfigured");
});
