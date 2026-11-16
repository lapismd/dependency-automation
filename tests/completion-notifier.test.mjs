import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("actual completion notifier dispatches through metadata only without candidate files or registry reads", async (t) => {
  const temporary = await mkdtemp(path.join(tmpdir(), "completion-notifier-"));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const repository = "lapismd/lapis-notes",
    sha = "a".repeat(40);
  const info = {
    id: 77,
    full_name: repository,
    fork: false,
    private: false,
    visibility: "public",
    archived: false,
    default_branch: "main",
  };
  const source = {
    id: 2001,
    run_attempt: 1,
    workflow_id: 344605360,
    path: ".github/workflows/lapis-ci.yml",
    head_sha: sha,
    event: "workflow_dispatch",
    head_branch: "main",
    repository: info,
    head_repository: info,
    status: "completed",
    conclusion: "success",
  };
  const callback = {
    id: 2002,
    run_attempt: 1,
    workflow_id: 2003,
    path: ".github/workflows/dependency-completed.yml",
    head_sha: sha,
    event: "workflow_run",
    head_branch: "main",
    repository: info,
    head_repository: info,
    status: "in_progress",
    conclusion: null,
    check_suite_id: 2004,
  };
  const eventFile = path.join(temporary, "event.json"),
    callsFile = path.join(temporary, "calls.json"),
    preload = path.join(temporary, "fetch.mjs");
  await writeFile(
    eventFile,
    JSON.stringify({
      action: "completed",
      repository: info,
      workflow_run: source,
    }),
  );
  const endpoints = {
    [`/repos/${repository}`]: info,
    [`/repos/${repository}/actions/workflows/344605360`]: {
      id: 344605360,
      path: source.path,
      state: "active",
    },
    [`/repos/${repository}/actions/runs/2001/attempts/1`]: source,
    [`/repos/${repository}/actions/runs/2001`]: source,
    [`/repos/${repository}/actions/workflows/dependency-completed.yml`]: {
      id: 2003,
      path: callback.path,
      state: "active",
    },
    [`/repos/${repository}/actions/runs/2002`]: callback,
    [`/repos/${repository}/branches/main`]: { commit: { sha } },
  };
  await writeFile(
    preload,
    `
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const endpoints=${JSON.stringify(endpoints)};
const calls=[];
globalThis.fetch=async(input,options={})=>{
  const url=new URL(input),method=options.method??'GET';
  calls.push({method,path:url.pathname,...(options.body?{body:JSON.parse(options.body)}:{})});
  writeFileSync(${JSON.stringify(callsFile)},JSON.stringify(calls));
  assert.equal(url.origin,'https://api.github.com');
  if(method==='POST'){
    assert.equal(url.pathname,'/repos/lapismd/dependency-automation/dispatches');
    assert.equal(new Headers(options.headers).get('authorization'),'Bearer coordinator-write-test');
    return new Response(null,{status:204});
  }
  assert.equal(method,'GET');
  assert.equal(new Headers(options.headers).get('authorization'),'Bearer source-read-test');
  assert(Object.hasOwn(endpoints,url.pathname),'Candidate files, trees, blobs and registry must never be read: '+url.pathname);
  return Response.json(endpoints[url.pathname]);
};
`,
  );
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      preload,
      fileURLToPath(new URL("../scripts/notify.mjs", import.meta.url)),
    ],
    {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      encoding: "utf8",
      env: {
        ...process.env,
        GH_TOKEN: "coordinator-write-test",
        SOURCE_READ_TOKEN: "source-read-test",
        SOURCE_REPOSITORY: repository,
        SOURCE_SHA: sha,
        SOURCE_EVENT_KIND: "completed",
        GITHUB_EVENT_NAME: "workflow_run",
        GITHUB_EVENT_PATH: eventFile,
        GITHUB_REPOSITORY: repository,
        GITHUB_REF: "refs/heads/main",
        GITHUB_SHA: sha,
        GITHUB_RUN_ID: "2002",
        GITHUB_RUN_ATTEMPT: "1",
      },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  const calls = JSON.parse(await readFile(callsFile, "utf8"));
  assert(!calls.some(({ path }) => /\/git\/|\/contents\//.test(path)));
  const writes = calls.filter((call) => call.method !== "GET");
  assert.deepEqual(writes, [
    {
      method: "POST",
      path: "/repos/lapismd/dependency-automation/dispatches",
      body: {
        event_type: "lapis-dependency-completed-v1",
        client_payload: {
          repository,
          sourceSha: sha,
          notification: { runId: 2002, runAttempt: 1 },
        },
      },
    },
  ]);
});
