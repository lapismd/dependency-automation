import assert from "node:assert/strict";
import test from "node:test";
import { format } from "prettier";
import { changesetPath, writeChangeset } from "../src/changesets.mjs";
import { prepareCanonicalIntake } from "../src/canonical-intake.mjs";
import { prepareCanonicalFiles } from "../src/canonical-intake-files.mjs";
import { prepareWorkspaceIntake } from "../src/canonical-workspace.mjs";
import {
  retryInput,
  retryFilesystem,
} from "./helpers/canonical-retry-fixtures.mjs";

test("schema1 actual generated empty note survives filesystem repeat byte for byte", async (t) => {
  const f = await retryFilesystem(retryInput());
  t.after(f.remove);
  const first = await prepareCanonicalFiles(f.args);
  const note = await writeChangeset(f.root, [], {
    empty: true,
    scope: f.args.branchName,
  });
  assert.ok(note.startsWith("---\n---\n"));
  const before = await f.read(changesetPath(f.args.branchName));
  const second = await prepareCanonicalFiles(f.args);
  assert.deepEqual(second.outputs, first.outputs);
  assert.equal(await f.read(changesetPath(f.args.branchName)), before);
  for (const [p, bytes] of Object.entries(first.outputs))
    assert.equal(await f.read(p), bytes);
  assert.equal(
    Object.hasOwn(second.outputs, changesetPath(f.args.branchName)),
    false,
  );
});
test("schema2 always-wrapped digest style survives first and repeated preparation", async () => {
  const data = retryInput(2);
  for (const p of Object.keys(data.baseChapters))
    data.currentChapters[p] = data.baseChapters[p] = await format(
      data.baseChapters[p],
      { parser: "markdown", proseWrap: "always" },
    );
  const first = prepareWorkspaceIntake(data);
  for (const bytes of Object.values(first.outputs))
    assert.equal(
      await format(bytes, { parser: "markdown", proseWrap: "always" }),
      bytes,
    );
  assert.deepEqual(
    prepareWorkspaceIntake({ ...data, currentChapters: first.outputs }).outputs,
    first.outputs,
  );
});
for (const [name, mutate] of [
  ["wrong branch", (d) => (d.branchName += "-other")],
  ["missing scope", (d) => delete d.branchName],
  [
    "multiple notes",
    (d) => d.changedFiles.push(".changeset/lapis-dependencies-ffffffffffff.md"),
  ],
  [
    "arbitrary note",
    (d) => d.changedFiles.push(".changeset/authored-product.md"),
  ],
  ["missing bytes", (d, p) => delete d.after[p]],
  ["null", (d, p) => (d.after[p] = "---\nnull\n---\n")],
  ["array", (d, p) => (d.after[p] = "---\n[]\n---\n")],
  [
    "nonempty",
    (d, p) =>
      (d.after[p] = '---\n"product": patch\n---\nKeep authored intent.\n'),
  ],
  ["malformed", (d, p) => (d.after[p] = "---\n{\n---\n")],
  ["preamble", (d, p) => (d.after[p] = "Preamble\n---\n---\n")],
  ["oversized UTF8", (d, p) => (d.after[p] = "---\n---\n" + "é".repeat(4096))],
])
  test(
    "schema1 maintenance retry rejects " + name + " without mutating any input",
    () => {
      const d = retryInput(),
        p = changesetPath(d.branchName);
      d.changedFiles.push(p);
      d.after[p] = "---\n---\n\nBody\n";
      mutate(d, p);
      const before = structuredClone(d);
      assert.throws(() => prepareCanonicalIntake(d));
      assert.deepEqual(d, before);
    },
  );
