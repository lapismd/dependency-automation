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
const gitBlob = (value) => {
  const bytes = Buffer.from(value);
  return {
    sha: createHash("sha1")
      .update(`blob ${bytes.length}\0`)
      .update(bytes)
      .digest("hex"),
    response: { encoding: "base64", ...blob(value) },
  };
};

test("source-advanced recovery proves unchanged code and dependency inputs from complete exact trees", async () => {
  const { qualifyRecoverySource } = await import("../src/wave-evidence.mjs");
  const sourceSha = "b".repeat(40),
    currentSourceSha = "c".repeat(40);
  const entry = (path, value = "d".repeat(40), mode = "100644") => ({
    path,
    sha: value,
    mode,
    type: "blob",
  });
  const before = {
    sha,
    truncated: false,
    tree: [
      entry("package.json"),
      entry("pnpm-lock.yaml"),
      entry("pnpm-workspace.yaml"),
      entry("src/index.mjs"),
      entry("spec/src/governance.md"),
    ],
  };
  const after = structuredClone(before);
  after.tree.at(-1).sha = "e".repeat(40);
  after.tree.push(
    entry(".github/workflows/ci.yml"),
    entry(".github/versioning-runtime.json"),
    entry("scripts/release-pipeline.test.mjs"),
  );
  const calls = [];
  const options = {
    expectedSourceSha: currentSourceSha,
    fetcher: async (url) => {
      calls.push(url);
      return ok(url.includes(sourceSha) ? before : after);
    },
  };
  const proof = await qualifyRecoverySource(
    { repository: repo.repository, sourceSha },
    { ...repo, sourceSha: currentSourceSha, visibility: "public" },
    options,
  );
  assert.equal(proof.sourceSha, sourceSha);
  assert.equal(proof.currentSourceSha, currentSourceSha);
  assert.match(proof.projectionSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(
    calls,
    [sourceSha, currentSourceSha].map(
      (ref) =>
        `https://api.github.com/repos/${repo.repository}/git/trees/${ref}?recursive=1`,
    ),
  );
  for (const path of [
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "src/index.mjs",
    ".github/dependency-automation/canonical-intake.json",
    "AGENTS.md",
  ]) {
    const changed = structuredClone(after);
    const found = changed.tree.find((e) => e.path === path);
    if (found) found.sha = "f".repeat(40);
    else changed.tree.push(entry(path));
    await assert.rejects(
      qualifyRecoverySource(
        { repository: repo.repository, sourceSha },
        { ...repo, sourceSha: currentSourceSha, visibility: "public" },
        {
          ...options,
          fetcher: async (url) =>
            ok(url.includes(sourceSha) ? before : changed),
        },
      ),
      /unchanged code and dependency inputs/,
    );
  }
  for (const invalid of [
    { ...after, truncated: true },
    { ...after, tree: [...after.tree, after.tree[0]] },
    { ...after, tree: [...after.tree, entry("../escape")] },
    {
      ...after,
      tree: [...after.tree, entry("spec/link", "f".repeat(40), "120000")],
    },
  ])
    await assert.rejects(
      qualifyRecoverySource(
        { repository: repo.repository, sourceSha },
        { ...repo, sourceSha: currentSourceSha, visibility: "public" },
        {
          ...options,
          fetcher: async (url) =>
            ok(url.includes(sourceSha) ? before : invalid),
        },
      ),
    );
  for (const expectedSourceSha of [undefined, "a".repeat(40)])
    await assert.rejects(
      qualifyRecoverySource(
        { repository: repo.repository, sourceSha },
        { ...repo, sourceSha: currentSourceSha, visibility: "public" },
        { ...options, expectedSourceSha },
      ),
      /exact current public source/,
    );
});

test("source-advanced recovery accepts only an unchanged exact operation target surface", async () => {
  const { qualifyRecoverySource } = await import("../src/wave-evidence.mjs");
  const sourceSha = "b".repeat(40),
    currentSourceSha = "c".repeat(40),
    entry = (path, value) => ({
      path,
      sha: value,
      mode: "100644",
      type: "blob",
    }),
    before = {
      sha: sourceSha,
      truncated: false,
      tree: [
        entry("package.json", "1".repeat(40)),
        entry("pnpm-lock.yaml", "2".repeat(40)),
        entry("pnpm-workspace.yaml", "3".repeat(40)),
        entry("packages/released/package.json", "4".repeat(40)),
        entry("src/index.mjs", "5".repeat(40)),
      ],
    },
    after = structuredClone(before),
    operation = {
      id: "6".repeat(64),
      repository: repo.repository,
      sourceSha,
      targets: [
        {
          name: "@lapis-notes/api",
          path: "package.json",
          type: "devDependencies",
          target: "0.6.10",
        },
      ],
    },
    source = { ...repo, sourceSha: currentSourceSha, visibility: "public" },
    options = {
      expectedSourceSha: currentSourceSha,
      fetcher: async (url) => ok(url.includes(sourceSha) ? before : after),
    };
  after.tree.find(
    (item) => item.path === "packages/released/package.json",
  ).sha = "7".repeat(40);
  const proof = await qualifyRecoverySource(operation, source, options);
  assert.equal(proof.schemaVersion, 2);
  assert.equal(proof.operationId, operation.id);
  assert.deepEqual(proof.targetSurfacePaths, [
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
  ]);
  assert.match(proof.projectionSha256, /^[a-f0-9]{64}$/);

  for (const path of proof.targetSurfacePaths) {
    const changed = structuredClone(after);
    changed.tree.find((item) => item.path === path).sha = "8".repeat(40);
    await assert.rejects(
      qualifyRecoverySource(operation, source, {
        ...options,
        fetcher: async (url) => ok(url.includes(sourceSha) ? before : changed),
      }),
      path === "pnpm-lock.yaml"
        ? /exact pnpm lock blobs/
        : /unchanged operation target surface/,
    );
  }
});

test("source-advanced recovery accepts a target-disjoint qualified lock stabilization", async () => {
  const { qualifyRecoverySource } = await import("../src/wave-evidence.mjs");
  const sourceSha = "b".repeat(40),
    currentSourceSha = "c".repeat(40),
    beforeLock = `lockfileVersion: '9.0'\nsettings:\n  autoInstallPeers: true\nimporters:\n  .:\n    devDependencies:\n      '@lapis-notes/api':\n        specifier: ^0.6.10\n        version: 0.6.10(peer@1.0.0)\n      '@codemirror/lint':\n        specifier: ^6.9.7\n        version: 6.9.7\npackages:\n  '@lapis-notes/api@0.6.10':\n    resolution: {integrity: sha512-api}\n  '@codemirror/lint@6.9.7':\n    resolution: {integrity: sha512-old}\nsnapshots:\n  '@lapis-notes/api@0.6.10(peer@1.0.0)': {}\n  '@codemirror/lint@6.9.7': {}\n`,
    afterLock = beforeLock
      .replaceAll("6.9.7", "6.9.8")
      .replaceAll("peer@1.0.0", "peer@2.0.0")
      .replace("sha512-old", "sha512-new"),
    beforeBlob = gitBlob(beforeLock),
    afterBlob = gitBlob(afterLock),
    entry = (path, value) => ({
      path,
      sha: value,
      mode: "100644",
      type: "blob",
    }),
    before = {
      sha: sourceSha,
      truncated: false,
      tree: [
        entry("package.json", "1".repeat(40)),
        entry("pnpm-lock.yaml", beforeBlob.sha),
        entry("pnpm-workspace.yaml", "3".repeat(40)),
        entry(
          ".github/dependency-automation/canonical-intake.json",
          "4".repeat(40),
        ),
      ],
    },
    after = structuredClone(before),
    operation = {
      id: "6".repeat(64),
      repository: repo.repository,
      sourceSha,
      targets: [
        {
          name: "@lapis-notes/api",
          path: "package.json",
          type: "devDependencies",
          target: "0.6.12",
        },
      ],
    },
    source = { ...repo, sourceSha: currentSourceSha, visibility: "public" };
  after.tree.find((item) => item.path === "pnpm-lock.yaml").sha = afterBlob.sha;
  const options = {
    expectedSourceSha: currentSourceSha,
    fetcher: async (url) => {
      if (url.includes("/git/trees/"))
        return ok(url.includes(sourceSha) ? before : after);
      if (url.endsWith(beforeBlob.sha)) return ok(beforeBlob.response);
      if (url.endsWith(afterBlob.sha)) return ok(afterBlob.response);
      throw Error(`Unexpected request: ${url}`);
    },
  };
  const proof = await qualifyRecoverySource(operation, source, options);
  assert.equal(proof.schemaVersion, 3);
  assert.equal(proof.operationId, operation.id);
  assert.equal(proof.sourceLockSha, beforeBlob.sha);
  assert.equal(proof.currentLockSha, afterBlob.sha);
  assert.match(proof.targetLockProjectionSha256, /^[a-f0-9]{64}$/);
  assert.match(proof.projectionSha256, /^[a-f0-9]{64}$/);

  for (const changedLock of [
    afterLock.replace("version: 0.6.10", "version: 0.6.11"),
    afterLock.replace("sha512-api", "sha512-forged"),
  ]) {
    const changedBlob = gitBlob(changedLock),
      changedAfter = structuredClone(after);
    changedAfter.tree.find((item) => item.path === "pnpm-lock.yaml").sha =
      changedBlob.sha;
    await assert.rejects(
      qualifyRecoverySource(operation, source, {
        ...options,
        fetcher: async (url) => {
          if (url.includes("/git/trees/"))
            return ok(url.includes(sourceSha) ? before : changedAfter);
          if (url.endsWith(beforeBlob.sha)) return ok(beforeBlob.response);
          if (url.endsWith(changedBlob.sha)) return ok(changedBlob.response);
          throw Error(`Unexpected request: ${url}`);
        },
      }),
      /unchanged operation target lock projection/,
    );
  }
});

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
