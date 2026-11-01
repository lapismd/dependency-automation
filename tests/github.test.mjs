import test from "node:test";
import assert from "node:assert/strict";
import { inventory, requestJson } from "../src/github.mjs";

test("unpublished registry prerequisites hold a private consumer until publication", async () => {
  let published = false;
  const fetcher = async (url) => {
    const path = new URL(url).pathname;
    let data;
    if (url.startsWith("https://registry.npmjs.org/")) {
      if (!published) return { status: 404, ok: false };
      data = { versions: { "0.2.0": {} }, "dist-tags": { latest: "0.2.0" } };
    } else if (path.endsWith("/lapis-desktop")) {
      data = { default_branch: "main", archived: false };
    } else if (path.includes("/branches/")) {
      data = { commit: { sha: "a".repeat(40) } };
    } else if (path.includes("/git/trees/")) {
      data = { tree: [{ type: "blob", path: "package.json" }] };
    } else {
      data = {
        content: Buffer.from(
          JSON.stringify({
            name: "desktop",
            private: true,
            dependencies: { "@lapismd/ai": "^0.2.0" },
          }),
        ).toString("base64"),
      };
    }
    return { status: 200, ok: true, json: async () => data };
  };
  const entries = [{ repository: "lapismd/lapis-desktop", phase: "full" }];
  const before = await inventory(entries, { fetcher });
  assert.deepEqual(before.unpublished, ["@lapismd/ai"]);
  assert.match(before.repositories[0].nonPortable[0], /unpublished registry/);
  assert.equal(before.edges.length, 1);
  assert.equal(before.packages.length, 0);
  published = true;
  const after = await inventory(entries, { fetcher });
  assert.deepEqual(after.repositories[0].nonPortable, []);
  assert.deepEqual(after.unpublished, []);
});

test("registry failures are failures; only a 404 means unpublished", async () => {
  const fetcher = async () => ({ status: 503, ok: false });
  await assert.rejects(
    requestJson("https://registry.npmjs.org/x", { fetcher, allow404: true }),
    /503/,
  );
  assert.equal(
    await requestJson("https://registry.npmjs.org/x", {
      fetcher: async () => ({ status: 404 }),
      allow404: true,
    }),
    null,
  );
});
test("a Mira release reaches every discovered direct consumer including private apps", async () => {
  const sources = {
    "lapismd/mira-mde": {
      name: "mira-root",
      private: true,
      workspaces: ["packages/*"],
    },
    "lapismd/design-core": {
      name: "@lapismd/design-core",
      dependencies: { "@lapismd/mira": "~0.1.4" },
    },
    "lapismd/lapis-notes": {
      name: "notes-root",
      private: true,
      dependencies: {
        "@lapismd/mira": "~0.1.4",
        "@lapismd/design-core": "^0.9.0",
      },
    },
    "lapismd/lapis-desktop": {
      name: "desktop",
      private: true,
      dependencies: { "@lapismd/mira": "~0.1.4" },
    },
  };
  const fetcher = async (url) => {
    const u = new URL(url);
    let data;
    if (u.hostname === "registry.npmjs.org") {
      const name = decodeURIComponent(u.pathname.slice(1));
      data = {
        "dist-tags": { latest: "0.1.5" },
        versions: { "0.1.4": {}, "0.1.5": {} },
        name,
      };
    } else {
      const match = /^\/repos\/(lapismd\/[^/]+)(.*)$/.exec(u.pathname);
      const [, repo, tail] = match;
      if (!tail) data = { default_branch: "main", archived: false };
      else if (tail.startsWith("/branches/"))
        data = { commit: { sha: "a".repeat(40) } };
      else if (tail.startsWith("/git/trees/"))
        data = {
          tree: [
            { type: "blob", path: "package.json" },
            ...(repo.endsWith("mira-mde")
              ? [{ type: "blob", path: "packages/mira/package.json" }]
              : []),
          ],
        };
      else {
        const manifest = tail.endsWith("/packages/mira/package.json")
          ? { name: "@lapismd/mira", version: "0.1.5" }
          : sources[repo];
        data = {
          content: Buffer.from(JSON.stringify(manifest)).toString("base64"),
        };
      }
    }
    return { ok: true, status: 200, json: async () => data };
  };
  const graph = await inventory(
    Object.keys(sources).map((repository) => ({ repository, phase: "pilot" })),
    { fetcher },
  );
  assert.deepEqual(
    graph.edges
      .filter((e) => e.name === "@lapismd/mira")
      .map((e) => e.repository)
      .sort(),
    ["lapismd/design-core", "lapismd/lapis-desktop", "lapismd/lapis-notes"],
  );
  assert.ok(!graph.packages.some((p) => p.name === "desktop"));
  assert.ok(
    graph.edges.some(
      (e) =>
        e.name === "@lapismd/design-core" &&
        e.repository === "lapismd/lapis-notes",
    ),
  );
});
