import assert from "node:assert/strict";
import test from "node:test";
import { channelFixture, options, revision } from "./channel-fixtures.mjs";
import { observedPublication } from "./publication-fixtures.mjs";
import { channelProjection } from "../src/channels.mjs";
import { planWaves, emptyState } from "../src/waves.mjs";

const name = "@lapis-notes/bases",
  api = "@lapis-notes/api",
  core = "@lapismd/design-core",
  mermaid = "@lapismd/mira-plugin-mermaid";
function fixture(compound = false) {
  const graph = channelFixture(),
    repo = graph.repositories[1];
  const manifest = {
    name,
    version: "0.4.2",
    dependencies: {
      [core]: compound ? "^0.9.0 || ^0.13.0" : "^0.13.4",
      ...(compound ? { [mermaid]: "~0.0.5" } : {}),
    },
    peerDependencies: { [api]: "^0.6.0" },
  };
  const entry = { path: "packages/bases/package.json", manifest };
  repo.manifests.push(entry);
  repo.paths.push(entry.path);
  repo.lock.importers["packages/bases"] = {
    dependencies: {
      [core]: { version: "0.13.4" },
      ...(compound ? { [mermaid]: { version: "0.0.5" } } : {}),
    },
  };
  graph.packages.push({ ...entry, repository: repo.repository, name });
  graph.registry[name] = {
    [manifest.version]: observedPublication(
      repo,
      {
        dependencies: manifest.dependencies,
        peerDependencies: manifest.peerDependencies,
      },
      manifest,
    ),
  };
  graph.stableCandidates[name] = [manifest.version];
  graph.available[name] = [];
  if (compound) {
    graph.registry[mermaid] = { "0.0.5": { integrity: "stable" } };
    graph.available[mermaid] = ["0.0.5"];
    graph.stableCandidates[mermaid] = ["0.0.5"];
  }
  const state = emptyState();
  state.releases[name] = {
    name,
    repository: repo.repository,
    sourceSha: "c".repeat(40),
    baseline: "0.4.1",
    requires: [
      { name: core, type: "dependencies", target: "0.13.4" },
      ...(compound
        ? [{ name: mermaid, type: "dependencies", target: "0.0.5" }]
        : []),
    ],
    status: "waiting",
    policyRevision: revision,
  };
  const refreshProof = () =>
    (graph.registry[name][manifest.version] = observedPublication(
      repo,
      {
        dependencies: manifest.dependencies,
        peerDependencies: manifest.peerDependencies,
      },
      manifest,
    ));
  return {
    graph,
    repo,
    manifest,
    entry,
    state,
    refreshProof,
    plan: () => planWaves(graph, state, options),
  };
}

function requireProviderUi(f, range = "^0.2.2") {
  const notes = f.graph.repositories[0],
    entry = notes.manifests.find((p) => p.manifest.name === api);
  const previous = f.graph.registry[api][entry.manifest.version];
  entry.manifest.peerDependencies = { "@lapis-notes/ui": range };
  const metadata = observedPublication(
    notes,
    {
      dependencies: entry.manifest.dependencies,
      peerDependencies: entry.manifest.peerDependencies,
    },
    entry.manifest,
  );
  metadata.integrity = previous.integrity;
  metadata.publication.proof.subjectSha512 =
    previous.publication.proof.subjectSha512;
  metadata.publication.proof.sourceSha = previous.publication.proof.sourceSha;
  metadata.publication.channel = previous.publication.channel;
  f.graph.registry[api][entry.manifest.version] = metadata;
}

test("an approved API prerequisite may borrow only its verified cohort peer without directly admitting that peer", () => {
  const f = fixture();
  requireProviderUi(f);
  assert.equal(f.plan().state.releases[name].status, "published");
  const projection = channelProjection(f.graph);
  assert(
    projection
      .versions({
        repository: f.repo.repository,
        path: f.entry.path,
        type: "peerDependencies",
        name: api,
      })
      .includes("0.6.7"),
  );
  assert.deepEqual(
    projection.versions({
      repository: f.repo.repository,
      path: f.entry.path,
      type: "peerDependencies",
      name: "@lapis-notes/ui",
    }),
    ["0.1.0"],
  );
  assert.deepEqual(f.graph.available["@lapis-notes/ui"], ["0.1.0"]);
});

test("transitive closure cannot borrow a version outside the exact reviewed cohort", () => {
  const f = fixture();
  requireProviderUi(f, "^0.2.3");
  f.graph.registry["@lapis-notes/ui"]["0.2.3"] = {
    integrity: "unreviewed",
    dependencies: { [core]: "^0.13.4" },
  };
  assert.equal(f.plan().state.releases[name].status, "waiting");
});

test("replaying settled publisher observations does not create another release or operation", () => {
  const f = fixture(true),
    first = f.plan(),
    replay = planWaves(f.graph, first.state, options);
  assert.deepEqual(replay.state.releases, first.state.releases);
  assert.deepEqual(
    Object.keys(replay.state.operations).sort(),
    Object.keys(first.state.operations).sort(),
  );
});

for (const change of [
  (f) =>
    (f.graph.registry["@lapis-notes/ui"]["0.2.2"].publication.state =
      "unknown"),
  (f) =>
    (f.graph.registry["@lapis-notes/ui"]["0.2.2"].publication.channel.tags =
      []),
  (f) => (f.graph.registry["@lapis-notes/ui"]["0.2.2"].deprecated = "retired"),
])
  test("transitive cohort prerequisites retain their own fresh proof and channel gates", () => {
    const f = fixture();
    requireProviderUi(f);
    change(f);
    assert.equal(f.plan().state.releases[name].status, "waiting");
  });

test("a verified latest publication retires its wait using only its publisher's approved prerequisite scope", () => {
  const f = fixture(),
    before = JSON.stringify(f.graph),
    result = f.plan();
  assert.equal(result.state.releases[name].status, "published");
  assert.equal(result.state.releases[name].version, "0.4.2");
  assert.equal(JSON.stringify(f.graph), before);
  assert.deepEqual(f.graph.available[name], []);
  assert.equal(
    f.graph.registry[api]["0.6.7"].publication.channel.admitted,
    false,
  );
  assert.deepEqual(
    channelProjection(f.graph).versions({
      repository: "lapismd/plugin-registry",
      path: "package.json",
      type: "dependencies",
      name,
    }),
    [],
  );
});

test("a genuine newer mixed release carries its ordinary floor and unchanged compound support with the qualified lock", () => {
  const f = fixture(true),
    result = f.plan();
  assert.equal(result.state.releases[name].status, "published");
  assert.equal(result.state.releases[name].baseline, "0.4.1");
  assert.equal(result.state.releases[name].requires.length, 2);
});

test("an all-compound obsolete wait is superseded without claiming a new publication", () => {
  const f = fixture(true);
  delete f.manifest.dependencies[mermaid];
  f.state.releases[name].requires.pop();
  f.state.releases[name].baseline = f.manifest.version;
  f.refreshProof();
  assert.equal(f.plan().state.releases[name].status, "superseded");
});

for (const [label, edit] of [
  [
    "wrong policy digest",
    (f) => (f.graph.channelPolicySha256 = "0".repeat(64)),
  ],
  ["missing stable candidate pool", (f) => delete f.graph.stableCandidates],
  [
    "moved next tag",
    (f) => (f.graph.registry[api]["0.6.7"].publication.channel.tags = []),
  ],
  [
    "unverified provider",
    (f) => (f.graph.registry[api]["0.6.7"].publication.state = "unknown"),
  ],
  [
    "deprecated provider",
    (f) => (f.graph.registry[api]["0.6.7"].deprecated = "retired"),
  ],
  [
    "wrong publisher path",
    (f) => {
      f.entry.path = "packages/unreviewed/package.json";
      f.graph.packages.at(-1).path = f.entry.path;
    },
  ],
  [
    "wrong dependency type",
    (f) => {
      f.manifest.dependencies[api] = f.manifest.peerDependencies[api];
      delete f.manifest.peerDependencies[api];
      f.refreshProof();
    },
  ],
  [
    "pending current CI",
    (f) => {
      f.repo.evidence.runs[0].status = "in_progress";
      f.repo.evidence.runs[0].conclusion = null;
    },
  ],
  [
    "unverified own publication",
    (f) =>
      (f.graph.registry[name][f.manifest.version].publication.state =
        "unknown"),
  ],
  [
    "missing compound lock",
    (f) => delete f.repo.lock.importers["packages/bases"].dependencies[core],
  ],
  [
    "old compound lock",
    (f) =>
      (f.repo.lock.importers["packages/bases"].dependencies[core].version =
        "0.13.3"),
  ],
  [
    "unmet ordinary floor",
    (f) => {
      f.manifest.dependencies[mermaid] = "~0.0.4";
      f.refreshProof();
    },
  ],
  [
    "no genuinely newer version",
    (f) => (f.state.releases[name].baseline = f.manifest.version),
  ],
])
  test("scoped mixed release remains held for " + label, () => {
    const f = fixture(true);
    edit(f);
    assert.equal(f.plan().state.releases[name].status, "waiting");
  });
