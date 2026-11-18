import assert from "node:assert/strict";
import test from "node:test";
import { channelFixture } from "./channel-fixtures.mjs";
import { intakeHash } from "../src/canonical-intake.mjs";
import {
  canonicalPreparationHold,
  canonicalDevelopmentUpdate,
} from "../src/canonical-admission.mjs";

const core = "@lapismd/design-core";
const identity = "sha512-" + Buffer.alloc(64, 9).toString("base64");
function fixture() {
  const graph = channelFixture(),
    repo = graph.repositories[1];
  const coordinates = [
    ["@lapis-notes/api", "0.6.7", "0.6.9"],
    ["@lapis-notes/ui", "0.2.2", "0.2.4"],
    ["@lapis-notes/workspace", "0.4.7", "0.4.8"],
    [core, "0.13.4", "0.13.5"],
  ];
  const manifest = repo.manifests[0].manifest;
  repo.lock.packages = {};
  const updates = coordinates.map(([name, current, target]) => {
    manifest.devDependencies[name] = `^${current}`;
    repo.lock.importers["."].devDependencies[name] = {
      specifier: `^${current}`,
      version: current,
    };
    repo.lock.packages[`${name}@${current}`] = {
      resolution: { integrity: identity },
    };
    return {
      name,
      current,
      target,
      range: `^${current}`,
      targetRange: `^${target}`,
      repository: repo.repository,
      path: "package.json",
      type: "devDependencies",
      compatibility: "compatible",
      updateType: "patch",
      releaseIntent: null,
    };
  });
  graph.available[core] = ["0.13.4", "0.13.5"];
  graph.stableCandidates[core] = ["0.13.4", "0.13.5"];
  graph.registry[core]["0.13.5"] = { integrity: identity };
  const policy = {
    schemaVersion: 2,
    kind: "workspace-dependency-intake",
    lockClosure: "registry-transitives",
    repository: repo.repository,
    slot: "framework-registry",
    dependencies: coordinates.map(([name]) => name),
    manifests: ["package.json"],
    chapters: ["spec/src/packages.md", "spec/src/governance.md"],
  };
  const policyBytes = JSON.stringify(policy);
  repo.canonicalIntake = {
    policy,
    policyBytes,
    sha256: intakeHash(policyBytes),
  };
  const node = {
    repository: repo.repository,
    sourceSha: repo.sourceSha,
    updates,
    acceptance: { state: "qualified" },
    holds: [],
    waits: [
      {
        package: "@lapis-notes/api",
        reason: "upstream qualification required",
      },
    ],
  };
  return { graph, repo, node };
}

test("canonical workspace preparation accepts reviewed scoped channel patches without changing raw availability or waits", () => {
  const f = fixture(),
    before = JSON.stringify(f);
  assert.deepEqual(f.graph.available["@lapis-notes/api"], ["0.1.0"]);
  assert.equal(canonicalPreparationHold(f.repo, f.node, f.graph), null);
  assert.equal(canonicalDevelopmentUpdate(f.repo, f.node, f.graph), false);
  assert.equal(JSON.stringify(f), before);
});

for (const [label, change] of [
  [
    "forged integrity",
    (f) => {
      f.graph.registry["@lapis-notes/api"]["0.6.9"].integrity = identity;
    },
  ],
  [
    "moved channel",
    (f) => {
      f.graph.registry["@lapis-notes/api"]["0.6.9"].publication.channel.tags =
        [];
    },
  ],
  [
    "wrong attested source",
    (f) => {
      f.graph.registry["@lapis-notes/api"][
        "0.6.9"
      ].publication.proof.sourceSha = "f".repeat(40);
    },
  ],
  [
    "unknown publication",
    (f) => {
      f.graph.registry["@lapis-notes/api"]["0.6.9"].publication.state =
        "unknown";
    },
  ],
  [
    "stale policy",
    (f) => {
      f.graph.channelPolicySha256 = "0".repeat(64);
    },
  ],
  [
    "wrong exact dependency type",
    (f) => {
      const m = f.repo.manifests[0].manifest,
        entry = f.repo.lock.importers["."];
      m.dependencies = {
        "@lapis-notes/api": m.devDependencies["@lapis-notes/api"],
      };
      delete m.devDependencies["@lapis-notes/api"];
      entry.dependencies = {
        "@lapis-notes/api": entry.devDependencies["@lapis-notes/api"],
      };
      delete entry.devDependencies["@lapis-notes/api"];
      f.node.updates[0].type = "dependencies";
    },
  ],
  [
    "unscoped repository",
    (f) => {
      const repository = "lapismd/plugin-registry";
      f.repo.repository = f.node.repository = repository;
      for (const update of f.node.updates) update.repository = repository;
      f.repo.canonicalIntake.policy.repository = repository;
      f.repo.canonicalIntake.policyBytes = JSON.stringify(
        f.repo.canonicalIntake.policy,
      );
      f.repo.canonicalIntake.sha256 = intakeHash(
        f.repo.canonicalIntake.policyBytes,
      );
    },
  ],
])
  test(`canonical workspace channel preparation preserves ${label} hold`, () => {
    const f = fixture();
    change(f);
    assert.match(
      canonicalPreparationHold(f.repo, f.node, f.graph),
      /does not support/,
    );
  });
