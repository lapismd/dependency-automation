import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  loadCompletionPolicy,
  qualifyCompletion,
  settleCompletion,
  validateCompletionPolicy,
} from "../src/completion.mjs";
import { validateCompletion } from "../src/policy.mjs";
import { qualification } from "../src/wave-evidence.mjs";
import { inventory } from "../src/github.mjs";

const repository = "lapismd/lapis-notes",
  main = "a".repeat(40),
  head = "b".repeat(40);
const entries = [{ repository, phase: "pilot" }];
const identity = { id: 1, full_name: repository, fork: false };
const policy = {
  schemaVersion: 1,
  callbackPath: ".github/workflows/dependency-completed.yml",
  repositories: {
    [repository]: [
      {
        id: 7,
        path: ".github/workflows/ci.yml",
        events: ["pull_request", "push", "workflow_dispatch"],
      },
    ],
  },
};
const context = {
  repository,
  eventName: "workflow_run",
  ref: "refs/heads/main",
  sha: main,
  runId: 100,
  runAttempt: 2,
};
function fixture(eventKind = "pull_request") {
  const run = {
    id: 10,
    run_attempt: 3,
    workflow_id: 7,
    path: ".github/workflows/ci.yml",
    head_sha: eventKind === "pull_request" ? head : main,
    head_branch:
      eventKind === "pull_request"
        ? "lapis-dependencies/lapis-first-party"
        : "main",
    event: eventKind,
    status: "completed",
    conclusion: "success",
    repository: identity,
    head_repository: identity,
    pull_requests: [{ number: 4 }],
  };
  const callback = {
    id: 100,
    run_attempt: 2,
    workflow_id: 8,
    check_suite_id: 11,
    path: policy.callbackPath,
    head_sha: main,
    head_branch: "main",
    event: "workflow_run",
    status: "in_progress",
    conclusion: null,
    repository: identity,
    head_repository: identity,
  };
  const info = {
    ...identity,
    private: false,
    visibility: "public",
    archived: false,
    default_branch: "main",
  };
  const pr = {
    number: 4,
    state: "open",
    merged: false,
    base: { ref: "main", repo: identity },
    head: { sha: head, ref: run.head_branch, repo: identity },
  };
  const event = {
    action: "completed",
    repository: identity,
    workflow_run: structuredClone(run),
  };
  const calls = [];
  let pullReads = 0,
    branchReads = 0;
  const f = {
    run,
    callback,
    info,
    pr,
    event,
    calls,
    callbackChecks: [
      { status: "in_progress", conclusion: null, head_sha: main },
    ],
    onPull: null,
    onBranch: null,
    onRequest: null,
  };
  f.fetcher = async (url, options) => {
    const path = new URL(url).pathname;
    calls.push({ url, options });
    f.onRequest?.(path);
    let value;
    if (path.endsWith("/actions/workflows/7"))
      value = {
        id: 7,
        path: policy.repositories[repository][0].path,
        state: "active",
      };
    else if (path.endsWith("/actions/workflows/dependency-completed.yml"))
      value = { id: 8, path: policy.callbackPath, state: "active" };
    else if (path.endsWith("/actions/runs/100")) value = callback;
    else if (path.endsWith("/check-suites/11/check-runs"))
      value = {
        total_count: f.callbackChecks.length,
        check_runs: f.callbackChecks,
      };
    else if (
      path.endsWith("/actions/runs/10/attempts/3") ||
      path.endsWith("/actions/runs/10")
    )
      value = run;
    else if (path.endsWith("/pulls/4")) {
      f.onPull?.(++pullReads);
      value = pr;
    } else if (path.endsWith("/branches/main")) {
      f.onBranch?.(++branchReads);
      value = { commit: { sha: f.branchSha ?? main } };
    } else if (path.endsWith("/lapis-notes")) value = info;
    else throw Error(`Unexpected API path ${path}`);
    return { ok: true, status: 200, json: async () => structuredClone(value) };
  };
  return f;
}
const qualify = (f, changes = {}) =>
  qualifyCompletion({ ...context, ...changes }, f.event, policy, {
    fetcher: f.fetcher,
  });

test("verified PR completion reads exact attempt, latest run, callback and current PR twice without writes", async () => {
  const f = fixture();
  assert.deepEqual(await qualify(f), {
    eligible: true,
    reason: "verified-current-completion",
    repository,
    sourceSha: head,
    notification: { runId: 100, runAttempt: 2 },
  });
  assert.equal(f.calls.filter((c) => c.url.endsWith("/pulls/4")).length, 2);
  assert(f.calls.some((c) => c.url.endsWith("/attempts/3")));
  assert(f.calls.every((c) => c.options.method === undefined));
  assert(
    f.calls.every((c) => !/artifacts|contents|git\/trees|zip/.test(c.url)),
  );
});

test("successful current default branch push and manual runs may wake reconciliation", async () => {
  for (const kind of ["push", "workflow_dispatch"]) {
    const f = fixture(kind);
    assert.equal((await qualify(f)).sourceSha, main);
    assert.equal(
      f.calls.filter((c) => c.url.endsWith("/branches/main")).length,
      2,
    );
  }
});

for (const [name, mutate, expected] of [
  [
    "failed event",
    (f) => {
      f.event.workflow_run.conclusion = "failure";
    },
    "source-run-not-successful",
  ],
  [
    "failed actual run",
    (f) => {
      f.run.conclusion = "failure";
    },
    "source-run-not-successful",
  ],
  [
    "unfinished run",
    (f) => {
      f.run.status = "in_progress";
    },
    "source-run-not-successful",
  ],
  [
    "unknown workflow ID",
    (f) => {
      f.event.workflow_run.workflow_id = 999;
    },
    "source-workflow-not-allowed",
  ],
  [
    "extra workflow path",
    (f) => {
      f.event.workflow_run.path += "@refs/heads/main";
    },
    "source-workflow-not-allowed",
  ],
  [
    "traversal workflow path",
    (f) => {
      f.event.workflow_run.path = ".github/workflows/../ci.yml";
    },
    "source-workflow-not-allowed",
  ],
  [
    "unknown workflow event",
    (f) => {
      f.event.workflow_run.event = "workflow_run";
    },
    "source-workflow-not-allowed",
  ],
  [
    "fork run head",
    (f) => {
      f.run.head_repository = { ...identity, fork: true };
    },
    "run-identity-mismatch",
  ],
  [
    "other repository head",
    (f) => {
      f.run.head_repository = {
        ...identity,
        id: 9,
        full_name: "outsider/notes",
      };
    },
    "run-identity-mismatch",
  ],
  [
    "private repository",
    (f) => {
      f.info.private = true;
      f.info.visibility = "private";
    },
    "source-not-public",
  ],
  [
    "unknown visibility",
    (f) => {
      delete f.info.visibility;
    },
    "source-not-public",
  ],
  [
    "stale attempt",
    (f) => {
      f.run.run_attempt++;
    },
    "run-identity-mismatch",
  ],
  [
    "stale SHA",
    (f) => {
      f.run.head_sha = "c".repeat(40);
    },
    "run-identity-mismatch",
  ],
  [
    "missing associated PR",
    (f) => {
      f.run.pull_requests = [];
    },
    "current-pr-unknown",
  ],
  [
    "closed PR",
    (f) => {
      f.pr.state = "closed";
    },
    "source-head-moved",
  ],
  [
    "fork PR",
    (f) => {
      f.pr.head.repo = { ...identity, fork: true };
    },
    "source-head-moved",
  ],
  [
    "stale PR head",
    (f) => {
      f.pr.head.sha = "c".repeat(40);
    },
    "source-head-moved",
  ],
  [
    "wrong PR base",
    (f) => {
      f.pr.base.ref = "release";
    },
    "source-head-moved",
  ],
  [
    "wrong callback event",
    (f) => {
      f.callback.event = "workflow_dispatch";
    },
    "callback-identity-mismatch",
  ],
  [
    "callback path suffix",
    (f) => {
      f.callback.path += "@main";
    },
    "callback-identity-mismatch",
  ],
  [
    "callback rerun",
    (f) => {
      f.callback.run_attempt++;
    },
    "callback-identity-mismatch",
  ],
  [
    "callback not current trusted context SHA",
    (f) => {
      f.callback.head_sha = head;
    },
    "untrusted-completion-context",
  ],
])
  test(`completion rejects ${name}`, async () => {
    const f = fixture();
    mutate(f);
    assert.deepEqual(await qualify(f), { eligible: false, reason: expected });
  });

test("completion rejects untrusted wrapper context before source reads", async () => {
  for (const changes of [
    { eventName: "pull_request" },
    { repository: "outsider/notes" },
    { runId: NaN },
    { sha: "main" },
  ]) {
    const f = fixture();
    assert.equal((await qualify(f, changes)).eligible, false);
    assert.equal(f.calls.length, 0);
  }
  assert.equal(
    (await qualify(fixture(), { ref: "refs/heads/candidate" })).eligible,
    false,
  );
});

test("late PR/default branch moves and reruns are rejected after early valid evidence", async () => {
  const pr = fixture();
  pr.onPull = (n) => {
    if (n === 2) pr.pr.head.sha = "c".repeat(40);
  };
  assert.equal((await qualify(pr)).reason, "source-head-moved");
  const branch = fixture("push");
  branch.onBranch = (n) => {
    if (n === 2) branch.branchSha = head;
  };
  assert.equal((await qualify(branch)).reason, "source-head-moved");
  const rerun = fixture();
  rerun.onRequest = (p) => {
    if (p.endsWith("/actions/runs/10")) rerun.run.run_attempt++;
  };
  assert.equal((await qualify(rerun)).reason, "run-identity-mismatch");
});

test("unavailable or malformed API evidence never qualifies", async () => {
  const f = fixture();
  for (const fetcher of [
    async () => ({ ok: false, status: 403 }),
    async () => {
      throw Error("Network timeout");
    },
    async () => ({ ok: true, status: 200, json: async () => ({}) }),
  ]) {
    assert.equal(
      (await qualifyCompletion(context, f.event, policy, { fetcher })).eligible,
      false,
    );
  }
});

test("policy rejects widening scope, duplicate IDs, unknown paths/events and self loops", async () => {
  assert.equal(validateCompletionPolicy(policy, entries), policy);
  assert(
    await loadCompletionPolicy([
      ...entries,
      { repository: "lapismd/mira-mde", phase: "pilot" },
      { repository: "lapismd/design-core", phase: "pilot" },
      { repository: "lapismd/lapis-plugins", phase: "pilot" },
    ]),
  );
  for (const mutate of [
    (p) => {
      p.repositories["outsider/notes"] = p.repositories[repository];
    },
    (p) => {
      p.repositories[repository].push(p.repositories[repository][0]);
    },
    (p) => {
      p.repositories[repository][0].path = p.callbackPath;
    },
    (p) => {
      p.repositories[repository][0].path += "/extra";
    },
    (p) => {
      p.repositories[repository][0].events = ["workflow_run"];
    },
    (p) => {
      p.repositories[repository][0].execute = "candidate";
    },
  ]) {
    const p = structuredClone(policy);
    mutate(p);
    assert.throws(
      () => validateCompletionPolicy(p, entries),
      /invalid-completion-policy/,
    );
  }
});

const hint = {
  repository,
  sourceSha: head,
  notification: { runId: 100, runAttempt: 2 },
};
test("last callback settles before scanning so its own check never strands qualification", async () => {
  const f = fixture();
  const evidence = {
    sha: main,
    expected: [7],
    runs: [fixture("push").run],
    checks: [{ name: "notify", status: "in_progress", conclusion: null }],
    statuses: [],
  };
  assert.equal(qualification(evidence, main).state, "waiting");
  let sleeps = 0;
  await settleCompletion(hint, policy, {
    fetcher: f.fetcher,
    attempts: 2,
    sleep: async () => {
      sleeps++;
      f.callback.status = "completed";
      f.callback.conclusion = "success";
      f.callbackChecks[0] = {
        status: "completed",
        conclusion: "success",
        head_sha: main,
      };
      evidence.checks[0] = {
        name: "notify",
        status: "completed",
        conclusion: "success",
      };
    },
  });
  assert.equal(sleeps, 1);
  assert.equal(qualification(evidence, main).state, "qualified");
  // Other late product lanes remain gates; there is no notification exemption.
  evidence.checks.push({
    name: "late PWA",
    status: "in_progress",
    conclusion: null,
  });
  assert.equal(qualification(evidence, main).state, "waiting");
});

test("settlement rejects failed, rerun, foreign, unknown and never-settled callbacks", async () => {
  for (const mutate of [
    (f) => {
      f.callback.status = "completed";
      f.callback.conclusion = "failure";
    },
    (f) => {
      f.callback.run_attempt++;
    },
    (f) => {
      f.callback.head_repository = { ...identity, id: 2 };
    },
    (f) => {
      f.callback.path = ".github/workflows/product.yml";
    },
    (f) => {
      f.callback.status = "mystery";
    },
    () => {},
  ]) {
    const f = fixture();
    mutate(f);
    await assert.rejects(
      settleCompletion(hint, policy, { fetcher: f.fetcher, attempts: 1 }),
      /callback-/,
    );
  }
});

test("completion identity retains only bounded documented fields", () => {
  assert.deepEqual(
    validateCompletion(
      {
        ...hint,
        notification: { ...hint.notification, token: "discard" },
        status: "success",
        revision: "unmerged",
      },
      entries,
    ),
    hint,
  );
  for (const notification of [
    { runId: "100", runAttempt: 1 },
    { runId: 1, runAttempt: 0 },
    { runId: 2 ** 54, runAttempt: 1 },
  ])
    assert.throws(
      () => validateCompletion({ ...hint, notification }, entries),
      /Invalid completion/,
    );
});

test("PR head notification cannot replace the default branch source graph", async () => {
  const f = fixture();
  const verified = await qualify(f);
  assert.equal(verified.sourceSha, head);
  const reads = [];
  const fetcher = async (url) => {
    reads.push(url);
    let data;
    if (url.endsWith("/lapis-notes"))
      data = {
        ...identity,
        default_branch: "main",
        private: false,
        visibility: "public",
        archived: false,
      };
    else if (url.endsWith("/branches/main")) data = { commit: { sha: main } };
    else if (url.includes("/git/trees/"))
      data = { tree: [{ type: "blob", path: "package.json" }] };
    else if (url.includes("/contents/package.json"))
      data = {
        content: Buffer.from(
          JSON.stringify({ private: true, name: "notes" }),
        ).toString("base64"),
      };
    else throw Error("Unexpected source read");
    return { ok: true, status: 200, json: async () => data };
  };
  const graph = await inventory(entries, { publicOnly: true, fetcher });
  assert.equal(graph.repositories[0].sourceSha, main);
  assert(!reads.some((url) => url.includes(head)));
  const source = await readFile(
    new URL("../scripts/inventory.mjs", import.meta.url),
    "utf8",
  );
  assert(
    source.indexOf("await settleCompletion") <
      source.indexOf("await inventory(entries"),
  );
  assert(!/revision:\s*hint/.test(source));
});

test("completed callback run waits for its own check API to settle before the last scan", async () => {
  const f = fixture();
  f.callback.status = "completed";
  f.callback.conclusion = "success";
  let sleeps = 0;
  await settleCompletion(hint, policy, {
    fetcher: f.fetcher,
    attempts: 2,
    sleep: async () => {
      sleeps++;
      f.callbackChecks[0] = {
        status: "completed",
        conclusion: "success",
        head_sha: main,
      };
    },
  });
  assert.equal(sleeps, 1);
});

test("callback check coverage is bounded, exact and never treats unknown or failed rows as settled", async () => {
  for (const checks of [
    [],
    [{ status: "completed", conclusion: "failure", head_sha: main }],
    [{ status: "completed", conclusion: "success", head_sha: head }],
    Array.from({ length: 101 }, () => ({
      status: "completed",
      conclusion: "success",
      head_sha: main,
    })),
  ]) {
    const f = fixture();
    f.callback.status = "completed";
    f.callback.conclusion = "success";
    f.callbackChecks = checks;
    await assert.rejects(
      settleCompletion(hint, policy, { fetcher: f.fetcher, attempts: 1 }),
      /callback-check-/,
    );
  }
});
