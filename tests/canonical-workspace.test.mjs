import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import semver from "semver";
import { intakeHash, validateIntakePolicy } from "../src/canonical-intake.mjs";
import { dependencies } from "../src/policy.mjs";
import { emptyState, planWaves } from "../src/waves.mjs";
import { lockVersion } from "../src/wave-evidence.mjs";
import YAML from "yaml";
import { format } from "prettier";
import {
  workspaceIntakeFacts,
  workspaceIntakeSlot,
  prepareWorkspaceIntake,
} from "../src/canonical-workspace.mjs";
import { classifySpecFirstChanges } from "@lapismd/spec-validator";

const fixture = JSON.parse(
  gunzipSync(
    readFileSync(
      new URL("./fixtures/notes-core0135-intake.json.gz", import.meta.url),
    ),
  ),
);
const chapters = [
  "architecture/dependency-boundaries",
  "packages/app-and-services",
  "plugin-model/application-services",
  "server-node-host/core-contract",
  "ui-and-styling/core-contract",
  "web-host/startup-and-plugins",
  "workspace-shell/catalog-acceptance",
].map((p) => `spec/src/${p}.md`);
const policy = {
  schemaVersion: 2,
  kind: "workspace-dependency-intake",
  lockClosure: "registry-transitives",
  repository: fixture.repository,
  slot: "framework-registry",
  dependencies: ["@lapismd/design-core"],
  manifests: fixture.manifests,
  chapters,
};

function input() {
  const policyBytes = JSON.stringify(policy) + "\n";
  const old = workspaceIntakeFacts(policy, fixture.before);
  const baseChapters = Object.fromEntries(
    chapters.map((p) => [
      p,
      "# Source-owned chapter\n\n" +
        workspaceIntakeSlot(policy, old) +
        "\n\nAuthored contract.\n",
    ]),
  );
  return {
    repository: fixture.repository,
    sourceSha: fixture.sourceSha,
    headSha: fixture.sourceSha,
    policyBytes,
    currentPolicyBytes: policyBytes,
    before: structuredClone(fixture.before),
    after: structuredClone(fixture.after),
    baseChapters,
    currentChapters: structuredClone(baseChapters),
    changedFiles: Object.keys(fixture.before).filter(
      (p) => fixture.before[p] !== fixture.after[p],
    ),
    admittedUpdates: ["api", "ui", "web", "workspace"].map((name) => ({
      repository: fixture.repository,
      path: `packages/${name}/package.json`,
      type: "dependencies",
      name: "@lapismd/design-core",
      current: "0.13.4",
      target: "0.13.5",
      targetRange: "^0.13.5",
      compatibility: "compatible",
      integrity: YAML.parse(fixture.after["pnpm-lock.yaml"]).packages[
        "@lapismd/design-core@0.13.5"
      ].resolution.integrity,
    })),
  };
}

function refreshSlots(data, selectedPolicy = policy) {
  data.policyBytes = JSON.stringify(selectedPolicy) + "\n";
  data.currentPolicyBytes = data.policyBytes;
  const old = workspaceIntakeFacts(selectedPolicy, data.before);
  data.baseChapters = Object.fromEntries(
    chapters.map((p) => [
      p,
      "# Source-owned chapter\n\n" +
        workspaceIntakeSlot(selectedPolicy, old) +
        "\n\nAuthored contract.\n",
    ]),
  );
  data.currentChapters = structuredClone(data.baseChapters);
}

test("workspace slots survive normal consumer Markdown formatting and repeat preparation", async () => {
  const data = input();
  for (const path of chapters) {
    data.baseChapters[path] = await format(data.baseChapters[path], {
      parser: "markdown",
    });
    data.currentChapters[path] = data.baseChapters[path];
  }
  const first = prepareWorkspaceIntake(data);
  for (const path of chapters)
    assert.equal(
      await format(first.outputs[path], { parser: "markdown" }),
      first.outputs[path],
    );
  assert.deepEqual(
    prepareWorkspaceIntake({ ...data, currentChapters: first.outputs }).outputs,
    first.outputs,
  );
});

test("workspace policy retains a second unchanged first-party dependency", () => {
  const data = input(),
    selected = {
      ...policy,
      dependencies: [...policy.dependencies, "@lapismd/mira"],
    };
  refreshSlots(data, selected);
  const result = prepareWorkspaceIntake(data);
  assert.equal(
    result.facts.manifests["packages/api/package.json"].dependencies[
      "@lapismd/mira"
    ].version,
    "0.2.0",
  );
  assert.equal(Object.keys(result.outputs).length, 7);
});

test("workspace catalog updates preserve declaration routing and actual ranges", () => {
  const data = input();
  for (const [side, version] of [
    ["before", "0.13.4"],
    ["after", "0.13.5"],
  ]) {
    const manifest = JSON.parse(data[side]["packages/api/package.json"]);
    manifest.dependencies["@lapismd/design-core"] = "catalog:framework";
    data[side]["packages/api/package.json"] = JSON.stringify(manifest);
    const workspace = YAML.parse(data[side]["pnpm-workspace.yaml"]);
    (workspace.catalogs ??= {}).framework = {
      "@lapismd/design-core": "^" + version,
    };
    data[side]["pnpm-workspace.yaml"] = YAML.stringify(workspace);
    const lock = YAML.parse(data[side]["pnpm-lock.yaml"]);
    lock.importers["packages/api"].dependencies[
      "@lapismd/design-core"
    ].specifier = "catalog:framework";
    lock.catalogs = {
      framework: {
        "@lapismd/design-core": { specifier: "^" + version, version },
      },
    };
    data[side]["pnpm-lock.yaml"] = YAML.stringify(lock);
  }
  refreshSlots(data);
  const result = prepareWorkspaceIntake(data);
  assert.equal(
    result.facts.manifests["packages/api/package.json"].dependencies[
      "@lapismd/design-core"
    ].declared,
    "catalog:framework",
  );
  assert.equal(
    result.facts.manifests["packages/api/package.json"].dependencies[
      "@lapismd/design-core"
    ].range,
    "^0.13.5",
  );
});

test("the actual Notes152 update set can prepare all seven canonical owners", () => {
  assert.deepEqual(validateIntakePolicy(policy, fixture.repository), policy);
  const data = input();
  const result = prepareWorkspaceIntake(data);
  assert.equal(Object.keys(result.outputs).length, 7);
  assert.equal(
    result.facts.manifests["packages/api/package.json"].dependencies[
      "@lapismd/design-core"
    ].range,
    "^0.13.5",
  );
  assert.equal(
    result.facts.manifests["packages/app-profile/package.json"].dependencies[
      "@lapismd/design-core"
    ].range,
    "^0.13.4",
  );
  for (const p of chapters) {
    assert.match(result.outputs[p], /0\.13\.5/);
    assert.ok(result.outputs[p].endsWith("Authored contract.\n"));
  }
  assert.deepEqual(
    prepareWorkspaceIntake({ ...data, currentChapters: result.outputs })
      .outputs,
    result.outputs,
  );
  const mapping = {
    protected: ["^(?:packages/|pnpm-lock)"],
    rules: [{ pattern: "^(?:packages/|pnpm-lock)", chapters }],
  };
  assert.equal(
    classifySpecFirstChanges(data.changedFiles, mapping).missingChapters.length,
    7,
  );
  assert.equal(
    classifySpecFirstChanges(
      [...data.changedFiles, ...Object.keys(result.outputs)],
      mapping,
    ).missingChapters.length,
    0,
  );
});

const manifest = (d, fn) => {
  const path = "packages/api/package.json";
  const value = JSON.parse(d.after[path]);
  fn(value);
  d.after[path] = JSON.stringify(value);
};
const lock = (d, fn) => {
  const value = YAML.parse(d.after["pnpm-lock.yaml"]);
  fn(value);
  d.after["pnpm-lock.yaml"] = YAML.stringify(value);
};
for (const [name, mutate] of [
  [
    "stale source",
    (d) => {
      d.headSha = "f".repeat(40);
    },
  ],
  [
    "changed source policy",
    (d) => {
      d.currentPolicyBytes += " ";
    },
  ],
  [
    "missing target context",
    (d) => {
      delete d.admittedUpdates;
    },
  ],
  [
    "wrong admitted source version",
    (d) => {
      d.admittedUpdates[0].current = "0.12.0";
    },
  ],
  [
    "unadmitted manifest range",
    (d) => {
      d.admittedUpdates = [];
    },
  ],
  [
    "breaking target",
    (d) => {
      d.admittedUpdates[0].target = "0.14.0";
    },
  ],
  [
    "wrong admitted integrity",
    (d) => {
      for (const update of d.admittedUpdates)
        update.integrity = "sha512-" + "a".repeat(86) + "==";
    },
  ],
  [
    "changed script",
    (d) =>
      manifest(d, (m) => {
        m.scripts.check = "true";
      }),
  ],
  [
    "changed package version",
    (d) =>
      manifest(d, (m) => {
        m.version = "9.0.0";
      }),
  ],
  [
    "unrelated dependency",
    (d) =>
      manifest(d, (m) => {
        m.dependencies.hono = "^999.0.0";
      }),
  ],
  [
    "product source",
    (d) => {
      d.changedFiles.push("packages/api/src/product.ts");
    },
  ],
  [
    "manual canonical repair",
    (d) => {
      d.currentChapters[chapters[0]] += "Maintainer repair\n";
    },
  ],
  [
    "missing slot",
    (d) => {
      d.baseChapters[chapters[0]] = "# Missing\n";
    },
  ],
  [
    "ambiguous slot",
    (d) => {
      d.baseChapters[chapters[0]] += d.baseChapters[chapters[0]];
    },
  ],
  [
    "unrelated lock setting",
    (d) =>
      lock(d, (l) => {
        l.settings.autoInstallPeers = false;
      }),
  ],
  [
    "unrelated direct importer",
    (d) =>
      lock(d, (l) => {
        l.importers["."].devDependencies.vite.version = "99.0.0";
      }),
  ],
  [
    "changed first-party integrity",
    (d) =>
      lock(d, (l) => {
        l.packages["@lapismd/mira@0.2.0"].resolution.integrity =
          "sha512-" + "a".repeat(86) + "==";
      }),
  ],
  [
    "external transitive resolution",
    (d) =>
      lock(d, (l) => {
        l.packages["@csstools/color-helpers@6.1.3"].resolution.tarball =
          "https://example.invalid/foreign.tgz";
      }),
  ],
  [
    "new first-party identity",
    (d) =>
      lock(d, (l) => {
        l.packages["@lapismd/design-core@0.13.50"] = {
          resolution: { integrity: "sha512-" + "a".repeat(86) + "==" },
        };
      }),
  ],
  [
    "new first-party edge from a third-party snapshot",
    (d) =>
      lock(d, (l) => {
        const key = Object.keys(l.snapshots).find(
          (k) => !k.startsWith("@lapis"),
        );
        (l.snapshots[key].dependencies ??= {})["@lapismd/mira"] = "0.2.0";
      }),
  ],
  [
    "catalog declaration routing change",
    (d) => {
      for (const key of ["before", "after"]) {
        const value = YAML.parse(d[key]["pnpm-workspace.yaml"]);
        (value.catalogs ??= {}).alternative = {
          "@lapismd/design-core": "^0.13.5",
        };
        d[key]["pnpm-workspace.yaml"] = YAML.stringify(value);
      }
      manifest(d, (m) => {
        m.dependencies["@lapismd/design-core"] = "catalog:alternative";
      });
    },
  ],
  [
    "unused catalog modification",
    (d) => {
      for (const side of ["before", "after"]) {
        const value = YAML.parse(d[side]["pnpm-workspace.yaml"]);
        (value.catalogs ??= {}).unused = {
          "@lapismd/design-core": side === "before" ? "^0.13.4" : "^0.13.5",
        };
        d[side]["pnpm-workspace.yaml"] = YAML.stringify(value);
      }
    },
  ],
  [
    "undeclared importer",
    (d) =>
      lock(d, (l) => {
        l.importers["frozen/deno"] = {
          dependencies: {
            "@lapismd/design-core": structuredClone(
              l.importers["packages/api"].dependencies["@lapismd/design-core"],
            ),
          },
        };
      }),
  ],
  [
    "same-version integrity drift",
    (d) => {
      d.after = structuredClone(d.before);
      lock(d, (l) => {
        l.packages["@lapismd/design-core@0.13.4"].resolution.integrity =
          "sha512-" + "a".repeat(86) + "==";
      });
    },
  ],
])
  test(`workspace canonical preparation rejects ${name} before writes`, () => {
    const data = input();
    mutate(data);
    const saved = structuredClone(data);
    assert.throws(() => prepareWorkspaceIntake(data), /Canonical intake held/);
    assert.deepEqual(data, saved);
  });

function graphInput() {
  const data = input();
  const repo = {
    repository: fixture.repository,
    sourceSha: fixture.sourceSha,
    paths: Object.keys(data.before),
    workspace: YAML.parse(data.before["pnpm-workspace.yaml"]),
    lock: YAML.parse(data.before["pnpm-lock.yaml"]),
    manifests: policy.manifests.map((path) => ({
      path,
      manifest: JSON.parse(data.before[path]),
    })),
    canonicalIntake: {
      policy,
      policyBytes: data.policyBytes,
      sha256: undefined,
    },
  };
  return {
    data,
    repo,
    node: {
      repository: repo.repository,
      sourceSha: repo.sourceSha,
      updates: structuredClone(data.admittedUpdates),
      admittedUpdates: structuredClone(data.admittedUpdates),
      acceptance: { state: "qualified" },
      holds: [],
      waits: [],
      status: "admitted",
    },
    graph: {
      packages: [],
      repositories: [repo],
      edges: [],
      unpublished: [],
      cycles: [],
      available: { "@lapismd/design-core": ["0.13.5"] },
      registry: {
        "@lapismd/design-core": {
          "0.13.5": { integrity: data.admittedUpdates[0].integrity },
        },
      },
    },
  };
}

test("workspace admission binds the actual active importers and does not bypass waits", async () => {
  const { canonicalPreparationHold, canonicalDevelopmentUpdate } =
    await import("../src/canonical-admission.mjs");
  const { intakeHash } = await import("../src/canonical-intake.mjs");
  const f = graphInput();
  f.repo.canonicalIntake.sha256 = intakeHash(f.data.policyBytes);
  assert.equal(canonicalPreparationHold(f.repo, f.node, f.graph), null);
  assert.equal(canonicalDevelopmentUpdate(f.repo, f.node, f.graph), false);
  for (const mutate of [
    (x) => {
      (x.repo.workspace.overrides ??= {})["@lapismd/design-core"] = "0.13.4";
    },
    (x) => {
      x.repo.canonicalIntake.sha256 = "a".repeat(64);
    },
    (x) => {
      x.repo.manifests = x.repo.manifests.filter(
        (m) => m.path !== "packages/web/package.json",
      );
    },
    (x) => {
      x.node.updates[0].target = "0.14.0";
    },
    (x) => {
      x.node.updates[0].target = "0.13.6";
    },
    (x) => {
      x.node.updates[0].current = "0.12.0";
    },
    (x) => {
      x.node.updates[0].path = "frozen/deno/package.json";
    },
    (x) => {
      delete x.graph.registry["@lapismd/design-core"]["0.13.5"].integrity;
    },
  ]) {
    const other = structuredClone(f);
    mutate(other);
    assert.match(
      canonicalPreparationHold(other.repo, other.node, other.graph),
      /does not support/,
    );
  }
});

test("wave planning isolates unrelated same-manifest waits but binds selected dependency waits", () => {
  const f = graphInput();
  const agent = "@lapismd/agent-ui";
  const unrelatedWaitingPackage = "@lapis-notes/search";
  const unrelatedWaitingRepository = "lapismd/lapis-plugins";
  const selectedWaitingRepository = "lapismd/design-core";
  const waitingRepository = (repository, sourceSha) => ({
    repository,
    sourceSha,
    visibility: "public",
    phase: "pilot",
    nonPortable: [],
    missingChangesets: false,
    paths: [],
    manifests: [],
    workspace: {},
    lock: { importers: {}, packages: {} },
    evidence: {
      sha: sourceSha,
      expected: [],
      runs: [],
      checks: [],
      statuses: [],
      prs: [],
      orphanBranches: [],
    },
  });
  f.repo.visibility = "public";
  f.repo.phase = "pilot";
  f.repo.nonPortable = [];
  f.repo.evidence = {
    sha: f.repo.sourceSha,
    expected: [1],
    runs: [
      {
        head_sha: f.repo.sourceSha,
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
  };
  f.repo.canonicalIntake.sha256 = intakeHash(f.data.policyBytes);
  f.graph.packages = f.repo.manifests.map((entry) => ({
    ...entry,
    name: entry.manifest.name,
    repository: f.repo.repository,
  }));
  f.graph.edges = f.repo.manifests.flatMap((entry) =>
    dependencies(entry.manifest, f.repo.workspace).map((edge) => ({
      ...edge,
      repository: f.repo.repository,
      path: entry.path,
      consumer: entry.manifest.name,
    })),
  );
  for (const edge of f.graph.edges) {
    if (["@lapismd/design-core", agent].includes(edge.name)) continue;
    const current = lockVersion(f.repo, edge).version;
    if (!current) continue;
    const selected = f.graph.available[edge.name]?.[0];
    f.graph.available[edge.name] = [
      !selected || semver.lt(current, selected) ? current : selected,
    ];
  }
  f.graph.available[agent] = ["0.2.9"];
  f.graph.registry[agent] = {
    "0.2.9": { integrity: f.data.admittedUpdates[0].integrity },
  };
  f.graph.repositories.push(
    waitingRepository(unrelatedWaitingRepository, "c".repeat(40)),
    waitingRepository(selectedWaitingRepository, "d".repeat(40)),
  );
  f.graph.coverage = [];
  f.graph.excludedPackages = [];
  const state = emptyState();
  state.releases[unrelatedWaitingPackage] = {
    name: unrelatedWaitingPackage,
    repository: unrelatedWaitingRepository,
    sourceSha: "c".repeat(40),
    baseline: "0.1.12",
    requires: [
      {
        name: "@lapismd/design-core",
        type: "dependencies",
        target: "0.13.6",
      },
    ],
    status: "waiting",
    policyRevision: "b".repeat(40),
  };
  const waveOptions = {
    phase: "pilot",
    writes: false,
    policyRevision: "b".repeat(40),
    botLogin: "dependency[bot]",
    botAuthor: "Bot <bot@example.com>",
    now: "2026-11-19T00:00:00Z",
  };
  const result = planWaves(f.graph, state, waveOptions);
  const node = result.report.nodes.find(
    (candidate) => candidate.repository === fixture.repository,
  );
  const coreUpdates = node.updates.filter(
    (update) => update.name === "@lapismd/design-core",
  );
  assert.equal(coreUpdates.length, 7);
  assert.deepEqual(
    node.waits
      .filter((wait) => wait.package === unrelatedWaitingPackage)
      .map((wait) => wait.path)
      .filter(Boolean)
      .sort(),
    ["package.json", "packages/app-profile/package.json"],
  );
  assert.deepEqual(
    node.updates
      .filter((update) => update.name === agent)
      .map((update) => [update.path, update.type]),
    [["packages/app-profile/package.json", "dependencies"]],
  );
  assert.equal(node.status, "admitted");
  assert.deepEqual(
    node.admittedUpdates.map((update) => update.path).sort(),
    policy.manifests.toSorted(),
  );
  assert.ok(node.admittedUpdates.every((update) => update.name !== agent));
  assert.ok(
    node.holds.some(
      (hold) =>
        hold.startsWith(`packages/app-profile/package.json:${agent}:`) &&
        hold.includes("source-owned canonical preparation"),
    ),
  );
  assert.deepEqual(result.admitted, [fixture.repository]);

  const selectedState = structuredClone(state);
  selectedState.releases["@lapismd/design-core"] = {
    name: "@lapismd/design-core",
    repository: selectedWaitingRepository,
    sourceSha: "d".repeat(40),
    baseline: "0.13.5",
    requires: [
      {
        name: "@lapismd/mira",
        type: "dependencies",
        target: "0.2.0",
      },
    ],
    status: "waiting",
    policyRevision: "b".repeat(40),
  };
  const selectedResult = planWaves(f.graph, selectedState, waveOptions);
  const selectedNode = selectedResult.report.nodes.find(
    (candidate) => candidate.repository === fixture.repository,
  );
  assert.equal(
    selectedNode.admittedUpdates.filter(
      (update) => update.name === "@lapismd/design-core",
    ).length,
    0,
  );
  assert.equal(
    selectedNode.waits.filter((wait) => wait.package === "@lapismd/design-core")
      .length,
    7,
  );
});

test("native workspace context carries exact target integrity and only owned outputs", async () => {
  const { repositoryConfig } = await import("../src/renovate.mjs");
  const { intakeHash } = await import("../src/canonical-intake.mjs");
  const f = graphInput();
  f.repo.canonicalIntake.sha256 = intakeHash(f.data.policyBytes);
  f.graph.waveAdmission = { nodes: [f.node] };
  const config = repositoryConfig(f.repo, f.graph, process.cwd());
  const context = JSON.parse(config.postUpgradeTasks.dataFileTemplate);
  assert.equal(context.sourceSha, fixture.sourceSha);
  assert.equal(context.canonicalPolicySha256, f.repo.canonicalIntake.sha256);
  assert.deepEqual(context.canonicalUpdates, f.data.admittedUpdates);
  assert.deepEqual(config.postUpgradeTasks.fileFilters, [
    ".changeset/lapis-dependencies-*.md",
    "pnpm-workspace.yaml",
    ...chapters,
  ]);
  assert.equal(config.postUpgradeTasks.commands.length, 1);
  assert.match(config.postUpgradeTasks.commands[0], /scripts\/prepare-pr\.mjs/);
});

test("filesystem workspace preparation validates every output before writing and repeats safely", async (t) => {
  const { mkdtemp, mkdir, writeFile, readFile, rm, symlink } =
    await import("node:fs/promises");
  const { join, dirname } = await import("node:path");
  const { tmpdir } = await import("node:os");
  const { execFileSync } = await import("node:child_process");
  const { prepareCanonicalFiles } =
    await import("../src/canonical-intake-files.mjs");
  const { intakeHash, intakePolicyPath } =
    await import("../src/canonical-intake.mjs");
  const storage = await mkdtemp(join(tmpdir(), "workspace-canonical-"));
  const alias = `${storage}-alias`;
  await symlink(storage, alias, "dir");
  const root = join(alias, "repository");
  await mkdir(root);
  t.after(async () => {
    await rm(alias, { force: true });
    await rm(storage, { recursive: true, force: true });
  });
  const data = input();
  const write = async (path, bytes) => {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), bytes);
  };
  for (const [p, bytes] of Object.entries({
    ...data.before,
    ...data.baseChapters,
    [intakePolicyPath]: data.policyBytes,
  }))
    await write(p, bytes);
  // Disposable Git-format fixture for the native Renovate filesystem boundary.
  const git = (args) =>
    execFileSync("git", ["-c", "commit.gpgsign=false", ...args], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        PATH: process.env.PATH,
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_AUTHOR_NAME: "Fixture",
        GIT_AUTHOR_EMAIL: "fixture@example.invalid",
        GIT_COMMITTER_NAME: "Fixture",
        GIT_COMMITTER_EMAIL: "fixture@example.invalid",
      },
    }).trim();
  git(["init", "--quiet"]);
  git(["add", "."]);
  git(["commit", "-qm", "Reviewed source fixture"]);
  const sourceSha = git(["rev-parse", "HEAD"]);
  for (const [p, bytes] of Object.entries(data.after)) await write(p, bytes);
  const args = {
    root,
    repository: fixture.repository,
    sourceSha,
    policySha256: intakeHash(data.policyBytes),
    admittedUpdates: data.admittedUpdates,
  };
  await write(
    chapters.at(-1),
    data.baseChapters[chapters.at(-1)] + "Maintainer repair\n",
  );
  await assert.rejects(prepareCanonicalFiles(args), /manual canonical edits/);
  assert.equal(
    await readFile(join(root, chapters[0]), "utf8"),
    data.baseChapters[chapters[0]],
  );
  await write(chapters.at(-1), data.baseChapters[chapters.at(-1)]);
  const prepared = await prepareCanonicalFiles(args);
  for (const p of chapters)
    assert.equal(await readFile(join(root, p), "utf8"), prepared.outputs[p]);
  assert.deepEqual(
    (await prepareCanonicalFiles(args)).outputs,
    prepared.outputs,
  );
  const { changesetPath } = await import("../src/changesets.mjs");
  const branchName = "lapis-dependencies/lapis-first-party";
  const intent =
    '---\n"@lapis-notes/api": minor\n---\nKeep authored release intent.\n';
  await write(changesetPath(branchName), intent);
  await prepareCanonicalFiles({ ...args, branchName });
  assert.equal(
    await readFile(join(root, changesetPath(branchName)), "utf8"),
    intent,
  );
  await write(".changeset/maintainer-note.md", intent);
  await assert.rejects(
    prepareCanonicalFiles({ ...args, branchName }),
    /unexpected workspace candidate scope/,
  );
});
