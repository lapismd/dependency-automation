import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import YAML from "yaml";

test("profile generation is isolated from the central App writer", async () => {
  const workflow = YAML.parse(
    await readFile(
      new URL("../.github/workflows/profile-refresh.yml", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.equal(workflow.on.schedule.length, 1);
  const { prepare, publish } = workflow.jobs;
  assert.equal(publish.needs, "prepare");
  assert.match(prepare.if, /refs\/heads\/main/);
  assert.match(prepare.if, /LAPIS_PROFILE_REFRESH_ENABLED == 'true'/);
  assert.match(publish.if, /refs\/heads\/main/);
  assert(!JSON.stringify(prepare).includes("secrets."));
  assert(!JSON.stringify(prepare).includes("create-github-app-token"));
  const app = publish.steps.find((step) => step.id === "app");
  assert.equal(app.with.repositories, ".github");
  assert.equal(app.with["permission-contents"], "write");
  assert.equal(app.with["permission-pull-requests"], "write");
  assert(
    !publish.steps.some((step) =>
      /update-npm-status|pnpm|npm install/.test(step.run ?? ""),
    ),
  );
  for (const job of [prepare, publish]) {
    assert.equal(
      job.steps.find((step) => step.uses?.startsWith("actions/checkout@")).with[
        "persist-credentials"
      ],
      false,
    );
  }
  const download = publish.steps.find((step) =>
    step.uses?.startsWith("actions/download-artifact@"),
  );
  assert.equal(download.with["run-id"], undefined);
  assert.equal(download.with["github-token"], undefined);
});

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
    "lapis-ai",
    "lapis-server",
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
  assert.deepEqual(audit.env, {
    GH_TOKEN: "${{ github.token }}",
    LAPIS_DEPENDENCY_WRITES: "${{ vars.LAPIS_DEPENDENCY_WRITES }}",
    LAPIS_DEPENDENCY_PHASE: "${{ vars.LAPIS_DEPENDENCY_PHASE }}",
    LAPIS_DEPENDENCY_WAVES: "${{ vars.LAPIS_DEPENDENCY_WAVES }}",
    LAPIS_DEPENDENCY_SCHEDULE: "${{ vars.LAPIS_DEPENDENCY_SCHEDULE }}",
    LAPIS_DEPENDENCY_WAVE_STATE_WRITES:
      "${{ vars.LAPIS_DEPENDENCY_WAVE_STATE_WRITES }}",
  });
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

test("version preparation retains its pinned Node runtime and frozen install", async () => {
  const workflow = YAML.parse(
    await readFile(
      new URL("../templates/version-packages.yml", import.meta.url),
      "utf8",
    ),
  );
  const steps = workflow.jobs.version.steps;
  const runtime = steps.findIndex((step) =>
    step.uses?.startsWith("actions/setup-node@"),
  );
  const version = steps.findIndex((step) =>
    step.uses?.startsWith("changesets/action@"),
  );
  assert(
    runtime >= 0 && runtime < version,
    "Changesets uses the supported Node runtime",
  );
  assert.equal(steps[runtime].with["node-version"], "24.15.0");
});

test("wave admission gates the production matrix and isolates trusted-main state authority", async () => {
  const workflow = YAML.parse(
    await readFile(
      new URL("../.github/workflows/reconcile.yml", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.match(
    workflow.env.LAPIS_WAVES_ENABLED,
    /LAPIS_DEPENDENCY_WAVES == 'true'/,
  );
  assert.match(
    workflow.env.LAPIS_WAVE_STATE_WRITES,
    /LAPIS_DEPENDENCY_WAVE_STATE_WRITES == 'true'/,
  );
  assert.match(workflow.jobs.inventory.if, /refs\/heads\/main/);
  const state = workflow.jobs["wave-state"];
  assert.match(state.if, /refs\/heads\/main/);
  assert.match(state.if, /LAPIS_DEPENDENCY_WAVE_STATE_WRITES == 'true'/);
  assert.deepEqual(state.permissions, { contents: "write" });
  assert(!JSON.stringify(state).includes("secrets."));
  const download = state.steps.find((s) =>
    s.uses?.startsWith("actions/download-artifact@"),
  );
  assert.equal(download.with["run-id"], undefined);
  assert.equal(download.with["github-token"], undefined);
  const reconcile = workflow.jobs.reconcile;
  assert.deepEqual(reconcile.needs, ["inventory", "wave-state"]);
  assert.match(reconcile.if, /needs\.wave-state\.result == 'success'/);
  assert.match(reconcile.if, /LAPIS_DEPENDENCY_WAVES != 'true'/);
  const validate = reconcile.steps.findIndex(
    (s) => s.run === "node scripts/validate-wave-target.mjs",
  );
  const execute = reconcile.steps.findIndex((s) =>
    s.run?.endsWith("renovate.js"),
  );
  assert(validate > 0 && validate < execute);
});

test("generic notifier rejects completion calls before App minting", async () => {
  const workflow = YAML.parse(
    await readFile(
      new URL("../.github/workflows/notify.yml", import.meta.url),
      "utf8",
    ),
  );
  const steps = workflow.jobs.notify.steps;
  const app = steps.findIndex((step) => step.id === "app");
  assert(
    steps
      .slice(0, app)
      .some((step) =>
        step.run?.includes("Completion calls require completion.yml"),
      ),
    "a completion call must use the verified workflow_run boundary before any App token is minted",
  );
});

test("completion workflow verifies before minting and executes only pinned coordinator code", async () => {
  const workflow = YAML.parse(
    await readFile(
      new URL("../.github/workflows/completion.yml", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(workflow.permissions, {
    contents: "read",
    actions: "read",
    "pull-requests": "read",
  });
  assert.deepEqual(Object.keys(workflow.on), ["workflow_call"]);
  const { notify } = workflow.jobs;
  assert.match(notify.if, /workflow_run/);
  const steps = notify.steps;
  const qualify = steps.findIndex((step) => step.id === "qualify");
  const app = steps.findIndex((step) => step.id === "app");
  assert(qualify >= 0 && qualify < app);
  assert.equal(steps[qualify].run, "node scripts/qualify-completion.mjs");
  assert.match(steps[app].if, /qualify.outputs.eligible == 'true'/);
  assert.equal(steps[app].with.repositories, "dependency-automation");
  assert.equal(steps[app].with["permission-contents"], "write");
  assert(!("permission-pull-requests" in steps[app].with));
  const checkout = steps.find((step) =>
    step.uses?.startsWith("actions/checkout@"),
  );
  assert.equal(checkout.with.repository, "lapismd/dependency-automation");
  assert.equal(checkout.with.ref, "${{ inputs.automation-ref }}");
  assert.equal(checkout.with["persist-credentials"], false);
  assert(
    steps.findIndex((step) => step.env?.AUTOMATION_REF) <
      steps.indexOf(checkout),
  );
  assert(
    steps.some((step) =>
      step.run?.includes("--prod --frozen-lockfile --ignore-scripts"),
    ),
  );
  assert(
    !steps.some(
      (step) => step.uses?.includes("artifact") || step.uses?.includes("cache"),
    ),
  );
  assert(
    !steps.some(
      (step) =>
        step.with?.ref?.includes("head_sha") ||
        step.with?.ref?.includes("head.ref"),
    ),
  );
  assert.equal(steps.at(-1).run, "node scripts/notify.mjs");
  const script = await readFile(
    new URL("../scripts/notify.mjs", import.meta.url),
    "utf8",
  );
  assert(
    script.indexOf("await currentCompletion()") <
      script.indexOf("const response = await fetch("),
  );
});

test("prepared Notes callback runs from workflow_run only without self loops or inherited secrets", async () => {
  const guide = await readFile(
    new URL("../docs/completion-adoption.md", import.meta.url),
    "utf8",
  );
  const example = YAML.parse(guide.match(/```yaml\n([\s\S]+?)```/)[1]);
  assert.deepEqual(Object.keys(example.on), ["workflow_run"]);
  assert.deepEqual(example.on.workflow_run.types, ["completed"]);
  assert(!example.on.workflow_run.workflows.includes(example.name));
  assert.equal(example.concurrency, undefined);
  assert.deepEqual(example.permissions, {
    contents: "read",
    actions: "read",
    "pull-requests": "read",
  });
  assert.equal(
    example.jobs.notify.uses,
    "lapismd/dependency-automation/.github/workflows/completion.yml@REVIEWED_COORDINATOR_COMMIT",
  );
  assert.equal(
    example.jobs.notify.with["automation-ref"],
    "REVIEWED_COORDINATOR_COMMIT",
  );
  assert.deepEqual(example.jobs.notify.secrets, {
    "app-private-key": "${{ secrets.LAPIS_DEPENDENCY_APP_PRIVATE_KEY }}",
  });
  assert(!JSON.stringify(example).includes("artifacts"));
});

test("publication readers and offline verification use the exact owned standard CLI preparation", async () => {
  const { tool } = JSON.parse(
    await readFile(new URL("../config/publications.json", import.meta.url)),
  );
  for (const [file, job] of [
    ["check.yml", "check"],
    ["pages.yml", "book"],
    ["reconcile.yml", "inventory"],
  ]) {
    const workflow = YAML.parse(
      await readFile(
        new URL(`../.github/workflows/${file}`, import.meta.url),
        "utf8",
      ),
    );
    const steps = workflow.jobs[job].steps;
    const setup = steps.findIndex(
      (s) => s.uses === `lapismd/lapis-ci/actions/setup-gh@${tool.setupRef}`,
    );
    assert(
      setup > 0 && setup < steps.findIndex((s) => s.run === "pnpm verify"),
    );
    assert.equal(steps[setup].env, undefined);
    assert(!steps.some((s) => s.uses?.includes("cosign")));
  }
});

test("publication access stays in the existing Notes-only read App boundary", async () => {
  const workflow = YAML.parse(
    await readFile(
      new URL("../.github/workflows/reconcile.yml", import.meta.url),
      "utf8",
    ),
  );
  const reader = workflow.jobs.inventory.steps.find(
    (s) => s.id === "publication-reader",
  );
  assert.match(workflow.jobs.inventory.if, /refs\/heads\/main/);
  assert.match(reader.if, /LAPIS_WAVES_ENABLED == 'true'/);
  assert.match(reader.if, /publication-audit.outcome == 'success'/);
  assert.match(reader.if, /publication-capability.outputs.eligible == 'true'/);
  const capability = workflow.jobs.inventory.steps.find(
    (s) => s.id === "publication-capability",
  );
  assert.match(
    capability.run,
    /gh api --method GET apps\/lapismd-dependency-bot/,
  );
  assert.match(capability.run, /client_id == \$id/);
  assert(!JSON.stringify(capability).includes("private-key"));
  assert(!JSON.stringify(capability).includes("PATCH"));
  const auditIndex = workflow.jobs.inventory.steps.findIndex(
    (s) => s.id === "publication-audit",
  );
  assert(
    auditIndex <
      workflow.jobs.inventory.steps.findIndex(
        (s) => s.id === "publication-reader",
      ),
  );
  assert.equal(
    workflow.jobs.inventory.steps[auditIndex].run,
    "node scripts/audit-preflight.mjs",
  );
  assert.equal(reader["continue-on-error"], true);
  assert.equal(reader.with.repositories, "lapis-notes");
  assert.equal(reader.with.owner, "lapismd");
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(reader.with).filter(([k]) => k.startsWith("permission-")),
    ),
    { "permission-contents": "read", "permission-actions": "read" },
  );
  assert.equal(
    reader.with["private-key"],
    "${{ secrets.LAPIS_DEPENDENCY_APP_PRIVATE_KEY }}",
  );
  const env = workflow.jobs.inventory.steps.find(
    (s) => s.id === "inventory",
  ).env;
  assert.equal(env.GH_TOKEN, "${{ github.token }}");
  assert.equal(
    env.LAPIS_PUBLICATION_READ_TOKEN,
    "${{ steps.publication-reader.outputs.token }}",
  );
  assert(
    !JSON.stringify(workflow.jobs["wave-state"]).includes("publication-reader"),
  );
});
