import assert from "node:assert/strict";
import { realpathSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import semver from "semver";

const runner = createRequire(
  realpathSync(
    fileURLToPath(
      new URL("../node_modules/renovate/package.json", import.meta.url),
    ),
  ),
);
const child = (parent, name) => createRequire(parent.resolve(name));
const cleanup = child(
  child(
    child(
      child(runner, "@opentelemetry/resource-detector-gcp"),
      "gcp-metadata",
    ),
    "gaxios",
  ),
  "rimraf",
);
const version = async (scope, name) =>
  JSON.parse(await readFile(scope.resolve(`${name}/package.json`), "utf8"))
    .version;

test("all Renovate glob resolutions clear the known vulnerable range", async () => {
  for (const scope of [runner, cleanup])
    assert(semver.gte(await version(scope, "glob"), "14.0.2"));
});

test("all Renovate matcher resolutions clear the known vulnerable range", async () => {
  for (const scope of [runner, child(cleanup, "glob")])
    assert(semver.gte(await version(scope, "minimatch"), "11.0.1"));
});

test("the actual Renovate matcher preserves file selection and dotfile options", async () => {
  const { minimatch } = await import(
    new URL("../node_modules/renovate/dist/util/minimatch.js", import.meta.url)
  );
  const files = [
    "package.json",
    "packages/api/package.json",
    "packages/ui/package.json",
    "packages/api/src/index.ts",
    "packages/.hidden/package.json",
  ];
  assert.deepEqual(
    files.filter((file) =>
      minimatch("packages/{api,ui}/package.json").match(file),
    ),
    ["packages/api/package.json", "packages/ui/package.json"],
  );
  assert(!minimatch("packages/*/package.json").match(files.at(-1)));
  assert(
    minimatch("packages/*/package.json", { dot: true }).match(files.at(-1)),
  );
});

test("glob selection and transitive rimraf cleanup retain their runtime contracts", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "lapis-renovate-runtime-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const name of [
    "packages/api/package.json",
    "packages/ui/package.json",
    "node_modules/ignored/package.json",
    ".changeset/release.md",
    "stale/remove.tmp",
    "stale/keep.txt",
  ]) {
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await writeFile(path.join(root, name), "{}");
  }
  const { glob } = await import(pathToFileURL(runner.resolve("glob")));
  assert.deepEqual(
    (
      await glob(["**/package.json", ".changeset/*.md"], {
        cwd: root,
        dot: true,
        nodir: true,
        ignore: ["node_modules/**"],
      })
    ).sort(),
    [
      ".changeset/release.md",
      "packages/api/package.json",
      "packages/ui/package.json",
    ],
  );
  const rimrafModule = await import(pathToFileURL(cleanup.resolve("rimraf")));
  await rimrafModule.rimraf(path.join(root, "stale/*.tmp"), { glob: true });
  await assert.rejects(readFile(path.join(root, "stale/remove.tmp")), {
    code: "ENOENT",
  });
  assert.equal(await readFile(path.join(root, "stale/keep.txt"), "utf8"), "{}");
});
