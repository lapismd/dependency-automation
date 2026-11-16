import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import YAML from "yaml";
import { intakeHash } from "../src/canonical-intake.mjs";
import { dependencies } from "../src/policy.mjs";
import { emptyState, planWaves } from "../src/waves.mjs";
const recorded = JSON.parse(
  gunzipSync(
    await readFile(
      new URL("./fixtures/notebook-core-intake.json.gz", import.meta.url),
    ),
  ),
);
const sha = "a".repeat(40),
  policyRevision = "b".repeat(40),
  dependency = "@lapismd/design-core";
const names = ["api", "markdown", "ui", "file-explorer", "search", "workspace"];
const options = {
  phase: "pilot",
  writes: false,
  policyRevision,
  botLogin: "dependency[bot]",
  botAuthor: "Bot <bot@example.com>",
  now: "2026-11-16T00:00:00Z",
};
const evidence = () => ({
  sha,
  expected: [1],
  runs: [
    {
      head_sha: sha,
      workflow_id: 1,
      run_number: 1,
      run_attempt: 1,
      event: "push",
      status: "completed",
      conclusion: "success",
    },
  ],
  checks: [],
  statuses: [],
  prs: [],
  orphanBranches: [],
});
function fixture() {
  const manifest = JSON.parse(recorded.before["package.json"]);
  const repo = {
    repository: recorded.repository,
    visibility: "public",
    sourceSha: sha,
    phase: "pilot",
    nonPortable: [],
    paths: ["package.json", "pnpm-workspace.yaml"],
    workspace: YAML.parse(recorded.before["pnpm-workspace.yaml"]),
    lock: YAML.parse(recorded.before["pnpm-lock.yaml"]),
    manifests: [{ path: "package.json", manifest }],
    evidence: evidence(),
    canonicalIntake: {
      sha256: "c".repeat(64),
      policy: {
        schemaVersion: 1,
        kind: "single-development-dependency",
        repository: recorded.repository,
        dependency,
        slot: "core-development",
        chapters: [
          "spec/src/plugins/notebook/index.md",
          "spec/src/spec-governance.md",
        ],
      },
    },
  };
  repo.canonicalIntake.policyBytes = JSON.stringify(
    repo.canonicalIntake.policy,
  );
  repo.canonicalIntake.sha256 = intakeHash(repo.canonicalIntake.policyBytes);
  const upstream = ["lapis-notes", "lapis-plugins"].map((repository) => ({
    repository: `lapismd/${repository}`,
    visibility: "public",
    sourceSha: sha,
    phase: "pilot",
    nonPortable: [],
    workspace: {},
    manifests: [],
    evidence: evidence(),
  }));
  const state = emptyState();
  for (const name of names) {
    const repository = ["markdown", "search"].includes(name)
      ? upstream[1]
      : upstream[0];
    const packageName = `@lapis-notes/${name}`;
    repository.manifests.push({
      path: `packages/${name}/package.json`,
      manifest: { name: packageName, version: "0.0.1" },
    });
    state.releases[packageName] = {
      name: packageName,
      repository: repository.repository,
      sourceSha: sha,
      baseline: "0.0.1",
      requires: [{ name: dependency, type: "dependencies", target: "0.13.4" }],
      status: "waiting",
      policyRevision,
    };
  }
  const repositories = [repo, ...upstream];
  const edges = dependencies(manifest, repo.workspace).map((edge) => ({
    ...edge,
    repository: repo.repository,
    path: "package.json",
    consumer: manifest.name,
  }));
  const packages = repositories.flatMap((r) =>
    r.manifests.map((p) => ({
      ...p,
      name: p.manifest.name,
      repository: r.repository,
    })),
  );
  const available = Object.fromEntries(edges.map((e) => [e.name, ["0.0.1"]]));
  available[dependency] = ["0.13.3", "0.13.4"];
  const after = YAML.parse(recorded.after["pnpm-lock.yaml"]);
  const graph = {
    repositories,
    packages,
    edges,
    available,
    registry: {
      [dependency]: {
        "0.13.4": {
          integrity:
            after.packages[`${dependency}@0.13.4`].resolution.integrity,
        },
      },
    },
    unpublished: [],
    cycles: [],
    coverage: [],
    excludedPackages: [],
  };
  return { graph, state, repo };
}
const notebook = (result) =>
  result.report.nodes.find((n) => n.repository === recorded.repository);
test("actual Notebook development patch admits while all six unrelated publication waits remain", () => {
  const { graph, state } = fixture();
  const result = planWaves(graph, state, options),
    node = notebook(result);
  assert.equal(node.acceptance.state, "qualified");
  assert.equal(node.updates.length, 1);
  assert.equal(node.status, "admitted");
  assert.deepEqual(
    node.admittedUpdates.map((u) => [
      u.name,
      u.type,
      u.current,
      u.target,
      u.releaseIntent,
    ]),
    [[dependency, "devDependencies", "0.13.3", "0.13.4", null]],
  );
  assert.deepEqual(
    node.waits.map((w) => w.package).sort(),
    names.map((n) => `@lapis-notes/${n}`).sort(),
  );
  for (const name of names)
    assert.equal(
      result.state.releases[`@lapis-notes/${name}`].status,
      "waiting",
    );
  assert.equal(
    result.state.releases["@lapis-notes/lapis-plugin-notebook"],
    undefined,
  );
});

import semver from "semver";
import { canonicalDevelopmentUpdate } from "../src/canonical-admission.mjs";
import { lockVersion } from "../src/wave-evidence.mjs";
const sourcePolicy = (f) => {
  f.repo.canonicalIntake.policyBytes = JSON.stringify(
    f.repo.canonicalIntake.policy,
  );
  f.repo.canonicalIntake.sha256 = intakeHash(
    f.repo.canonicalIntake.policyBytes,
  );
};
for (const [name, mutate] of Object.entries({
  "missing opt-in": (f) => delete f.repo.canonicalIntake,
  "old inventory without source bytes": (f) =>
    delete f.repo.canonicalIntake.policyBytes,
  "changed source bytes": (f) => (f.repo.canonicalIntake.policyBytes += "\n"),
  "changed source digest": (f) =>
    (f.repo.canonicalIntake.sha256 = "d".repeat(64)),
  "parsed policy mismatch": (f) =>
    (f.repo.canonicalIntake.policy.slot = "other"),
  "unknown policy kind": (f) => {
    f.repo.canonicalIntake.policy.kind = "other";
    sourcePolicy(f);
  },
  "wrong source repository": (f) => {
    f.repo.canonicalIntake.policy.repository = "lapismd/other";
    sourcePolicy(f);
  },
  "different policy dependency": (f) => {
    f.repo.canonicalIntake.policy.dependency = "@lapismd/other";
    sourcePolicy(f);
  },
  "stale source": (f) => (f.node.sourceSha = "d".repeat(40)),
  "unknown source": (f) => (f.repo.sourceSha = "main"),
  "unknown source checks": (f) => (f.node.acceptance.state = "unknown"),
  "explicit source hold": (f) => f.node.holds.push("operator hold"),
  "another discovered target": (f) =>
    f.node.updates.push({ ...f.node.updates[0], name: "@lapismd/other" }),
  "foreign target repository": (f) =>
    (f.node.updates[0].repository = "lapismd/other"),
  "another manifest": (f) =>
    (f.node.updates[0].path = "packages/input/package.json"),
  "runtime target": (f) => (f.node.updates[0].type = "dependencies"),
  "peer target": (f) => (f.node.updates[0].type = "peerDependencies"),
  "release intent": (f) =>
    (f.node.updates[0].releaseIntent = "@lapis-notes/lapis-plugin-notebook"),
  "breaking target": (f) => (f.node.updates[0].compatibility = "breaking"),
  "minor target": (f) => (f.node.updates[0].updateType = "minor"),
  "non-forward target": (f) => (f.node.updates[0].target = "0.13.3"),
  "changed declared strategy": (f) =>
    (f.node.updates[0].targetRange = "^0.13.4"),
  "unadmitted channel": (f) => (f.graph.available[dependency] = ["0.13.3"]),
  "unverified target integrity": (f) =>
    (f.graph.registry[dependency]["0.13.4"].integrity = "unknown"),
  "actual upstream target wait": (f) =>
    f.node.waits.push({
      package: dependency,
      path: "another/package.json",
      repository: "lapismd/design-core",
      reason: "upstream wait",
    }),
  "development range drift": (f) =>
    (f.repo.manifests[0].manifest.devDependencies[dependency] = "^0.13.3"),
  "workspace override drift": (f) =>
    (f.repo.workspace.overrides[dependency] = "0.13.2"),
  "lock override drift": (f) => (f.repo.lock.overrides[dependency] = "0.13.2"),
  "unknown source integrity": (f) =>
    (f.repo.lock.packages[`${dependency}@0.13.3`].resolution.integrity =
      "unknown"),
  "unresolved source lock": (f) =>
    (f.repo.lock.importers["."].devDependencies[dependency].version = "0.13.2"),
  "unsupported current peer": (f) =>
    (f.repo.manifests[0].manifest.peerDependencies[dependency] = "^0.12.0"),
  "peer needing widening": (f) =>
    (f.repo.manifests[0].manifest.peerDependencies[dependency] = "0.13.3"),
  "runtime coupling": (f) =>
    ((f.repo.manifests[0].manifest.dependencies ??= {})[dependency] =
      "^0.13.3"),
  "optional runtime coupling": (f) =>
    ((f.repo.manifests[0].manifest.optionalDependencies ??= {})[dependency] =
      "^0.13.3"),
  "another development importer": (f) =>
    f.repo.manifests.push({
      path: "packages/other/package.json",
      manifest: { devDependencies: { [dependency]: "0.13.3" } },
    }),
  "another unsupported peer": (f) =>
    f.repo.manifests.push({
      path: "packages/other/package.json",
      manifest: { peerDependencies: { [dependency]: "0.13.3" } },
    }),
  "manifest override authority": (f) =>
    (f.repo.manifests[0].manifest.pnpm = {
      overrides: { [dependency]: "0.13.3" },
    }),
  "compound override authority": (f) =>
    (f.repo.workspace.overrides[`other>${dependency}`] = "0.13.3"),
  "shared catalog": (f) =>
    (f.repo.workspace.catalog = { [dependency]: "0.13.3" }),
  "shared named catalog": (f) =>
    (f.repo.workspace.catalogs = { shared: { [dependency]: "0.13.3" } }),
}))
  test(`independent intake holds ${name}`, () => {
    const f = fixture();
    f.node = notebook(planWaves(f.graph, f.state, options));
    assert.equal(canonicalDevelopmentUpdate(f.repo, f.node, f.graph), true);
    mutate(f);
    assert.equal(canonicalDevelopmentUpdate(f.repo, f.node, f.graph), false);
  });
for (const name of names)
  test(`unrelated ${name} update remains blocked by its own retained wait`, () => {
    const f = fixture(),
      packageName = `@lapis-notes/${name}`;
    const edge = f.graph.edges.find(
      (e) => e.name === packageName && e.type === "devDependencies",
    );
    const target = semver.inc(lockVersion(f.repo, edge).version, "patch");
    f.graph.available[packageName] = [target];
    f.graph.registry[packageName] = {
      [target]: { integrity: f.graph.registry[dependency]["0.13.4"].integrity },
    };
    const result = planWaves(f.graph, f.state, options),
      node = notebook(result);
    assert.ok(node.updates.some((u) => u.name === packageName));
    assert.deepEqual(node.admittedUpdates, []);
    assert.equal(node.waits.length, 6);
    assert.equal(result.state.releases[packageName].status, "waiting");
  });
for (const [name, mutate] of Object.entries({
  "outside pilot": (f) => (f.repo.phase = "full"),
  "explicit hold": (f) => (f.repo.holdReason = "operator hold"),
  "pending current check": (f) =>
    f.repo.evidence.checks.push({
      name: "late product lane",
      status: "in_progress",
      conclusion: null,
    }),
  "failed current workflow": (f) =>
    (f.repo.evidence.runs[0].conclusion = "failure"),
  "unknown current workflow": (f) => f.repo.evidence.expected.push(2),
  "manual repair": (f) =>
    f.repo.evidence.prs.push({
      number: 36,
      user: { login: "human" },
      head: {
        ref: "lapis-dependencies/lapis-first-party",
        sha: "d".repeat(40),
      },
      commits: [
        {
          author: { login: "human" },
          commit: { author: { name: "Human", email: "human@example.com" } },
        },
      ],
    }),
  "orphan rolling branch": (f) =>
    f.repo.evidence.orphanBranches.push({
      branch: "lapis-dependencies/lapis-first-party",
      head: "d".repeat(40),
    }),
}))
  test(`independent intake retains ${name} gate`, () => {
    const f = fixture();
    mutate(f);
    const result = planWaves(f.graph, f.state, options);
    assert.notEqual(notebook(result).status, "admitted");
    assert.ok(!result.admitted.includes(f.repo.repository));
    assert.equal(notebook(result).waits.length, 6);
  });
test("an uncertain prior writer remains held rather than replayed", () => {
  const f = fixture(),
    first = planWaves(f.graph, f.state, options),
    node = notebook(first);
  const previous = first.state;
  Object.assign(previous.operations[node.operationId], {
    status: "admitted",
    runId: "123",
  });
  const next = notebook(planWaves(f.graph, previous, options));
  assert.equal(next.status, "uncertain");
  assert.ok(next.holds.some((h) => h.includes("no observed PR")));
});
test("supported additional peer declarations remain unchanged", () => {
  const f = fixture();
  f.repo.manifests.push({
    path: "packages/input/package.json",
    manifest: {
      name: "@lapis-notes/notebook-input",
      peerDependencies: { [dependency]: "^0.6.0 || ^0.10.0 || ^0.13.0" },
    },
  });
  assert.equal(
    notebook(planWaves(f.graph, f.state, options)).status,
    "admitted",
  );
});

import { discoverRepository } from "../src/github.mjs";
import { intakePolicyPath } from "../src/canonical-intake.mjs";
test("discovery binds original public source policy bytes to its immutable revision", async () => {
  const f = fixture(),
    raw = JSON.stringify(f.repo.canonicalIntake.policy, null, 2) + "\n";
  const files = {
    "package.json": JSON.stringify(f.repo.manifests[0].manifest),
    [intakePolicyPath]: raw,
  };
  const fetcher = async (url) => {
    const uri = new URL(url),
      suffix = uri.pathname.slice(`/repos/${recorded.repository}`.length);
    let data;
    if (!suffix)
      data = {
        visibility: "public",
        private: false,
        archived: false,
        default_branch: "main",
      };
    else if (suffix.startsWith("/branches/")) data = { commit: { sha } };
    else if (suffix.startsWith("/git/trees/")) {
      assert.ok(suffix.includes(sha));
      data = {
        tree: Object.keys(files).map((path) => ({ type: "blob", path })),
      };
    } else {
      assert.equal(uri.searchParams.get("ref"), sha);
      data = {
        content: Buffer.from(files[suffix.slice("/contents/".length)]).toString(
          "base64",
        ),
      };
    }
    return { ok: true, status: 200, json: async () => data };
  };
  const repo = await discoverRepository(
    { repository: recorded.repository, phase: "pilot" },
    { fetcher, publicOnly: true },
  );
  assert.equal(repo.sourceSha, sha);
  assert.equal(repo.canonicalIntake.policyBytes, raw);
  assert.equal(repo.canonicalIntake.sha256, intakeHash(raw));
  assert.deepEqual(repo.canonicalIntake.policy, f.repo.canonicalIntake.policy);
});

import { repositoryConfig } from "../src/renovate.mjs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("native Renovate admits the exact canonical override alongside its dev dependency only", async (t) => {
  const f = fixture();
  f.graph.waveAdmission = planWaves(f.graph, f.state, options).report;
  const config = repositoryConfig(f.repo, f.graph, "/automation");
  const { GlobalConfig } =
    await import("../node_modules/renovate/dist/config/global.js");
  const { extractPnpmWorkspaceFile } =
    await import("../node_modules/renovate/dist/modules/manager/npm/extract/pnpm.js");
  const { applyPackageRules } =
    await import("../node_modules/renovate/dist/util/package-rules/index.js");
  const root = await mkdtemp(join(tmpdir(), "lapis-native-override-"));
  t.after(async () => {
    GlobalConfig.reset();
    await rm(root, { recursive: true, force: true });
  });
  GlobalConfig.set({ localDir: root });
  await writeFile(
    join(root, "pnpm-lock.yaml"),
    recorded.before["pnpm-lock.yaml"],
  );
  const extracted = await extractPnpmWorkspaceFile(
    f.repo.workspace,
    "pnpm-workspace.yaml",
  );
  const core = extracted.deps.find((dep) => dep.depName === dependency);
  assert.equal(core.depType, "pnpm-workspace.overrides");
  assert.equal(core.currentValue, "0.13.3");
  const effective = (dep, packageFile) =>
    applyPackageRules({
      ...config,
      ...dep,
      packageFile,
      currentVersion: "0.13.3",
      updateType: "patch",
    });
  const override = await effective(core, "pnpm-workspace.yaml");
  assert.equal(override.enabled, true, "the paired override must be enabled");
  assert.match("0.13.4", new RegExp(override.allowedVersions.slice(1, -1)));
  assert.doesNotMatch(
    "0.13.5",
    new RegExp(override.allowedVersions.slice(1, -1)),
  );
  const dev = await effective(
    { ...core, depType: "devDependencies" },
    "package.json",
  );
  assert.equal(dev.enabled, true);
  for (const [dep, file] of [
    [{ ...core, depType: "peerDependencies" }, "package.json"],
    [{ ...core, depType: "dependencies" }, "package.json"],
    [core, "other/pnpm-workspace.yaml"],
    [{ ...core, depName: "other>" + dependency }, "pnpm-workspace.yaml"],
    [
      { ...core, depName: "@lapis-notes/api", packageName: "@lapis-notes/api" },
      "pnpm-workspace.yaml",
    ],
    [{ ...core, depType: "pnpm.catalog.default" }, "pnpm-workspace.yaml"],
  ]) {
    assert.equal((await effective(dep, file)).enabled, false);
  }
});

test("native artifact reporting retains failures without requiring status-write permission", async () => {
  const f = fixture();
  f.graph.waveAdmission = planWaves(f.graph, f.state, options).report;
  const generated = repositoryConfig(f.repo, f.graph, "/automation");
  const { setArtifactErrorStatus } =
    await import("../node_modules/renovate/dist/workers/repository/update/branch/artifacts.js");
  const { getConfig } =
    await import("../node_modules/renovate/dist/config/defaults.js");
  const { mergeChildConfig } =
    await import("../node_modules/renovate/dist/config/utils.js");
  const errors = [
    { fileName: "pnpm-lock.yaml", stderr: "fixture preparation failed" },
  ];
  const config = {
    ...mergeChildConfig(getConfig(), generated),
    branchName: "lapis-dependencies/lapis-first-party",
    artifactErrors: errors,
  };
  assert.equal(config.statusCheckNames?.artifactError, null);
  await setArtifactErrorStatus(config);
  assert.deepEqual(config.artifactErrors, errors);
  assert.equal(config.ignoreTests, false);
});

test("an admitted development regeneration retains native paths and cannot auto-merge the stale failed PR", () => {
  const f = fixture();
  f.repo.evidence.prs.push({
    number: 36,
    user: { login: options.botLogin },
    head: { ref: "lapis-dependencies/lapis-first-party", sha: "d".repeat(40) },
    commits: [
      {
        author: { login: options.botLogin },
        commit: { author: { name: "Bot", email: "bot@example.com" } },
      },
    ],
    basedOnCurrentSource: false,
    qualification: { state: "failed" },
  });
  const result = planWaves(f.graph, f.state, options);
  assert.equal(notebook(result).status, "admitted");
  f.graph.waveAdmission = result.report;
  const config = repositoryConfig(f.repo, f.graph, "/automation");
  assert.deepEqual(config.postUpgradeTasks.fileFilters, [
    ".changeset/lapis-dependencies-*.md",
    ...f.repo.canonicalIntake.policy.chapters,
  ]);
  assert.equal(
    JSON.parse(config.postUpgradeTasks.dataFileTemplate).canonicalPolicySha256,
    f.repo.canonicalIntake.sha256,
  );
  assert.equal(
    JSON.parse(config.postUpgradeTasks.dataFileTemplate).sourceSha,
    sha,
  );
  assert.ok(!config.packageRules.some((rule) => rule.automerge === true));
});
test("a real wait for the selected development publisher still blocks admission", () => {
  const f = fixture(),
    repository = "lapismd/design-core";
  const entry = {
    path: "package.json",
    manifest: { name: dependency, version: "0.13.4" },
  };
  f.graph.repositories.push({
    repository,
    visibility: "public",
    sourceSha: sha,
    phase: "pilot",
    nonPortable: [],
    workspace: {},
    manifests: [entry],
    evidence: evidence(),
  });
  f.graph.packages.push({ ...entry, name: dependency, repository });
  f.state.releases[dependency] = {
    name: dependency,
    repository,
    sourceSha: sha,
    baseline: "0.13.3",
    requires: [
      { name: "@lapismd/mira", type: "dependencies", target: "0.2.0" },
    ],
    status: "waiting",
    policyRevision,
  };
  const result = planWaves(f.graph, f.state, options),
    node = notebook(result);
  assert.notEqual(node.status, "admitted");
  assert.deepEqual(node.admittedUpdates, []);
  assert.ok(node.waits.some((wait) => wait.package === dependency));
  assert.equal(result.state.releases[dependency].status, "waiting");
});
