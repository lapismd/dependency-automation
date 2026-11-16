import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import YAML from "yaml";
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
function auditEnvironment() {
  return {
    GITHUB_ACTIONS: "true",
    GITHUB_REPOSITORY: "lapismd/dependency-automation",
    GITHUB_REF: "refs/heads/main",
    GITHUB_SHA: "b".repeat(40),
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_WORKFLOW_REF:
      "lapismd/dependency-automation/.github/workflows/maintenance-audit.yml@refs/heads/main",
    ...policy.activation,
    UNRELATED_PRIVATE_VALUE: "must-never-escape",
  };
}
test("hosted activation uses observed Actions variables when its Variables API is unavailable", () => {
  const environment = auditEnvironment();
  const observed = activationCoverage(null, policy, environment);
  assert.equal(observed.state, "matches-checkpoint");
  assert.equal(observed.source, "github-actions-vars");
  assert.equal(observed.sourceSha, environment.GITHUB_SHA);
  assert.equal(observed.values.length, 5);
  assert(!JSON.stringify(observed).includes("must-never-escape"));
});
test("hosted activation rejects untrusted/incomplete contexts and sanitizes missing or invalid values", () => {
  for (const [name, value] of Object.entries({
    GITHUB_ACTIONS: "false",
    GITHUB_REPOSITORY: "other/repository",
    GITHUB_REF: "refs/heads/feature",
    GITHUB_SHA: "invalid",
    GITHUB_EVENT_NAME: "pull_request",
    GITHUB_WORKFLOW_REF:
      "lapismd/dependency-automation/.github/workflows/other.yml@refs/heads/main",
  }))
    assert.deepEqual(
      activationCoverage(null, policy, {
        ...auditEnvironment(),
        [name]: value,
      }),
      { state: "unavailable" },
      name,
    );
  const incomplete = auditEnvironment();
  delete incomplete.LAPIS_DEPENDENCY_WRITES;
  assert.equal(
    activationCoverage(null, policy, incomplete).state,
    "unavailable",
  );
  const invalid = activationCoverage(null, policy, {
    ...auditEnvironment(),
    LAPIS_DEPENDENCY_WRITES: "private-invalid-value",
    LAPIS_DEPENDENCY_WAVES: "",
  });
  assert.equal(invalid.state, "drift");
  assert.equal(
    invalid.values.find((v) => v.name.endsWith("WRITES")).value,
    "unrecognized",
  );
  assert.equal(
    invalid.values.find((v) => v.name.endsWith("WAVES")).value,
    "absent",
  );
  assert(!JSON.stringify(invalid).includes("private-invalid-value"));
  assert(!JSON.stringify(invalid).includes("must-never-escape"));
});
test("complete Variables API observations retain precedence over workflow context", () => {
  const variables = Object.entries(policy.activation).map(([name, value]) => ({
    name,
    value,
  }));
  const observed = activationCoverage(
    { total_count: variables.length, variables },
    policy,
    { ...auditEnvironment(), LAPIS_DEPENDENCY_WRITES: "true" },
  );
  assert.equal(observed.state, "matches-checkpoint");
  assert.equal(observed.source, "repository-variables-api");
  assert.equal(Object.hasOwn(observed, "sourceSha"), false);
});
test("hosted audit supplies actual allowlisted vars without granting settings or App authority", async () => {
  const workflow = YAML.parse(
    await readFile(
      new URL("../.github/workflows/maintenance-audit.yml", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(workflow.permissions, { contents: "read" });
  const step = workflow.jobs.audit.steps.find(
    (s) => s.run === "pnpm maintenance:audit",
  );
  for (const name of Object.keys(policy.activation))
    assert.equal(step.env[name], "${{ vars." + name + " }}");
  assert.deepEqual(
    Object.keys(step.env).sort(),
    ["GH_TOKEN", ...Object.keys(policy.activation)].sort(),
  );
  assert(
    !workflow.jobs.audit.steps.some((s) =>
      s.uses?.startsWith("actions/create-github-app-token@"),
    ),
  );
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
