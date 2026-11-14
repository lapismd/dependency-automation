import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import YAML from "yaml";

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
