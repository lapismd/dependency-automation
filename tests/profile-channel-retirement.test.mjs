import assert from "node:assert/strict";
import test from "node:test";
import { channelFixture, options, revision } from "./channel-fixtures.mjs";
import { observedPublication } from "./publication-fixtures.mjs";
import {
  channelProjection,
  loadChannelPolicy,
  validateChannelPolicy,
} from "../src/channels.mjs";
import { planWaves, emptyState } from "../src/waves.mjs";

const name = "@lapis-notes/app-profile";
const pin = {
  name,
  version: "0.2.5",
  integrity:
    "sha512-MJpiiNcWzEtwauNE/Q3KMohGhnU3AwOgyEhpSwiEQWq0hRHMohBxWch49OvP+tcBitK+HOenrHTdci1I0tKdbw==",
  repository: "lapismd/lapis-notes",
  sourceSha: "5774c6abb250d4aa9ea77a08992639dc46ae2f2b",
};
function fixture(coreRange = "^0.13.4") {
  const graph = channelFixture(),
    repo = graph.repositories[0];
  let entry = repo.manifests.find((p) => p.manifest.name === name);
  if (!entry) {
    entry = {
      path: "packages/app-profile/package.json",
      manifest: {
        name,
        version: pin.version,
        dependencies: { "@lapismd/design-core": "^0.13.4" },
      },
    };
    repo.manifests.push(entry);
    repo.paths.push(entry.path);
    repo.lock.importers["packages/app-profile"] = {
      dependencies: { "@lapismd/design-core": { version: "0.13.4" } },
    };
    graph.packages.push({ ...entry, repository: repo.repository, name });
  }
  entry.manifest.dependencies["@lapismd/design-core"] = coreRange;
  const metadata = observedPublication(
    repo,
    { dependencies: entry.manifest.dependencies },
    entry.manifest,
  );
  metadata.integrity = pin.integrity;
  metadata.publication.proof.sourceSha = pin.sourceSha;
  metadata.publication.proof.subjectSha512 = Buffer.from(
    pin.integrity.slice(7),
    "base64",
  ).toString("hex");
  metadata.publication.channel = {
    policy: "latest",
    admitted: false,
    latest: "0.1.0",
    tags: ["next"],
  };
  graph.registry[name] = {
    "0.1.0": { integrity: "old" },
    [pin.version]: metadata,
  };
  graph.available[name] = ["0.1.0"];
  graph.stableCandidates[name] = ["0.1.0"];
  const state = emptyState();
  state.releases[name] = {
    name,
    repository: repo.repository,
    sourceSha: "c".repeat(40),
    baseline: "0.2.3",
    requires: [
      { name: "@lapismd/design-core", type: "dependencies", target: "0.13.4" },
    ],
    status: "waiting",
    policyRevision: revision,
  };
  return { graph, state, metadata, repo };
}
test("Profile025 is an exact publication-only cohort pin with no consumer scope", () => {
  const policy = loadChannelPolicy();
  assert.deepEqual(
    policy.cohort.packages.find((p) => p.name === name),
    pin,
  );
  assert.equal(
    policy.cohort.scopes.some((s) => s.name === name),
    false,
  );
  const changed = structuredClone(policy);
  changed.cohort.scopes.push({
    repository: "lapismd/lapis-server",
    path: "package.json",
    type: "dependencies",
    name,
  });
  assert.throws(() => validateChannelPolicy(changed));
});
test("verified Profile025 retires its own wait without admitting consumer updates, changing tags or duplicating replay", () => {
  const { graph, state } = fixture(),
    before = JSON.stringify(graph);
  const first = planWaves(graph, state, options),
    projection = channelProjection(graph);
  assert.equal(first.state.releases[name].status, "published");
  assert.equal(first.state.releases[name].version, pin.version);
  for (const repository of [
    "lapismd/lapis-server",
    "lapismd/lapis-desktop",
    "lapismd/lapis-notes",
    "lapismd/lapis-plugins",
  ])
    assert.deepEqual(
      projection.versions({
        repository,
        path: "package.json",
        type: "dependencies",
        name,
      }),
      ["0.1.0"],
    );
  assert.equal(JSON.stringify(graph), before);
  const replay = planWaves(graph, first.state, options);
  assert.deepEqual(replay.state.releases, first.state.releases);
  assert.deepEqual(replay.state.operations, first.state.operations);
});
for (const [reason, change] of [
  ["moved tag", (f) => (f.metadata.publication.channel.tags = [])],
  ["changed integrity", (f) => (f.metadata.integrity = "wrong")],
  [
    "changed source",
    (f) => (f.metadata.publication.proof.sourceSha = "f".repeat(40)),
  ],
  ["unknown proof", (f) => (f.metadata.publication.state = "unknown")],
  ["deprecated", (f) => (f.metadata.deprecated = "retired")],
  [
    "failed current CI",
    (f) =>
      (f.repo.evidence.checks = [
        { status: "completed", conclusion: "failure" },
      ]),
  ],
  [
    "pending current CI",
    (f) => (f.repo.evidence.checks = [{ status: "in_progress" }]),
  ],
  ["unchanged version", (f) => (f.state.releases[name].baseline = pin.version)],
  [
    "unmet dependency floor",
    (f) => (f.state.releases[name].requires[0].target = "0.13.5"),
  ],
  [
    "changed policy digest",
    (f) => (f.graph.channelPolicySha256 = "0".repeat(64)),
  ],
])
  test(`Profile025 retirement retains ${reason} hold`, () => {
    const f = fixture();
    change(f);
    assert.equal(
      planWaves(f.graph, f.state, options).state.releases[name].status,
      "waiting",
    );
  });

test("the observed compatible Core range still cannot satisfy a higher required release floor", () => {
  const f = fixture("^0.13.3");
  f.state.releases[name].baseline = "0.0.0";
  assert.equal(channelProjection(f.graph).publication(name, pin.version), true);
  assert.equal(
    f.repo.lock.importers["packages/app-profile"].dependencies[
      "@lapismd/design-core"
    ].version,
    "0.13.4",
  );
  assert.equal(
    planWaves(f.graph, f.state, options).state.releases[name].status,
    "waiting",
  );
});
