import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import YAML from "yaml";

test("App readiness uses existing credentials for read-only explicit pilot targets", async () => {
  const workflow = YAML.parse(
    await readFile(
      new URL("../.github/workflows/app-readiness.yml", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.deepEqual(workflow.on.workflow_dispatch.inputs.repository.options, [
    ".github",
    "lapis-plugins",
    "lapis-notes",
  ]);
  assert.equal(workflow.on.schedule, undefined);
  assert.match(workflow.jobs.readiness.if, /refs\/heads\/main/);
  const steps = workflow.jobs.readiness.steps;
  const app = steps.find((step) => step.id === "app");
  assert.equal(app.with.repositories, "${{ inputs.repository }}");
  assert.equal(app.with["permission-contents"], "read");
  assert.equal(app.with["permission-pull-requests"], "read");
  assert.equal(
    app.with["private-key"],
    "${{ secrets.LAPIS_DEPENDENCY_APP_PRIVATE_KEY }}",
  );
  const verify = steps.at(-1);
  assert.match(verify.run, /\.total_count == 1/);
  assert.equal((verify.run.match(/gh api --method GET/g) ?? []).length, 3);
  assert(!steps.some((step) => step.uses?.startsWith("actions/checkout@")));
  assert(
    !steps.some((step) =>
      /gh (?:pr|secret)|--method (?:POST|PUT|PATCH|DELETE)/.test(
        step.run ?? "",
      ),
    ),
  );
});

test("maintenance reporting has read-only authority and preserves partial reports", async () => {
  const workflow = YAML.parse(
    await readFile(
      new URL("../.github/workflows/maintenance-audit.yml", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.equal(workflow.on.schedule.length, 1);
  assert("workflow_dispatch" in workflow.on);
  const steps = workflow.jobs.audit.steps;
  assert(!steps.some((step) => step.uses?.includes("create-github-app-token")));
  const audit = steps.find((step) => step.run === "pnpm maintenance:audit");
  assert.deepEqual(audit.env, { GH_TOKEN: "${{ github.token }}" });
  const artifact = steps.find((step) =>
    step.uses?.startsWith("actions/upload-artifact@"),
  );
  assert.equal(artifact.if, "always()");
  assert.equal(artifact.with.path, "reports/maintenance-audit.json");
});

test("version PRs use scoped App authentication and retain the activation gate", async () => {
  const workflow = YAML.parse(
    await readFile(
      new URL("../templates/version-packages.yml", import.meta.url),
      "utf8",
    ),
  );
  const job = workflow.jobs.version;
  assert.match(job.if, /LAPIS_DEPENDENCY_VERSION_PR_ENABLED == 'true'/);
  assert.deepEqual(job.permissions, { contents: "read" });
  const app = job.steps.find((step) => step.id === "app");
  assert.equal(app.with.owner, "${{ github.repository_owner }}");
  assert.equal(app.with.repositories, "${{ github.event.repository.name }}");
  assert.equal(app.with["permission-contents"], "write");
  assert.equal(app.with["permission-pull-requests"], "write");
  const changesets = job.steps.find((step) =>
    step.uses?.startsWith("changesets/action@"),
  );
  assert.equal(changesets.env.GITHUB_TOKEN, "${{ steps.app.outputs.token }}");
  assert.equal(changesets.with.createGithubReleases, false);
  assert.equal(changesets.with.publish, undefined);
  const checkout = job.steps.find((step) =>
    step.uses?.startsWith("actions/checkout@"),
  );
  assert.equal(checkout.with["persist-credentials"], false);
  for (const step of job.steps) {
    if (step.uses) assert.match(step.uses, /@[a-f0-9]{40}$/);
  }
});

test("version preparation installs its Deno runtime before Changesets", async () => {
  const workflow = YAML.parse(
    await readFile(
      new URL("../templates/version-packages.yml", import.meta.url),
      "utf8",
    ),
  );
  const steps = workflow.jobs.version.steps;
  const runtime = steps.findIndex((step) =>
    step.uses?.startsWith("denoland/setup-deno@"),
  );
  const version = steps.findIndex((step) =>
    step.uses?.startsWith("changesets/action@"),
  );
  assert(
    runtime >= 0 && runtime < version,
    "Changesets 3 requires Deno on the runner PATH",
  );
  assert.equal(steps[runtime].with["deno-version"], "v2.9.7");
});
