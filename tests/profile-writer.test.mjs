import assert from "node:assert/strict";
import test from "node:test";
import { validateProfile, publishProfile } from "../src/profile-writer.mjs";

const packages = { demo: ["@lapismd/demo"] };
const before =
  "Profile\n| Repository | Build | npm |\n| --- | --- | --- |\n| [Demo](https://github.com/lapismd/demo) | passing | @lapismd/demo — **Not published** |\n";
const after = before.replace(
  "@lapismd/demo — **Not published**",
  "Published: [@lapismd/demo](https://www.npmjs.com/package/@lapismd/demo) **v1.2.3**",
);

test("profile writer accepts only generated package cells and table padding", () => {
  assert.equal(validateProfile(before, after, packages), true);
  assert.equal(validateProfile(before, before, packages), false);
  assert.throws(() =>
    validateProfile(before, after.replace("passing", "changed"), packages),
  );
  assert.throws(() =>
    validateProfile(before, after.replace("Profile", "Other"), packages),
  );
  assert.throws(() =>
    validateProfile(
      before,
      after.replace("v1.2.3", "v1.2.3** <script>"),
      packages,
    ),
  );
  assert.throws(() =>
    validateProfile(before, after, { demo: ["@lapismd/other"] }),
  );
  assert.throws(() => validateProfile(before, after + "\n", packages));
});

function fixture({
  manual = false,
  stale = false,
  changedFile = false,
  race = false,
  duplicate = false,
  fresh = false,
  body: reviewBody = "Maintainer: preserve this review note.",
} = {}) {
  const calls = [];
  let reads = 0;
  const main = "a".repeat(40),
    head = "b".repeat(40);
  const api = async (path, method = "GET", body) => {
    calls.push({ path, method, body });
    if (path === "git/ref/heads/main")
      return {
        object: { sha: stale || (race && reads++ > 0) ? "c".repeat(40) : main },
      };
    if (path.startsWith("contents/"))
      return {
        encoding: "base64",
        content: Buffer.from(
          path.includes("packages.json")
            ? JSON.stringify(packages)
            : duplicate && path.endsWith(head)
              ? after
              : before,
        ).toString("base64"),
      };
    if (path.startsWith("pulls?"))
      return fresh
        ? []
        : [
            {
              number: 9,
              body: reviewBody,
              head: { sha: head, repo: { full_name: "lapismd/.github" } },
              user: { login: "lapismd-dependency-bot[bot]" },
            },
          ];
    if (path.startsWith("compare/"))
      return {
        status: "ahead",
        total_commits: 1,
        commits: [
          {
            author: {
              login: manual
                ? "human"
                : duplicate
                  ? "lapismd-dependency-bot[bot]"
                  : "github-actions[bot]",
            },
          },
        ],
        files: [
          {
            filename: changedFile ? "scripts/evil.mjs" : "profile/README.md",
            status: "modified",
          },
        ],
      };
    if (path === "git/ref/heads/automation/npm-status-refresh")
      return fresh ? null : { object: { sha: head } };
    if (path === `git/commits/${main}`) return { tree: { sha: "tree" } };
    if (path === "git/trees") return { sha: "new-tree" };
    if (path === "git/commits") return { sha: "d".repeat(40) };
    if (path.startsWith("git/refs/")) return {};
    if (path === "git/refs") return {};
    if (path === "pulls") return { number: 10 };
    if (path === "pulls/9")
      return {
        body: reviewBody,
        user: { login: "lapismd-dependency-bot[bot]" },
        head: { sha: "d".repeat(40), repo: { full_name: "lapismd/.github" } },
      };
    throw Error(`Unexpected API call ${method} ${path}`);
  };
  return {
    api,
    calls,
    sourceSha: main,
    candidate: after,
    now: "2026-11-15T22:00:00.000Z",
  };
}

test("profile PR publication creates and refreshes managed context while preserving maintainer text", async () => {
  const fresh = fixture({ fresh: true });
  await publishProfile(fresh);
  assert.match(
    fresh.calls.find((c) => c.path === "pulls").body.body,
    /Lapis profile context/,
  );
  const rolling = fixture();
  await publishProfile(rolling);
  const update = rolling.calls.find(
    (c) => c.path === "pulls/9" && c.body?.body,
  );
  assert(update, "changed rolling candidate refreshes its description");
  assert.match(update.body.body, /^Maintainer: preserve this review note\./);
  assert.match(update.body.body, new RegExp(`/commit/${"d".repeat(40)}`));
});

test("ambiguous profile body markers stop a changed candidate before any write", async () => {
  const f = fixture({ body: "<!-- lapis-profile-context:start -->" });
  await assert.rejects(publishProfile(f), /Ambiguous/);
  assert(f.calls.every((c) => c.method === "GET"));
});

test("body refresh reads concurrent maintainer prose and holds on a changed review head", async () => {
  for (const changedHead of [false, true]) {
    const f = fixture(),
      original = f.api;
    f.api = async (path, method = "GET", ...args) => {
      const result = await original(path, method, ...args);
      if (path === "pulls/9" && method === "GET") {
        result.body += "\n\nMaintainer: added during preparation.";
        if (changedHead) result.head.sha = "e".repeat(40);
      }
      return result;
    };
    if (changedHead) {
      await assert.rejects(publishProfile(f), /ownership changed/);
      assert(
        !f.calls.some((c) => c.path === "pulls/9" && c.method === "PATCH"),
      );
    } else {
      await publishProfile(f);
      assert.match(
        f.calls.find((c) => c.path === "pulls/9" && c.method === "PATCH").body
          .body,
        /Maintainer: added during preparation\./,
      );
    }
  }
});

test("an identical candidate never backfills even malformed or obsolete body context", async () => {
  const f = fixture({
    duplicate: true,
    body: "<!-- lapis-profile-context:start -->",
  });
  assert.equal((await publishProfile(f)).state, "pending");
  assert(f.calls.every((c) => c.method === "GET"));
});

test("new publication creates one branch and PR; duplicate candidate performs no writes", async () => {
  const fresh = fixture({ fresh: true });
  assert.equal((await publishProfile(fresh)).number, 10);
  assert.equal(fresh.calls.filter((c) => c.path === "pulls").length, 1);
  const duplicate = fixture({ duplicate: true });
  assert.equal((await publishProfile(duplicate)).state, "pending");
  assert(duplicate.calls.every((c) => c.method === "GET"));
  const unchanged = fixture();
  unchanged.candidate = before;
  assert.equal((await publishProfile(unchanged)).state, "unchanged");
  assert(unchanged.calls.every((c) => c.method === "GET"));
});

test("rolling profile update preserves history and uses a fast-forward ref write", async () => {
  const f = fixture();
  assert.equal((await publishProfile(f)).number, 9);
  const commit = f.calls.find((c) => c.path === "git/commits");
  assert.deepEqual(commit.body.parents, ["b".repeat(40), "a".repeat(40)]);
  const ref = f.calls.find((c) => c.method === "PATCH");
  assert.equal(ref.body.force, false);
});

test("legacy token-created PR is replaced once after a validated branch update", async () => {
  const f = fixture({ duplicate: true });
  const original = f.api;
  f.api = async (path, ...args) => {
    const result = await original(path, ...args);
    if (path.startsWith("pulls?state=open"))
      result[0].user.login = "github-actions[bot]";
    return result;
  };
  assert.equal((await publishProfile(f)).number, 10);
  const closeIndex = f.calls.findIndex((c) => c.path === "pulls/9");
  assert(
    f.calls.findIndex(
      (c) => c.path.startsWith("git/refs/") && c.method === "PATCH",
    ) < closeIndex,
  );
  assert.deepEqual(f.calls[closeIndex].body, { state: "closed" });
  assert(f.calls.findIndex((c) => c.path === "pulls") > closeIndex);
});

test("a retained branch is reused only at an exactly matched merged bot PR", async () => {
  const f = fixture();
  const original = f.api;
  f.api = async (path, ...args) => {
    if (path.startsWith("pulls?state=open")) return [];
    if (path.startsWith("pulls?state=closed"))
      return [
        {
          merged_at: "2026-11-15",
          head: { sha: "b".repeat(40), repo: { full_name: "lapismd/.github" } },
          user: { login: "lapismd-dependency-bot[bot]" },
        },
      ];
    return original(path, ...args);
  };
  assert.equal((await publishProfile(f)).number, 10);
  assert.equal(f.calls.find((c) => c.method === "PATCH").body.force, false);
  const orphan = fixture();
  const orphanApi = orphan.api;
  orphan.api = (path, ...args) =>
    path.startsWith("pulls?") ? Promise.resolve([]) : orphanApi(path, ...args);
  await assert.rejects(publishProfile(orphan), /requires reconciliation/);
  assert(orphan.calls.every((c) => c.method === "GET"));
});

for (const issue of ["manual", "stale", "changedFile", "race"]) {
  test(`profile publication stops without writing a ref for ${issue}`, async () => {
    const f = fixture({ [issue]: true });
    await assert.rejects(publishProfile(f));
    assert(!f.calls.some((c) => c.method === "PATCH" || c.path === "pulls"));
    if (issue !== "race") assert(!f.calls.some((c) => c.method === "POST"));
  });
}
