import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";
import YAML from "yaml";
import {
  prepareWorkspaceIntake,
  workspaceIntakeFacts,
  workspaceIntakeSlot,
} from "../src/canonical-workspace.mjs";

const fixture = JSON.parse(
  gunzipSync(
    readFileSync(
      new URL("./fixtures/notes-core0135-intake.json.gz", import.meta.url),
    ),
  ),
);
const chapter = "spec/src/dependencies.md";
const policy = {
  schemaVersion: 2,
  kind: "workspace-dependency-intake",
  lockClosure: "registry-transitives",
  repository: fixture.repository,
  slot: "framework-registry",
  dependencies: ["@lapismd/design-core"],
  manifests: fixture.manifests,
  chapters: [chapter],
};
function input(padding, update = true) {
  const policyBytes = JSON.stringify(policy) + "\n";
  const before = structuredClone(fixture.before);
  const after = structuredClone(update ? fixture.after : fixture.before);
  const body =
    "# Source contract\n\n" +
    padding +
    "\n" +
    workspaceIntakeSlot(policy, workspaceIntakeFacts(policy, before)) +
    "\nAuthored ending.\n";
  const integrity = YAML.parse(fixture.after["pnpm-lock.yaml"]).packages[
    "@lapismd/design-core@0.13.5"
  ].resolution.integrity;
  return {
    repository: fixture.repository,
    sourceSha: fixture.sourceSha,
    headSha: fixture.sourceSha,
    policyBytes,
    currentPolicyBytes: policyBytes,
    before,
    after,
    baseChapters: { [chapter]: body },
    currentChapters: { [chapter]: body },
    changedFiles: update
      ? Object.keys(before).filter((p) => before[p] !== after[p])
      : [],
    admittedUpdates: update
      ? ["api", "ui", "web", "workspace"].map((name) => ({
          repository: fixture.repository,
          path: `packages/${name}/package.json`,
          type: "dependencies",
          name: "@lapismd/design-core",
          current: "0.13.4",
          target: "0.13.5",
          targetRange: "^0.13.5",
          compatibility: "compatible",
          integrity,
        }))
      : [],
  };
}
for (const [label, padding] of [
  ["line", "Authored contract.\n".repeat(450)],
  ["byte", "Authored contract. ".repeat(2200)],
]) {
  for (const update of [false, true]) {
    test(`workspace intake preserves non-growing legacy ${label} size on ${update ? "released patch" : "no-op"}`, () => {
      const data = input(padding, update);
      const output = prepareWorkspaceIntake(data).outputs[chapter];
      assert(output.startsWith("# Source contract\n\n" + padding));
      assert(output.endsWith("Authored ending.\n"));
      assert.equal(
        output.split("\n").length,
        data.baseChapters[chapter].split("\n").length,
      );
      assert.equal(
        Buffer.byteLength(output),
        Buffer.byteLength(data.baseChapters[chapter]),
      );
      if (!update) assert.equal(output, data.baseChapters[chapter]);
    });
  }
}
function expandRange(data, range) {
  const path = "packages/api/package.json";
  const manifest = JSON.parse(data.after[path]);
  manifest.dependencies["@lapismd/design-core"] = range;
  data.after[path] = JSON.stringify(manifest);
  const lock = YAML.parse(data.after["pnpm-lock.yaml"]);
  lock.importers["packages/api"].dependencies[
    "@lapismd/design-core"
  ].specifier = range;
  data.after["pnpm-lock.yaml"] = YAML.stringify(lock);
  data.admittedUpdates.find((u) => u.path === path).targetRange = range;
}
for (const [label, padding, range] of [
  ["byte", "Authored contract. ".repeat(2200), ">=0.13.5 <0.14.0"],
  ["line", "Authored contract.\n".repeat(450), ">=0.13.5\n<0.14.0"],
]) {
  test(`workspace intake rejects growing legacy ${label} size`, () => {
    const data = input(padding);
    expandRange(data, range);
    assert.throws(
      () => prepareWorkspaceIntake(data),
      /canonical chapter exceeds size bound/,
    );
  });
}
test("workspace intake retains the default byte cap when facts grow", () => {
  const data = input("");
  const before = data.baseChapters[chapter];
  const padding = "x".repeat(32768 - Buffer.byteLength(before));
  data.baseChapters[chapter] = data.currentChapters[chapter] = padding + before;
  expandRange(data, ">=0.13.5 <0.14.0");
  assert.throws(
    () => prepareWorkspaceIntake(data),
    /canonical chapter exceeds size bound/,
  );
});
test("legacy size admission never accepts a manual authored-content change", () => {
  const data = input("Authored contract.\n".repeat(450));
  data.currentChapters[chapter] = data.currentChapters[chapter].replace(
    "Authored ending.",
    "Edited ending.",
  );
  assert.throws(() => prepareWorkspaceIntake(data), /manual canonical edits/);
});

test("an overlong legacy chapter cannot grow bytes below the ordinary byte cap", () => {
  const data = input("Authored contract.\n".repeat(450));
  assert(Buffer.byteLength(data.baseChapters[chapter]) < 32768);
  expandRange(data, ">=0.13.5 <0.14.0");
  assert.throws(
    () => prepareWorkspaceIntake(data),
    /canonical chapter exceeds size bound/,
  );
});
test("workspace intake retains the default line cap when facts grow", () => {
  const data = input("");
  const before = data.baseChapters[chapter];
  const padding = "Authored.\n".repeat(400 - before.split("\n").length);
  data.baseChapters[chapter] = data.currentChapters[chapter] = padding + before;
  assert.equal(data.baseChapters[chapter].split("\n").length, 400);
  expandRange(data, ">=0.13.5\n<0.14.0");
  assert.throws(
    () => prepareWorkspaceIntake(data),
    /canonical chapter exceeds size bound/,
  );
});
