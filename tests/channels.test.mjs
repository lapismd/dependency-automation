import test from "node:test";
import assert from "node:assert/strict";
const module = await import("../src/channels.mjs").catch(() => ({}));
test("exact reviewed Notes cohort has scoped channel eligibility without mutating default latest facts", async () => {
  assert.equal(typeof module.channelProjection, "function");
  const policy = module.loadChannelPolicy();
  assert.equal(policy.default, "latest");
  assert.equal(policy.cohort.packages.length, 5);
  assert.equal(
    policy.cohort.scopes.some((s) => s.repository === "lapismd/lapis-desktop"),
    false,
  );
});
test("unknown cohort policy keys, mutable versions and extra scopes fail closed", () => {
  assert.equal(typeof module.validateChannelPolicy, "function");
  const policy = module.loadChannelPolicy();
  for (const change of [
    (p) => {
      p.default = "next";
    },
    (p) => {
      p.cohort.packages[0].version = "latest";
    },
    (p) => {
      p.cohort.scopes[0].path = "../package.json";
    },
    (p) => {
      p.cohort.unknown = true;
    },
  ]) {
    const changed = structuredClone(policy);
    change(changed);
    assert.throws(() => module.validateChannelPolicy(changed));
  }
});
import {
  channelProjection,
  revalidateChannels,
  loadChannelPolicy,
  channelPolicyDigest,
} from "../src/channels.mjs";
import { channelFixture, options, revision } from "./channel-fixtures.mjs";
import { planWaves, emptyState } from "../src/waves.mjs";
import { repositoryConfig } from "../src/renovate.mjs";
import { stableVersions } from "../src/policy.mjs";
const api = "@lapis-notes/api";
const edge = {
  repository: "lapismd/lapis-plugins",
  path: "package.json",
  type: "devDependencies",
  name: api,
};
test("exact scope admits reviewed four versions while missing/changed contexts retain latest", () => {
  const g = channelFixture(),
    before = JSON.stringify(g);
  const c = channelProjection(g);
  assert.deepEqual(c.versions(edge), ["0.1.0", "0.6.7"]);
  for (const changed of [
    { repository: "lapismd/lapis-desktop" },
    { path: "packages/other/package.json" },
    { type: "dependencies" },
    { repository: "lapismd/plugin-registry" },
  ])
    assert.deepEqual(c.versions({ ...edge, ...changed }), ["0.1.0"]);
  assert.equal(JSON.stringify(g), before);
  assert.deepEqual(g.available[api], ["0.1.0"]);
  assert.deepEqual(
    stableVersions({
      "dist-tags": { latest: "0.1.0", next: "0.6.7" },
      versions: { "0.1.0": {}, "0.6.7": {} },
    }),
    ["0.1.0"],
  );
});
for (const [name, change] of [
  ["wrong digest", (g) => (g.channelPolicySha256 = "0".repeat(64))],
  ["missing pool", (g) => delete g.stableCandidates],
  [
    "moved channel",
    (g) => (g.registry[api]["0.6.7"].publication.channel.tags = []),
  ],
  ["changed integrity", (g) => (g.registry[api]["0.6.7"].integrity = "wrong")],
  ["deprecated", (g) => (g.registry[api]["0.6.7"].deprecated = "retired")],
  [
    "unverified proof",
    (g) => (g.registry[api]["0.6.7"].publication.state = "unknown"),
  ],
  [
    "wrong source proof",
    (g) =>
      (g.registry[api]["0.6.7"].publication.proof.sourceSha = "0".repeat(40)),
  ],
  [
    "changed current source",
    (g) => (g.repositories[0].sourceSha = "f".repeat(40)),
  ],
  ["private publisher", (g) => (g.repositories[0].visibility = "private")],
])
  test("cohort remains held for " + name, () => {
    const g = channelFixture();
    change(g);
    assert.deepEqual(channelProjection(g).versions(edge), ["0.1.0"]);
  });
test("path-local prerequisite closure cannot leak an approved next provider to another path", () => {
  const g = channelFixture();
  g.registry["@lapismd/test"] = {
    "1.0.0": { dependencies: { [api]: "^0.6.6" } },
  };
  g.stableCandidates["@lapismd/test"] = ["1.0.0"];
  g.available["@lapismd/test"] = [];
  const c = channelProjection(g);
  assert.deepEqual(c.versions({ ...edge, name: "@lapismd/test" }), ["1.0.0"]);
  assert.deepEqual(
    c.versions({
      ...edge,
      path: "packages/other/package.json",
      name: "@lapismd/test",
    }),
    [],
  );
});
test("missing or malformed channel facts hold the cohort without aborting other consumers", () => {
  for (const change of [
    (g) => delete g.registry[api]["0.6.7"].publication.channel,
    (g) => delete g.registry[api]["0.6.7"].publication.channel.tags,
    (g) => {
      g.registry[api]["0.6.7"].publication.channel.tags = "next";
    },
  ]) {
    const g = channelFixture();
    change(g);
    assert.deepEqual(channelProjection(g).versions(edge), ["0.1.0"]);
  }
});
test("wave rules use exact scoped targets, retain breaking drafts and leave flat latest protection", () => {
  const g = channelFixture(),
    plan = planWaves(g, emptyState(), options);
  g.waveAdmission = plan.report;
  const repo = g.repositories[1],
    node = plan.report.nodes[1];
  assert.equal(node.status, "admitted");
  assert.equal(node.admittedUpdates.length, 4);
  assert(node.updates.every((u) => u.compatibility === "breaking"));
  const config = repositoryConfig(repo, g, "/tmp/coordinator");
  assert.equal(config.respectLatest, true);
  const rules = config.packageRules.filter((r) => r.respectLatest === false);
  assert.equal(rules.length, 4);
  assert(
    rules.every(
      (r) =>
        r.matchFileNames[0] === "package.json" &&
        r.matchDepTypes[0] === "devDependencies",
    ),
  );
  assert(
    config.packageRules.some(
      (r) => r.draftPR === true && r.automerge === false,
    ),
  );
  delete g.waveAdmission;
  assert(
    !repositoryConfig(repo, g, "/tmp/coordinator").packageRules.some(
      (r) => r.respectLatest === false,
    ),
  );
});
test("cohort evidence retires only genuinely newer release waits, retaining CI and intended floors", () => {
  const g = channelFixture(),
    state = emptyState();
  state.releases[api] = {
    name: api,
    repository: "lapismd/lapis-notes",
    sourceSha: "c".repeat(40),
    baseline: "0.1.0",
    requires: [
      { name: "@lapismd/design-core", type: "dependencies", target: "0.13.4" },
    ],
    status: "waiting",
    policyRevision: revision,
  };
  assert.equal(
    planWaves(g, state, options).state.releases[api].status,
    "published",
  );
  for (const change of [
    (x) => {
      x.repositories[0].evidence.checks = [{ status: "in_progress" }];
    },
    (x) => {
      x.repositories[0].evidence.checks = [
        { status: "completed", conclusion: "failure" },
      ];
    },
  ]) {
    const copy = structuredClone(g);
    change(copy);
    assert.equal(
      planWaves(copy, state, options).state.releases[api].status,
      "waiting",
    );
  }
  const newer = structuredClone(state);
  newer.releases[api].requires[0].target = "0.13.5";
  assert.equal(
    planWaves(g, newer, options).state.releases[api].status,
    "waiting",
  );
});
test("writer registry refresh rejects moved tags, wrong identity and deprecated coordinates", async () => {
  const policy = loadChannelPolicy(),
    g = channelFixture();
  for (const wrong of ["tag", "integrity", "name", "deprecated", "transport"]) {
    const fetcher = async (url) => {
      if (wrong === "transport") return new Response(null, { status: 500 });
      const pin = policy.cohort.packages.find((p) =>
        url.includes(encodeURIComponent(p.name)),
      );
      return Response.json(
        url.endsWith("/dist-tags")
          ? { next: wrong === "tag" ? "9.0.0" : pin.version }
          : {
              name: wrong === "name" ? "@lapis-notes/other" : pin.name,
              version: pin.version,
              dist: {
                integrity: wrong === "integrity" ? "wrong" : pin.integrity,
              },
              ...(wrong === "deprecated" ? { deprecated: "retired" } : {}),
            },
      );
    };
    await assert.rejects(revalidateChannels(g, { fetcher }));
  }
  const seen = [];
  await revalidateChannels(g, {
    fetcher: async (url) => {
      seen.push(url);
      const p = policy.cohort.packages.find((p) =>
        url.includes(encodeURIComponent(p.name)),
      );
      return Response.json(
        url.endsWith("/dist-tags")
          ? { next: p.version }
          : {
              name: p.name,
              version: p.version,
              dist: { integrity: p.integrity },
            },
      );
    },
  });
  assert.equal(seen.length, 10);
  const stale = structuredClone(g);
  stale.channelPolicySha256 = "0".repeat(64);
  await assert.rejects(revalidateChannels(stale), /policy changed/);
  assert.equal(g.channelPolicySha256, channelPolicyDigest());
});
