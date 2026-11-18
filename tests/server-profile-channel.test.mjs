import assert from "node:assert/strict";
import test from "node:test";
import { channelFixture, options, revision } from "./channel-fixtures.mjs";
import { emptyState, planWaves } from "../src/waves.mjs";
import {
  channelPolicyDigest,
  channelProjection,
  loadChannelPolicy,
  validateChannelPolicy,
} from "../src/channels.mjs";

const name = "@lapis-notes/app-profile";
const scope = {
  repository: "lapismd/lapis-server",
  path: "package.json",
  type: "dependencies",
  name,
};

test("reviewed Profile consumption is registered only for Server's root runtime dependency", () => {
  assert.deepEqual(
    loadChannelPolicy().cohort.scopes.filter((entry) => entry.name === name),
    [scope],
  );
});

test("Server can consume the exact verified Profile pin without rewriting registry observations", () => {
  const graph = channelFixture();
  const before = JSON.stringify(graph);
  const projection = channelProjection(graph);
  assert.deepEqual(projection.versions(scope), ["0.1.0", "0.2.6"]);
  assert.equal(projection.approved(scope, "0.2.6"), true);
  assert.deepEqual(graph.available[name], ["0.1.0"]);
  assert.equal(
    graph.registry[name]["0.2.6"].publication.channel.admitted,
    false,
  );
  assert.equal(JSON.stringify(graph), before);
});

for (const change of [
  { repository: "lapismd/lapis-notes" },
  { repository: "lapismd/lapis-plugins" },
  { repository: "lapismd/lapis-desktop" },
  { repository: "lapismd/lapis-plugin-docs" },
  { path: "packages/app/package.json" },
  { type: "devDependencies" },
  { type: "optionalDependencies" },
  { type: "peerDependencies" },
]) {
  test(`Profile policy rejects unreviewed scope ${JSON.stringify(change)}`, () => {
    const policy = loadChannelPolicy();
    policy.cohort.scopes = policy.cohort.scopes.filter(
      (entry) => entry.name !== name,
    );
    policy.cohort.scopes.push({ ...scope, ...change });
    assert.throws(() => validateChannelPolicy(policy));
  });
  test(`Profile projection cannot leak into ${JSON.stringify(change)}`, () => {
    assert.deepEqual(
      channelProjection(channelFixture()).versions({ ...scope, ...change }),
      ["0.1.0"],
    );
  });
}

for (const [reason, mutate] of [
  [
    "moved next tag",
    (graph) => {
      graph.registry[name]["0.2.6"].publication.channel.tags = [];
    },
  ],
  [
    "wrong integrity",
    (graph) => {
      graph.registry[name]["0.2.6"].integrity = "wrong";
    },
  ],
  [
    "wrong source",
    (graph) => {
      graph.registry[name]["0.2.6"].publication.proof.sourceSha = "f".repeat(
        40,
      );
    },
  ],
  [
    "unknown proof",
    (graph) => {
      graph.registry[name]["0.2.6"].publication.state = "unknown";
    },
  ],
  [
    "deprecated package",
    (graph) => {
      graph.registry[name]["0.2.6"].deprecated = "retired";
    },
  ],
  [
    "private publisher",
    (graph) => {
      graph.repositories[0].visibility = "private";
    },
  ],
  [
    "stale policy digest",
    (graph) => {
      graph.channelPolicySha256 = "0".repeat(64);
    },
  ],
]) {
  test(`Server Profile scope retains ${reason} hold`, () => {
    const graph = channelFixture();
    mutate(graph);
    assert.deepEqual(channelProjection(graph).versions(scope), ["0.1.0"]);
  });
}

test("Server Profile scope retains failed publisher source hold at wave qualification", () => {
  const graph = channelFixture();
  const state = emptyState();
  state.releases[name] = {
    name,
    repository: "lapismd/lapis-notes",
    sourceSha: "c".repeat(40),
    baseline: "0.2.3",
    requires: [
      { name: "@lapismd/design-core", type: "dependencies", target: "0.13.4" },
    ],
    status: "waiting",
    policyRevision: revision,
  };
  assert.equal(
    planWaves(graph, state, options).state.releases[name].status,
    "published",
  );
  graph.repositories[0].evidence.checks = [
    { status: "completed", conclusion: "failure" },
  ];
  const failed = planWaves(graph, state, options);
  assert.equal(failed.state.releases[name].status, "waiting");
  assert.equal(failed.report.nodes[0].acceptance.state, "failed");
});

test("removing the reviewed Server scope revokes direct consumption even with verified publication", () => {
  const policy = loadChannelPolicy();
  policy.cohort.scopes = policy.cohort.scopes.filter(
    (entry) => entry.name !== name,
  );
  const graph = channelFixture();
  graph.channelPolicySha256 = channelPolicyDigest(policy);
  const projection = channelProjection(graph, policy);
  assert.equal(projection.publication(name, "0.2.6"), true);
  assert.deepEqual(projection.versions(scope), ["0.1.0"]);
});
