import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { discoverRepository, inventory } from "../src/github.mjs";
import { observeRepository, verifyHint, pages } from "../src/wave-evidence.mjs";
import { validateCompletion } from "../src/policy.mjs";
const sha = "a".repeat(40),
  repo = { repository: "lapismd/source", phase: "pilot" };
const ok = (data) => ({ ok: true, status: 200, json: async () => data });
const blob = (value) => ({ content: Buffer.from(value).toString("base64") });

test("private and unclassified scopes are opaque coverage holds before reading source", async () => {
  for (const visibility of [{ private: true }, {}]) {
    const calls = [];
    const fetcher = async (url) => {
      calls.push(url);
      return ok({ default_branch: "main", ...visibility });
    };
    const graph = await inventory([repo], {
      publicOnly: true,
      waveEvidence: true,
      fetcher,
    });
    assert.equal(graph.repositories.length, 0);
    assert.equal(graph.coverage.length, 1);
    assert.match(graph.coverage[0].opaqueId, /^[a-f0-9]{64}$/);
    assert(!JSON.stringify(graph).includes(repo.repository));
    assert.equal(calls.length, 1);
  }
});

test("unavailable public coverage discards API body and repository name", async () => {
  const graph = await inventory([repo], {
    publicOnly: true,
    fetcher: async () => ({ ok: false, status: 403 }),
  });
  assert.equal(graph.coverage.length, 1);
  assert(!JSON.stringify(graph).includes(repo.repository));
});

test("exact git blobs support lockfiles larger than Contents limit", async () => {
  const calls = [];
  const manifestContent = '{ "name": "source", "private": true }\n';
  const lockContent = `# ${"x".repeat(1024 * 1024)}\nlockfileVersion: '9.0'\nimporters:\n  .: {}\n`;
  const fetcher = async (url) => {
    calls.push(url);
    const path = new URL(url).pathname;
    if (path.endsWith("/source"))
      return ok({ private: false, default_branch: "main" });
    if (path.includes("/branches/")) return ok({ commit: { sha } });
    if (path.includes("/git/trees/"))
      return ok({
        tree: [
          { type: "blob", path: "package.json", sha: "manifest" },
          { type: "blob", path: "pnpm-lock.yaml", sha: "lock" },
          {
            type: "blob",
            path: ".github/workflows/check.yml",
            sha: "workflow",
          },
        ],
      });
    if (path.endsWith("/manifest")) return ok(blob(manifestContent));
    if (path.endsWith("/lock")) return ok(blob(lockContent));
    return ok(blob("on: [push, pull_request]\njobs: {}\n"));
  };
  const result = await discoverRepository(repo, {
    publicOnly: true,
    waveEvidence: true,
    toolingEvidence: true,
    fetcher,
  });
  assert.equal(result.lock.lockfileVersion, "9.0");
  for (const [field, content] of [
    ["toolingManifestSha256", manifestContent],
    ["toolingLockSha256", lockContent],
  ])
    assert.equal(
      result[field],
      createHash("sha256").update(content).digest("hex"),
    );
  assert.deepEqual(result.pushWorkflows, [".github/workflows/check.yml"]);
  assert(calls.some((u) => u.includes(`/git/trees/${sha}`)));
  assert(!calls.some((u) => u.includes("/contents/")));
});

test("partial observation and incomplete pagination cannot qualify", async () => {
  const observed = await observeRepository(
    { ...repo, sourceSha: sha },
    { fetcher: async () => ({ ok: false, status: 503 }) },
  );
  assert.equal(observed.incomplete, true);
  assert.equal(observed.qualification.state, "unknown");
  await assert.rejects(
    pages(
      "https://api.github.com/x",
      { fetcher: async () => ok({ wrong: [] }) },
      "items",
    ),
    /Invalid paginated/,
  );
});

function sourceFetcher(versionAtSha, published = true) {
  return async (url) => {
    const path = new URL(url).pathname;
    if (new URL(url).hostname === "registry.npmjs.org")
      return published
        ? ok({
            name: "@lapismd/source",
            version: path.split("/").at(-1),
            dist: { integrity: "sha512-public" },
          })
        : { status: 404, ok: false };
    if (path.endsWith("/source"))
      return ok({ private: false, default_branch: "main" });
    if (path.includes("/branches/")) return ok({ commit: { sha } });
    if (path.includes("/git/trees/"))
      return ok({
        tree: [
          {
            type: "blob",
            path: "package.json",
            sha: path.endsWith("b".repeat(40)) ? "old" : "new",
          },
        ],
      });
    return ok(
      blob(
        JSON.stringify({
          name: "@lapismd/source",
          version: path.endsWith("old") ? "1.0.0" : versionAtSha,
        }),
      ),
    );
  };
}

test("out-of-order publication hints verify historical source and registry without selecting payload targets", async () => {
  for (const [sourceSha, version] of [
    [sha, "1.0.1"],
    ["b".repeat(40), "1.0.0"],
    [sha, "1.0.1"],
  ]) {
    const result = await verifyHint(
      {
        ...repo,
        sourceSha,
        action: "lapis-npm-published-v1",
        packages: [{ name: "@lapismd/source", version }],
      },
      [repo],
      { fetcher: sourceFetcher("1.0.1") },
    );
    assert.equal(result.status, "verified");
    assert.equal(result.sourceSha, sourceSha);
  }
});

test("hint source/version mismatch and unpublished registry coordinates fail verification", async () => {
  const hint = {
    ...repo,
    sourceSha: sha,
    action: "lapis-npm-published-v1",
    packages: [{ name: "@lapismd/source", version: "1.0.1" }],
  };
  await assert.rejects(
    verifyHint(hint, [repo], { fetcher: sourceFetcher("1.0.0") }),
    /exact source/,
  );
  await assert.rejects(
    verifyHint(hint, [repo], { fetcher: sourceFetcher("1.0.1", false) }),
    /registry identity/,
  );
});

test("completion hints constrain source identity and carry no qualification authority", () => {
  assert.deepEqual(
    validateCompletion({ ...repo, sourceSha: sha, status: "success" }, [repo]),
    { repository: repo.repository, sourceSha: sha },
  );
  assert.throws(
    () => validateCompletion({ ...repo, sourceSha: "main" }, [repo]),
    /Invalid completion/,
  );
});

test("workflow applicability excludes non-triggering paths/tags while unknown paths fail closed", async () => {
  const { workflowApplies } = await import("../src/policy.mjs");
  assert.equal(
    workflowApplies({ branches: ["main"], paths: ["pnpm-lock.yaml"] }, "main", [
      ".github/workflows/version.yml",
    ]),
    false,
  );
  assert.equal(
    workflowApplies({ branches: ["main"], paths: ["pnpm-lock.yaml"] }, "main", [
      "pnpm-lock.yaml",
    ]),
    true,
  );
  assert.equal(
    workflowApplies({ paths: ["src/**", "!src/tests/**"] }, "main", [
      "src/tests/a.mjs",
    ]),
    false,
  );
  assert.equal(workflowApplies({ paths: ["src/**"] }, "main", null), null);
  assert.equal(workflowApplies({ tags: ["v*"] }, "main", []), false);
  assert.equal(
    workflowApplies({ "paths-ignore": ["docs/**"] }, "main", ["docs/guide.md"]),
    false,
  );
  assert.equal(
    workflowApplies({ branches: ["release/**"] }, "main", ["src/a.mjs"]),
    false,
  );
});

test("current next-tagged publication remains observable outside latest update eligibility", async () => {
  const name = "@lapis-notes/file-explorer";
  const fetcher = async (url) => {
    let value;
    if (url.startsWith("https://registry.npmjs.org/"))
      value = {
        name,
        "dist-tags": { latest: "0.1.0", next: "0.2.8" },
        versions: {
          "0.1.0": {
            name,
            version: "0.1.0",
            dist: { integrity: "sha512-old" },
          },
          "0.2.8": {
            name,
            version: "0.2.8",
            dist: { integrity: "sha512-new" },
          },
        },
      };
    else if (url.endsWith("/lapis-notes"))
      value = {
        id: 1,
        full_name: "lapismd/lapis-notes",
        private: false,
        visibility: "public",
        archived: false,
        default_branch: "main",
      };
    else if (url.includes("/branches/")) value = { commit: { sha } };
    else if (url.includes("/git/trees/"))
      value = { tree: [{ type: "blob", path: "package.json" }] };
    else if (url.includes("/contents/package.json"))
      value = {
        content: Buffer.from(
          JSON.stringify({ name, version: "0.2.8" }),
        ).toString("base64"),
      };
    else throw Error("Unexpected publication fixture read");
    return { ok: true, status: 200, json: async () => value };
  };
  const graph = await inventory(
    [{ repository: "lapismd/lapis-notes", phase: "pilot" }],
    { fetcher, publicOnly: true, waveEvidence: true },
  );
  assert(
    graph.registry[name]["0.2.8"],
    "published own version must remain observable even when next is not admitted",
  );
  assert.deepEqual(graph.available[name], ["0.1.0"]);
});
