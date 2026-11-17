import assert from "node:assert/strict";
import test from "node:test";
import { rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  assertEmptyChangeset,
  changesetPath,
  writeChangeset,
} from "../src/changesets.mjs";
import { prepareCanonicalFiles } from "../src/canonical-intake-files.mjs";
import { prepareWorkspaceIntake } from "../src/canonical-workspace.mjs";
import {
  retryInput,
  retryFilesystem,
} from "./helpers/canonical-retry-fixtures.mjs";

for (const header of ["", "\n", "{}\n", "{ }\n"])
  test("bounded empty note accepts valid map " + JSON.stringify(header), () =>
    assert.equal(
      assertEmptyChangeset("---\n" + header + "---\n\nAuthored body.\n"),
      true,
    ),
  );
test("empty-note boundary counts UTF8 bytes and supports CRLF", () => {
  const text = "---\n---\n" + "é".repeat(4092);
  assert.equal(Buffer.byteLength(text), 8192);
  assert.equal(assertEmptyChangeset(text), true);
  assert.throws(() => assertEmptyChangeset(text + "é"));
  assert.equal(assertEmptyChangeset("---\r\n{}\r\n---\r\n\r\nBody\r\n"), true);
  assert.throws(() => assertEmptyChangeset("---\n---\n\ud800"));
});
for (const header of [
  "null\n",
  "~\n",
  "[]\n",
  "false\n",
  "!!set {}\n",
  '{"product":"patch"}\n',
])
  test("empty-note parser rejects non-map/intent " + header.trim(), () =>
    assert.throws(() => assertEmptyChangeset("---\n" + header + "---\n")),
  );

for (const mode of [
  "symlink",
  "missing",
  "invalid UTF8",
  "UTF8 BOM preamble",
  "oversized",
  "nonempty",
  "wrong branch",
  "multiple",
  "arbitrary",
])
  test(
    "filesystem refuses " + mode + " note before writing any canonical chapter",
    async (t) => {
      const data = retryInput(),
        path = changesetPath(data.branchName);
      const f = await retryFilesystem(
        data,
        mode === "missing" ? { [path]: "---\n---\n" } : {},
      );
      t.after(f.remove);
      if (mode === "missing") await rm(join(f.root, path));
      else if (mode === "symlink")
        await symlink(
          join(f.root, Object.keys(data.baseChapters)[0]),
          join(f.root, path),
        );
      else if (mode === "invalid UTF8")
        await writeFile(
          join(f.root, path),
          Buffer.concat([Buffer.from("---\n---\n"), Buffer.from([255])]),
        );
      else if (mode === "UTF8 BOM preamble")
        await f.put(path, "\ufeff---\n---\n");
      else if (mode === "oversized")
        await f.put(path, "---\n---\n" + "é".repeat(4096));
      else if (mode === "nonempty")
        await f.put(
          path,
          '---\n"product": patch\n---\nAuthored product intent.\n',
        );
      else {
        await writeChangeset(f.root, [], {
          empty: true,
          scope: data.branchName,
        });
        if (mode === "wrong branch") f.args.branchName += "-wrong";
        if (mode === "multiple")
          await f.put(changesetPath(data.branchName + "-other"), "---\n---\n");
        if (mode === "arbitrary")
          await f.put(
            ".changeset/authored-product.md",
            '---\n"product": patch\n---\nPreserve me.\n',
          );
      }
      const paths = [...Object.keys(data.baseChapters), "pnpm-workspace.yaml"];
      const original = await Promise.all(paths.map(f.read));
      await assert.rejects(prepareCanonicalFiles(f.args));
      assert.deepEqual(await Promise.all(paths.map(f.read)), original);
      if (mode === "nonempty")
        assert.equal(
          await f.read(path),
          '---\n"product": patch\n---\nAuthored product intent.\n',
        );
    },
  );

test("late final chapter validation leaves every prospective output and authored note intact", async (t) => {
  const data = retryInput(),
    paths = Object.keys(data.baseChapters),
    f = await retryFilesystem(data);
  t.after(f.remove);
  await writeChangeset(f.root, [], { empty: true, scope: data.branchName });
  await f.put(
    paths[1],
    data.baseChapters[paths[1]] + "Manual product repair.\n",
  );
  const all = [...paths, "pnpm-workspace.yaml", changesetPath(data.branchName)],
    before = await Promise.all(all.map(f.read));
  await assert.rejects(prepareCanonicalFiles(f.args), /manual canonical edits/);
  assert.deepEqual(await Promise.all(all.map(f.read)), before);
});

for (const mutate of [
  (s) => s.replace("SHA256: `", "SHA256:  `"),
  (s) => s.replace("SHA256: `", "SHA256:\n\n`"),
  (s) =>
    s.replace(/SHA256: `[a-f0-9]{64}`/, "SHA256: `" + "0".repeat(64) + "`"),
  (s) => s.replace("| Manifest |", "| Changed |"),
  (s) =>
    s.replace(
      "Current registry dependency coordinates;",
      "Changed authored claim;",
    ),
])
  test("workspace digest exception rejects arbitrary prose/hash/table formatting", () => {
    const d = retryInput(2),
      p = Object.keys(d.baseChapters)[0];
    d.baseChapters[p] = mutate(d.baseChapters[p]);
    d.currentChapters[p] = d.baseChapters[p];
    const before = structuredClone(d);
    assert.throws(() => prepareWorkspaceIntake(d));
    assert.deepEqual(d, before);
  });
test("mixed immutable digest styles remain independently selected per chapter", () => {
  const d = retryInput(2),
    p = Object.keys(d.baseChapters)[0];
  d.currentChapters[p] = d.baseChapters[p] = d.baseChapters[p].replace(
    "SHA256: `",
    "SHA256:\n`",
  );
  const first = prepareWorkspaceIntake(d);
  assert.match(first.outputs[p], /SHA256:\n`[a-f0-9]{64}`/);
  assert.match(
    first.outputs[Object.keys(d.baseChapters)[1]],
    /SHA256: `[a-f0-9]{64}`/,
  );
  assert.deepEqual(
    prepareWorkspaceIntake({ ...d, currentChapters: first.outputs }).outputs,
    first.outputs,
  );
});
