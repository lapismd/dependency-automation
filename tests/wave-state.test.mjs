import test from "node:test";
import assert from "node:assert/strict";
import {
  readWaveState,
  publishWaveState,
  stateRepository,
  stateBranch,
} from "../src/wave-state.mjs";
import { emptyState, identity } from "../src/waves.mjs";
function store() {
  const objects = new Map(),
    calls = [];
  let revision = null,
    seq = 0;
  let uncertain = false,
    conflict = false,
    fail = null;
  const fetcher = async (url, options = {}) => {
    const path = new URL(url).pathname.replace(`/repos/${stateRepository}`, "");
    const method = options.method ?? "GET";
    calls.push({
      method,
      path,
      body: options.body ? JSON.parse(options.body) : null,
    });
    const response = (data, status = 200) => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => data,
    });
    if (method === "GET") {
      if (path.startsWith("/git/ref/"))
        return revision
          ? response({ object: { sha: revision } })
          : response(null, 404);
      return response(objects.get(path.split("/").at(-1)));
    }
    if (fail === path) return response(null, 503);
    const body = JSON.parse(options.body);
    if (path.startsWith("/git/refs")) {
      if (conflict) return response(null, 422);
      revision = body.sha;
      if (uncertain) throw Error("network timeout after accepted write");
      return response({ object: { sha: revision } });
    }
    const sha = String(++seq).padStart(40, "0");
    const value = path.endsWith("/blobs")
      ? { content: Buffer.from(body.content).toString("base64") }
      : path.endsWith("/trees")
        ? { tree: body.tree }
        : { tree: { sha: body.tree }, parents: body.parents };
    objects.set(sha, value);
    return response({ sha });
  };
  return {
    fetcher,
    calls,
    setUncertain: () => {
      uncertain = true;
    },
    setConflict: () => {
      conflict = true;
    },
    setFailure: (path) => {
      fail = path;
    },
    revision: () => revision,
  };
}
const candidate = () => ({
  ...emptyState(),
  generation: 1,
  policyRevision: "a".repeat(40),
  observedAt: "2026-11-15T22:00:00Z",
});
const options = (s, state) => {
  const report = {
    schemaVersion: 1,
    kind: "lapis-dependency-waves",
    policyRevision: state.policyRevision,
    generation: state.generation,
    nodes: [],
    coverage: [],
  };
  report.reportId = identity(report);
  return {
    fetcher: s.fetcher,
    enabled: true,
    repository: stateRepository,
    ref: "refs/heads/main",
    event: "workflow_dispatch",
    report,
  };
};

test("state absent defaults read-only; explicit trusted-main gate precedes any write", async () => {
  const s = store();
  assert.deepEqual(await readWaveState({ fetcher: s.fetcher }), {
    revision: null,
    state: emptyState(),
  });
  for (const override of [
    { enabled: false },
    { ref: "refs/heads/feature" },
    { event: "pull_request" },
    { repository: "lapismd/other" },
  ])
    await assert.rejects(
      publishWaveState(candidate(), null, {
        ...options(s, candidate()),
        ...override,
      }),
      /trusted-main/,
    );
  assert(s.calls.every((c) => c.method === "GET"));
});

test("state and UI report publish atomically only on dedicated branch, with verified read-back", async () => {
  const s = store(),
    state = candidate();
  const result = await publishWaveState(state, null, options(s, state));
  assert.equal(result.status, "accepted");
  assert.deepEqual((await readWaveState({ fetcher: s.fetcher })).state, state);
  const create = s.calls.find((c) => c.path === "/git/refs");
  assert.equal(create.body.ref, `refs/heads/${stateBranch}`);
  assert.deepEqual(
    s.calls.find((c) => c.path === "/git/trees").body.tree.map((f) => f.path),
    ["waves.json", "report.json"],
  );
});

test("optimistic generation and revision conflicts perform zero writes", async () => {
  const s = store();
  const state = candidate();
  await publishWaveState(state, null, options(s, state));
  const writes = s.calls.filter((c) => c.method !== "GET").length;
  await assert.rejects(
    publishWaveState(
      { ...state, generation: 2 },
      null,
      options(s, { ...state, generation: 2 }),
    ),
    /conflict/,
  );
  await assert.rejects(
    publishWaveState(state, s.revision(), options(s, state)),
    /conflict/,
  );
  assert.equal(s.calls.filter((c) => c.method !== "GET").length, writes);
});

test("subsequent state update is fast-forward-only from expected parent", async () => {
  const s = store();
  const state = candidate();
  await publishWaveState(state, null, options(s, state));
  const expected = s.revision(),
    next = { ...state, generation: 2 };
  await publishWaveState(next, expected, options(s, next));
  const patch = s.calls.find((c) => c.method === "PATCH");
  assert.equal(patch.body.force, false);
  assert.deepEqual(
    s.calls.filter((c) => c.path === "/git/commits").at(-1).body.parents,
    [expected],
  );
});

test("uncertain accepted ref write is reconciled once without retry", async () => {
  const s = store();
  s.setUncertain();
  const state = candidate();
  const result = await publishWaveState(state, null, options(s, state));
  assert.equal(result.status, "accepted-after-readback");
  assert.equal(s.calls.filter((c) => c.path === "/git/refs").length, 1);
});

test("conflicting ref and partial object failures never retry or publish consumer admission", async () => {
  for (const failure of ["conflict", "blob"]) {
    const s = store();
    if (failure === "conflict") s.setConflict();
    else s.setFailure("/git/blobs");
    const state = candidate();
    await assert.rejects(
      publishWaveState(state, null, options(s, state)),
      /reconcile|Uncertain/,
    );
    assert.equal(s.revision(), null);
    assert(s.calls.filter((c) => c.path === "/git/refs").length <= 1);
  }
});
