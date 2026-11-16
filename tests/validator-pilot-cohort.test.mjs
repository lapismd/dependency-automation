import assert from "node:assert/strict";
import test from "node:test";
import { loadToolingPolicy, guardToolingChange } from "../src/tooling.mjs";
const policy = await loadToolingPolicy();
const name = "@lapismd/spec-validator";
const snapshot = (repository, version) => ({
  repository,
  toolingInputs: [],
  manifests: [
    {
      path: "package.json",
      manifest: {
        name: "source-fixture",
        private: true,
        packageManager: "pnpm@" + policy.repositories[repository].pnpm,
        devDependencies: { [name]: "^" + version },
      },
    },
  ],
  lock: {
    importers: {
      ".": {
        devDependencies: { [name]: { specifier: "^" + version, version } },
      },
    },
  },
});
for (const [label, repo] of [
  ["Plugins", "lapismd/lapis-plugins"],
  ["Mira", "lapismd/mira-mde"],
  ["Core", "lapismd/design-core"],
  ["Notes", "lapismd/lapis-notes"],
  ["Notebook", "lapismd/lapis-plugin-notebook"],
]) {
  test(`${label} pilot admits only the reviewed Deno-free validator patch without changing drift gates`, () => {
    const before = snapshot(repo, "0.2.0");
    assert.doesNotThrow(() =>
      guardToolingChange(before, snapshot(repo, "0.2.1"), policy),
    );
    for (const version of ["0.2.2", "0.3.0"])
      assert.throws(
        () => guardToolingChange(before, snapshot(repo, version), policy),
        /cohort drift/,
      );
    const unsafe = snapshot(repo, "0.2.1");
    unsafe.toolingInputs = ["deno.json"];
    assert.throws(
      () => guardToolingChange(before, unsafe, policy),
      /Deno formatter/,
    );
  });
}
