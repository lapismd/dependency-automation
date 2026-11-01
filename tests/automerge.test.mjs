import assert from "node:assert/strict";
import test from "node:test";
import { applyPackageRules } from "renovate/dist/util/package-rules/index.js";
import { repositoryConfig } from "../src/renovate.mjs";

test("Renovate permits compatible auto-merge and disables every breaking family", async () => {
  const name = "@lapismd/mira";
  const config = repositoryConfig(
    {
      repository: "lapismd/lapis-notes",
      paths: ["package.json"],
      manifests: [],
    },
    {
      packages: [{ repository: "lapismd/mira-mde", name }],
      available: {
        [name]: ["0.1.4", "0.1.5", "0.2.0", "1.4.0", "1.5.0", "2.0.0"],
      },
      unpublished: [],
      cycles: [],
    },
    "/automation",
  );
  for (const [currentVersion, newVersion, updateType, compatible] of [
    ["0.1.4", "0.1.5", "patch", true],
    ["1.4.0", "1.5.0", "minor", true],
    ["0.1.4", "0.2.0", "minor", false],
    ["1.4.0", "2.0.0", "major", false],
  ]) {
    const effective = await applyPackageRules({
      ...config,
      datasource: "npm",
      versioning: "npm",
      depName: name,
      packageName: name,
      currentValue: `^${currentVersion}`,
      currentVersion,
      newVersion,
      updateType,
    });
    assert.equal(
      effective.automerge,
      compatible,
      `${currentVersion} -> ${newVersion}`,
    );
    assert.equal(Boolean(effective.draftPR), !compatible);
    assert.equal(effective.ignoreTests, false);
    assert.equal(effective.platformAutomerge, false);
  }
});
