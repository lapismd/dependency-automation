import assert from "node:assert/strict";
import test from "node:test";
import { loadAllowlist, loadPolicy } from "../src/github.mjs";
import {
  loadCompletionPolicy,
  validateCompletionPolicy,
  qualifyCompletion,
} from "../src/completion.mjs";
const repository = "lapismd/lapis-desktop";
const workflows = [
  {
    id: 400533153,
    path: ".github/workflows/ci.yml",
    events: ["pull_request", "push", "workflow_dispatch"],
  },
  {
    id: 403244157,
    path: ".github/workflows/publish-storybook-pages.yml",
    events: ["push", "workflow_dispatch"],
  },
];
const policy = () => ({
  schemaVersion: 1,
  callbackPath: ".github/workflows/dependency-completed.yml",
  heldObservers: [repository],
  repositories: { [repository]: structuredClone(workflows) },
});

test("explicit full-phase held observer retains its write hold and every unrelated entry", async () => {
  const entries = await loadAllowlist(),
    before = structuredClone(entries);
  const excluded = (await loadPolicy()).monitoring.excludedRepositories;
  assert.equal(
    validateCompletionPolicy(policy(), entries, excluded).heldObservers[0],
    repository,
  );
  assert.deepEqual(entries, before);
  assert(
    entries
      .find((e) => e.repository === repository)
      .holdReason.includes("Private Profile/API"),
  );
});

test("actual Desktop registration has only verified source CI and Pages and keeps held observation explicit", async () => {
  const value = await loadCompletionPolicy(await loadAllowlist());
  assert.deepEqual(value.repositories[repository], workflows);
  assert.deepEqual(value.heldObservers, [repository]);
});

test("default holds, unknown/missing/duplicate opt-ins and premature promotion fail closed", () => {
  const entries = [
    { repository, phase: "full", holdReason: "Private archive projection" },
  ];
  for (const change of [
    (p) => delete p.heldObservers,
    (p) => (p.heldObservers = ["lapismd/unknown"]),
    (p) => (p.heldObservers = [repository, repository]),
    (p) => (p.heldObservers = "all"),
    (p) => delete p.repositories[repository],
  ]) {
    const value = policy();
    change(value);
    assert.throws(
      () => validateCompletionPolicy(value, entries),
      /invalid-completion-policy/,
    );
  }
  assert.throws(
    () =>
      validateCompletionPolicy(policy(), [{ ...entries[0], phase: "pilot" }]),
    /invalid-completion-policy/,
  );
  assert.throws(
    () => validateCompletionPolicy(policy(), [{ repository, phase: "full" }]),
    /invalid-completion-policy/,
  );
});

test("excluded Deno, Community and Nostr roots cannot opt into held metadata callbacks", async () => {
  const excluded = (await loadPolicy()).monitoring.excludedRepositories;
  for (const repo of excluded) {
    const value = policy();
    value.heldObservers = [repo];
    value.repositories = { [repo]: workflows };
    assert.throws(
      () =>
        validateCompletionPolicy(
          value,
          [{ repository: repo, phase: "full", holdReason: "excluded" }],
          excluded,
        ),
      /invalid-completion-policy/,
    );
  }
});

test("Desktop schedules, preview/trial/image/health publishers and self triggers reject before API reads", async () => {
  for (const [id, path, event] of [
    [400533153, workflows[0].path, "schedule"],
    [400533153, workflows[0].path, "workflow_run"],
    [403244157, workflows[1].path, "pull_request"],
    [403578882, ".github/workflows/release-desktop.yml", "workflow_dispatch"],
    [408488749, ".github/workflows/trial-desktop.yml", "workflow_dispatch"],
    [405444351, ".github/workflows/ci-health.yml", "schedule"],
    [407613503, ".github/workflows/publish-ci-image.yml", "push"],
    [400533153, workflows[0].path + "@refs/heads/main", "push"],
  ]) {
    const result = await qualifyCompletion(
      {
        repository,
        eventName: "workflow_run",
        sha: "a".repeat(40),
        ref: "refs/heads/main",
        runId: 1,
        runAttempt: 1,
      },
      {
        action: "completed",
        workflow_run: {
          workflow_id: id,
          path,
          event,
          id: 2,
          run_attempt: 1,
          head_sha: "a".repeat(40),
        },
      },
      policy(),
      {
        fetcher: () => {
          throw Error("No request permitted");
        },
      },
    );
    assert.equal(result.eligible, false);
    assert.equal(result.reason, "source-workflow-not-allowed");
  }
});
