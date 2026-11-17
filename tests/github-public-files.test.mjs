import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { discoverRepository, requestJson } from "../src/github.mjs";
import { publicSourceFileReader } from "../src/github-public-files.mjs";

const repository = "lapismd/example";
const revision = "a".repeat(40);
const bytes = Buffer.from(
  JSON.stringify({ name: "@lapismd/example", version: "1.0.0" }),
);
const blob = createHash("sha1")
  .update(`blob ${bytes.length}\0`)
  .update(bytes)
  .digest("hex");

function fixture() {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (url === `https://api.github.com/repos/${repository}`)
      return Response.json({
        archived: false,
        private: false,
        visibility: "public",
        default_branch: "main",
      });
    if (url.endsWith("/branches/main"))
      return Response.json({ commit: { sha: revision } });
    if (url.includes("/git/trees/"))
      return Response.json({
        tree: [{ type: "blob", path: "package.json", sha: blob }],
      });
    if (
      url ===
      `https://raw.githubusercontent.com/${repository}/${revision}/package.json`
    )
      return new Response(bytes);
    throw Error("Unexpected request to GitHub file API: " + url);
  };
  return { calls, fetcher };
}

test("public inventory binds raw source bytes to the Git tree without file API quota", async () => {
  const f = fixture();
  const result = await discoverRepository(
    { repository, phase: "pilot" },
    {
      publicOnly: true,
      publicSourceFiles: true,
      token: "reader-token",
      fetcher: f.fetcher,
    },
  );
  assert.equal(result.manifests[0].manifest.name, "@lapismd/example");
  assert.equal(result.sourceSha, revision);
  assert.equal(
    f.calls.filter((c) => c.url.startsWith("https://api.github.com/")).length,
    3,
  );
  const raw = f.calls.filter((c) =>
    c.url.startsWith("https://raw.githubusercontent.com/"),
  );
  assert.equal(raw.length, 1);
  assert.equal(raw[0].options.headers.Authorization, undefined);
  assert.equal(raw[0].options.redirect, "error");
});

test("failed GitHub reads retain only sanitized quota diagnostics", async () => {
  await assert.rejects(
    requestJson("https://user:password@api.github.com/repos/o/r?token=secret", {
      token: "bearer-secret",
      fetcher: async () =>
        new Response(null, {
          status: 403,
          headers: {
            "x-ratelimit-limit": "1000",
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": "1794892800",
          },
        }),
    }),
    (error) => {
      assert.equal(error.code, "HTTP_RATE_LIMIT");
      assert.equal(error.status, 403);
      assert.deepEqual(error.rateLimit, {
        limit: 1000,
        remaining: 0,
        reset: 1794892800,
      });
      assert.match(
        error.message,
        /Request failed \(403\): https:\/\/api.github.com\/repos\/o\/r/,
      );
      assert.doesNotMatch(error.message, /password|secret|user:/);
      return true;
    },
  );
});

function reader(fetcher, file = "package.json", sha = blob) {
  return publicSourceFileReader(
    repository,
    revision,
    [{ type: "blob", path: file, sha }],
    { fetcher },
  );
}

test("public immutable file reuse stays local to one reader invocation", async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return new Response(bytes);
  };
  const first = reader(fetcher);
  const results = await Promise.all([
    first("package.json"),
    first("package.json"),
  ]);
  assert.deepEqual(results, [bytes.toString(), bytes.toString()]);
  assert.equal(calls, 1);
  await reader(fetcher)("package.json");
  assert.equal(calls, 2);
});

test("substituted source bytes fail Git identity without any API fallback", async () => {
  let calls = 0;
  const read = reader(async (url) => {
    calls++;
    assert(url.startsWith("https://raw.githubusercontent.com/"));
    return new Response("{}");
  });
  await assert.rejects(read("package.json"), /Git blob identity mismatch/);
  await assert.rejects(read("package.json"), /Git blob identity mismatch/);
  assert.equal(calls, 1);
});

for (const [name, response, pattern] of [
  [
    "oversized declared length",
    () =>
      new Response(bytes, {
        headers: { "content-length": String(4 * 1024 * 1024 + 1) },
      }),
    /byte bound/,
  ],
  [
    "oversized streamed bytes",
    () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(4 * 1024 * 1024));
            controller.enqueue(new Uint8Array(1));
            controller.close();
          },
        }),
      ),
    /byte bound/,
  ],
  [
    "invalid content length",
    () => new Response(bytes, { headers: { "content-length": "unknown" } }),
    /byte bound/,
  ],
  [
    "HTTP redirect",
    () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://example.com/untrusted" },
      }),
    /Request failed \(302\)/,
  ],
  [
    "followed redirect",
    () => {
      const value = new Response(bytes);
      Object.defineProperty(value, "redirected", { value: true });
      return value;
    },
    /Redirected/,
  ],
  [
    "HTTP denial",
    () => new Response(null, { status: 403 }),
    /Request failed \(403\)/,
  ],
]) {
  test("public source holds " + name, async () => {
    let calls = 0;
    await assert.rejects(
      reader(async () => {
        calls++;
        return response();
      })("package.json"),
      pattern,
    );
    assert.equal(calls, 1);
  });
}

test("missing, unsafe or unadvertised Git tree paths cannot issue raw requests", async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return new Response(bytes);
  };
  for (const file of [
    "../package.json",
    "/package.json",
    "a//package.json",
    "a\\package.json",
    "a/./package.json",
    "bad\nname",
  ]) {
    const read = reader(fetcher, file);
    await assert.rejects(read(file), /path lacks/);
  }
  await assert.rejects(reader(fetcher)("unadvertised.json"), /path lacks/);
  await assert.rejects(
    reader(fetcher, "package.json", "main")("package.json"),
    /path lacks/,
  );
  assert.equal(calls, 0);
});

test("mutable or foreign repository coordinates and duplicate tree paths are held", () => {
  for (const [repo, sha] of [
    ["o/r/extra", revision],
    ["../r", revision],
    [repository, "main"],
  ])
    assert.throws(
      () => publicSourceFileReader(repo, sha, []),
      /exact immutable/,
    );
  assert.throws(
    () =>
      publicSourceFileReader(repository, revision, [
        { type: "blob", path: "package.json", sha: blob },
        { type: "blob", path: "package.json", sha: blob },
      ]),
    /Duplicate/,
  );
});

test("public raw selection needs explicit public-only discovery before any request", async () => {
  for (const options of [
    { publicSourceFiles: true },
    { publicSourceFiles: "true", publicOnly: true },
  ]) {
    let calls = 0;
    await assert.rejects(
      discoverRepository(
        { repository },
        {
          ...options,
          fetcher: async () => {
            calls++;
          },
        },
      ),
      /Public source transport/,
    );
    assert.equal(calls, 0);
  }
});

test("unknown or private visibility never reaches the raw source host", async () => {
  for (const info of [
    { private: false },
    { visibility: "public" },
    { private: true, visibility: "public" },
    { private: true, visibility: "private" },
  ]) {
    const f = fixture();
    const fetcher = (url, options) =>
      url === `https://api.github.com/repos/${repository}`
        ? Response.json({ archived: false, default_branch: "main", ...info })
        : f.fetcher(url, options);
    const promise = discoverRepository(
      { repository },
      { publicOnly: true, publicSourceFiles: true, fetcher },
    );
    if (info.private === true && info.visibility === "private")
      assert.equal((await promise).coverageOnly, true);
    else await assert.rejects(promise, /verified public visibility/);
    assert(
      !f.calls.some((c) =>
        c.url.startsWith("https://raw.githubusercontent.com/"),
      ),
    );
  }
});

test("Git identities cover UTF-8 byte length and valid empty source files", async () => {
  for (const value of [Buffer.from("Crème 👋"), Buffer.alloc(0)]) {
    const sha = createHash("sha1")
      .update(`blob ${value.length}\0`)
      .update(value)
      .digest("hex");
    assert.equal(
      await reader(
        async () => new Response(value),
        "package.json",
        sha,
      )("package.json"),
      value.toString(),
    );
  }
});

test("quota diagnostics do not misclassify permissions or retain arbitrary headers/body text", async () => {
  for (const [status, headers, code] of [
    [403, { "x-ratelimit-remaining": "900" }, "HTTP_REQUEST_FAILED"],
    [429, {}, "HTTP_RATE_LIMIT"],
    [403, { "retry-after": "15" }, "HTTP_RATE_LIMIT"],
    [
      403,
      {
        "x-ratelimit-limit": "secret",
        "x-ratelimit-reset": "1234567890123",
        "x-github-request-id": "bearer-secret",
      },
      "HTTP_REQUEST_FAILED",
    ],
  ]) {
    await assert.rejects(
      requestJson("https://api.github.com/repos/o/r?key=secret", {
        fetcher: async () =>
          new Response("private body secret", { status, headers }),
      }),
      (error) => {
        assert.equal(error.code, code);
        assert.doesNotMatch(JSON.stringify(error), /secret|private body/);
        return true;
      },
    );
  }
});

test("real GitHub request identities remain available for failure investigation", async () => {
  await assert.rejects(
    requestJson("https://api.github.com/repos/o/r", {
      fetcher: async () =>
        new Response(null, {
          status: 403,
          headers: { "x-github-request-id": "ABCD:1234:ABCD:5678:ABCDEF" },
        }),
    }),
    (error) => {
      assert.equal(error.requestId, "ABCD:1234:ABCD:5678:ABCDEF");
      return true;
    },
  );
});

test("public source file count is bounded and cache hits consume no new request", async () => {
  const empty = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391";
  const tree = Array.from({ length: 257 }, (_, index) => ({
    type: "blob",
    path: `file-${index}`,
    sha: empty,
  }));
  let calls = 0;
  const read = publicSourceFileReader(repository, revision, tree, {
    fetcher: async () => {
      calls++;
      return new Response(null);
    },
  });
  for (let index = 0; index < 256; index++) await read(`file-${index}`);
  await read("file-0");
  await assert.rejects(read("file-256"), /file request budget/);
  assert.equal(calls, 256);
});

test("per-repository aggregate bytes remain bounded across individually valid files", async () => {
  const value = Buffer.alloc(4 * 1024 * 1024);
  const sha = createHash("sha1")
    .update(`blob ${value.length}\0`)
    .update(value)
    .digest("hex");
  const tree = Array.from({ length: 5 }, (_, index) => ({
    type: "blob",
    path: `file-${index}`,
    sha,
  }));
  const read = publicSourceFileReader(repository, revision, tree, {
    fetcher: async () => new Response(value),
  });
  for (let index = 0; index < 4; index++)
    assert.equal((await read(`file-${index}`)).length, value.length);
  await assert.rejects(read("file-4"), /byte bound/);
});
