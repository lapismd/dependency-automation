import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import YAML from "yaml";

test("consumer integration is repeatable, preserves functional commands and keeps Dependabot security updates", async () => {
  const root = await mkdtemp(join(tmpdir(), "lapis-consumer-"));
  await mkdir(join(root, ".github/workflows"), { recursive: true });
  await mkdir(join(root, "scripts/validation"), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      private: true,
      scripts: {
        check: "pnpm audit && spec-validator validate && pnpm check:types",
      },
    }),
  );
  await writeFile(
    join(root, "scripts/validation/lanes.json"),
    JSON.stringify({
      "spec:check":
        "pnpm check:app-ownership && spec-validator check && pnpm check:types",
    }),
  );
  await writeFile(
    join(root, ".github/dependabot.yml"),
    "version: 2\nupdates:\n  - package-ecosystem: npm\n    directory: /\n    schedule:\n      interval: weekly\n",
  );
  await writeFile(
    join(root, ".github/workflows/ci.yml"),
    "name: CI\non:\n  pull_request:\njobs:\n  check:\n    runs-on: ubuntu-latest\n    steps:\n      - run: pnpm check\n",
  );
  await writeFile(
    join(root, ".github/workflows/publish-spec-pages.yml"),
    "name: Spec book\non:\n  pull_request:\njobs:\n  book:\n    runs-on: ubuntu-latest\n    steps:\n      - run: cd /tmp/book && pnpm exec spec-validator build\n",
  );
  const args = [
    "scripts/prepare-consumer.mjs",
    root,
    "lapismd/lapis-notes",
    "a".repeat(40),
  ];
  execFileSync(process.execPath, args);
  const paths = [
    "package.json",
    "scripts/validation/lanes.json",
    ".github/dependabot.yml",
    ".github/workflows/ci.yml",
    ".github/workflows/publish-spec-pages.yml",
  ];
  const before = await Promise.all(
    paths.map((p) => readFile(join(root, p), "utf8")),
  );
  execFileSync(process.execPath, args);
  const after = await Promise.all(
    paths.map((p) => readFile(join(root, p), "utf8")),
  );
  assert.deepEqual(after, before);
  assert.match(
    JSON.parse(after[0]).scripts.check,
    /pnpm audit && node .*spec-policy.mjs validate && pnpm check:types/,
  );
  assert.match(
    JSON.parse(after[1])["spec:check"],
    /check:app-ownership && node .*spec-policy.mjs check && pnpm check:types/,
  );
  const ignores = YAML.parse(after[2]).updates[0].ignore;
  assert.equal(ignores.length, 2);
  assert.ok(ignores.every((r) => r["update-types"].length === 3));
  assert.equal(
    YAML.parse(after[3]).env.LAPIS_CI_PR_AUTHOR,
    "${{ github.event.pull_request.user.login }}",
  );
  const book = YAML.parse(after[4]).jobs.book;
  assert.equal(
    book.steps[0].run,
    "cd /tmp/book && pnpm exec spec-validator build",
  );
  assert.match(book.if, /pull_request\.user\.type == 'Bot'/);
  assert.match(book.if, /lapismd-dependency-bot\[bot\]/);
  assert.equal(YAML.parse(after[3]).jobs.check.if, undefined);
});
