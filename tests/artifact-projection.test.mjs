import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import YAML from "yaml";
import {
  immutableProjectionShape,
  projectionHash,
  projectionPath,
  seedProjection,
  mergeProjection,
  parseProjectionDescriptor,
} from "../src/artifact-projection.mjs";
import {
  projectionCapabilities,
  configuredProjection,
  projectionRegexManager,
} from "../src/artifact-projection-policy.mjs";
import {
  intakeFacts,
  intakeSlot,
  intakeHash,
  intakePolicyPath,
} from "../src/canonical-intake.mjs";
import { repositoryConfig } from "../src/renovate.mjs";
import { prepareProjectedArtifacts } from "../src/artifact-projection-files.mjs";
const fixture = JSON.parse(
  gunzipSync(
    await readFile(
      new URL(
        "./fixtures/desktop-seeded-sdk-projection.json.gz",
        import.meta.url,
      ),
    ),
  ),
);
const historical = fixture.historical;
function args() {
  return structuredClone({
    before: historical.before,
    candidateManifest: historical.merged.outputs["package.json"],
    projected: historical.generated.files,
    target: "0.2.1",
    targetRange: "^0.2.1",
    integrity:
      historical.merged.outputs &&
      YAML.parse(historical.merged.outputs["pnpm-lock.yaml"]).packages[
        "@lapismd/spec-validator@0.2.1"
      ].resolution.integrity,
    descriptor: historical.descriptor,
  });
}

test("actual native before-boundary fails five times; SDK projection source data grants no live capability", () => {
  assert.equal(fixture.nativeBefore.failureCounts.frozenBaseline, 1);
  assert.equal(fixture.nativeBefore.failureCounts.nativeUpdateVariants, 4);
  assert.equal(fixture.nativeBefore.successfulValidRootMetadataOutputs, 0);
  assert.deepEqual(projectionCapabilities().policy.repositories, {});
  const repo = { repository: "lapismd/lapis-desktop", paths: [projectionPath] };
  assert.equal(configuredProjection(repo), null);
});

test("forged projection context cannot reach Git, native pnpm or a private root without operator capability", async () => {
  await assert.rejects(
    prepareProjectedArtifacts({
      root: "/not-a-source-checkout",
      repository: "lapismd/lapis-desktop",
      sourceSha: "a".repeat(40),
      context: {
        descriptorSha256: "a".repeat(64),
        capabilitySha256: projectionCapabilities().sha256,
      },
    }),
    /no exact operator capability/,
  );
});

test("actual immutable current0.2.1 no-op preserves every input byte", () => {
  const f = fixture.current,
    lock = YAML.parse(f.generated.files["pnpm-lock.yaml"]);
  const result = mergeProjection({
    before: f.before,
    descriptor: f.descriptor,
    candidateManifest: f.before["package.json"],
    projected: f.generated.files,
    target: "0.2.1",
    targetRange: "^0.2.1",
    integrity:
      lock.packages["@lapismd/spec-validator@0.2.1"].resolution.integrity,
  });
  assert.deepEqual(result.outputs, f.before);
  assert.equal(result.changed, false);
});

test("genuine historical0.2.0 plus its existing shared closure yields only native SDK blocks", () => {
  const a = args(),
    result = mergeProjection(a);
  assert.deepEqual(result.outputs, historical.merged.outputs);
  assert.deepEqual(
    Object.keys(result.outputs).filter(
      (p) => result.outputs[p] !== a.before[p],
    ),
    ["package.json", "pnpm-lock.yaml"],
  );
  assert.equal(
    immutableProjectionShape(result.outputs),
    a.descriptor.immutableShapeSha256,
  );
  const seed = seedProjection(a.before),
    lock = YAML.parse(seed["pnpm-lock.yaml"]);
  assert.deepEqual(
    Object.keys(lock.packages).sort(),
    ["@lapismd/spec-validator@0.2.0", "jiti@2.7.0", "typescript@5.9.3"].sort(),
  );
  assert.equal(lock.importers["."].dependencies, undefined);
});

test("coordinator capability independently binds exact source bytes and immutable private context", () => {
  const a = args(),
    bytes = JSON.stringify(a.descriptor),
    sha256 = projectionHash(bytes);
  const repo = {
    repository: "lapismd/lapis-desktop",
    paths: [projectionPath],
    artifactProjection: {
      bytes,
      sha256,
      descriptor: a.descriptor,
      inputs: a.before,
    },
  };
  const cap = projectionCapabilities(
    JSON.stringify({
      schemaVersion: 1,
      repositories: { [repo.repository]: sha256 },
    }),
  );
  assert.deepEqual(configuredProjection(repo, cap), {
    descriptorSha256: sha256,
    capabilitySha256: cap.sha256,
  });
  assert.equal(configuredProjection(repo), null);
  assert.throws(() =>
    configuredProjection(
      {
        ...repo,
        artifactProjection: { ...repo.artifactProjection, bytes: bytes + " " },
      },
      cap,
    ),
  );
  assert.throws(() =>
    projectionCapabilities(
      JSON.stringify({
        schemaVersion: 1,
        repositories: { "lapismd/other": sha256 },
      }),
    ),
  );
});

test("duplicate source descriptor or trusted capability fields cannot hide authority", () => {
  assert.throws(() =>
    parseProjectionDescriptor(
      JSON.stringify(historical.descriptor).replace(
        '"schemaVersion":1',
        '"schemaVersion":1,"schemaVersion":1',
      ),
    ),
  );
  assert.throws(() =>
    projectionCapabilities(
      '{"schemaVersion":1,"schemaVersion":1,"repositories":{}}',
    ),
  );
});

for (const [name, mutate] of [
  [
    "file-backed closure override",
    (a) => {
      const w = YAML.parse(a.before["pnpm-workspace.yaml"]);
      w.overrides.jiti = "file:/private/material";
      a.before["pnpm-workspace.yaml"] = YAML.stringify(w);
    },
  ],
  [
    "source hook configuration",
    (a) => {
      const w = YAML.parse(a.before["pnpm-workspace.yaml"]);
      w.pnpmfile = "scripts/untrusted.cjs";
      a.before["pnpm-workspace.yaml"] = YAML.stringify(w);
    },
  ],
  [
    "ambiguous duplicate SDK JSON key",
    (a) => {
      a.candidateManifest = a.candidateManifest.replace(
        '"@lapismd/spec-validator": "^0.2.1"',
        '"@lapismd/spec-validator": "^0.2.1", "@lapismd/spec-validator": "^0.2.1"',
      );
    },
  ],
  [
    "source private inventory bytes",
    (a) => {
      a.before["scripts/ci-sources.json"] += "\n";
    },
  ],
  [
    "nested CI-docs SDK",
    (a) => {
      a.before[".github/ci-docs/package.json"] = a.before[
        ".github/ci-docs/package.json"
      ].replace('"0.2.0"', '"0.2.1"');
    },
  ],
  [
    "root runtime field",
    (a) => {
      const m = JSON.parse(a.candidateManifest);
      m.dependencies["@lapismd/ai"] = "0.2.1";
      a.candidateManifest = JSON.stringify(m);
    },
  ],
  [
    "private metadata",
    (a) => {
      const m = JSON.parse(a.candidateManifest);
      m.scripts.build = "echo skipped";
      a.candidateManifest = JSON.stringify(m);
    },
  ],
  [
    "unexpected private manifest field",
    (a) => {
      const m = JSON.parse(a.candidateManifest);
      m.unreviewed = true;
      a.candidateManifest = JSON.stringify(m);
    },
  ],
  [
    "new shared jiti resolution",
    (a) => {
      const l = YAML.parse(a.projected["pnpm-lock.yaml"]);
      l.packages["jiti@2.7.0"].resolution.integrity = "other";
      a.projected["pnpm-lock.yaml"] = YAML.stringify(l);
    },
  ],
  [
    "shared TypeScript row",
    (a) => {
      const l = YAML.parse(a.projected["pnpm-lock.yaml"]);
      l.snapshots["typescript@5.9.3"].dependencies = {};
      a.projected["pnpm-lock.yaml"] = YAML.stringify(l);
    },
  ],
  [
    "SDK metadata drift",
    (a) => {
      const l = YAML.parse(a.projected["pnpm-lock.yaml"]);
      l.packages["@lapismd/spec-validator@0.2.1"].engines.node = ">=24";
      a.projected["pnpm-lock.yaml"] = YAML.stringify(l);
    },
  ],
  [
    "SDK extra dependency",
    (a) => {
      const l = YAML.parse(a.projected["pnpm-lock.yaml"]);
      l.snapshots["@lapismd/spec-validator@0.2.1"].dependencies.extra = "1.0.0";
      a.projected["pnpm-lock.yaml"] = YAML.stringify(l);
    },
  ],
  [
    "unreachable latest graph row",
    (a) => {
      const l = YAML.parse(a.projected["pnpm-lock.yaml"]);
      l.packages["jiti@99.0.0"] = {};
      a.projected["pnpm-lock.yaml"] = YAML.stringify(l);
    },
  ],
  [
    "wrong integrity",
    (a) => {
      a.integrity = "sha512-" + Buffer.alloc(64).toString("base64");
    },
  ],
  [
    "major target",
    (a) => {
      a.target = "1.0.0";
      a.targetRange = "1.0.0";
    },
  ],
  [
    "prerelease target",
    (a) => {
      a.target = "0.2.2-next.1";
    },
  ],
  [
    "descriptor mutation",
    (a) => {
      a.descriptor.immutableShapeSha256 = "0".repeat(64);
    },
  ],
  [
    "extra descriptor authority",
    (a) => {
      a.descriptor.command = "echo granted";
    },
  ],
])
  test(`seeded SDK copyback rejects ${name} before mutating caller inputs`, () => {
    const a = args();
    mutate(a);
    const saved = structuredClone(a);
    assert.throws(() => mergeProjection(a));
    assert.deepEqual(a, saved);
  });

test("regex declaration selects only exact root SDK development metadata and contains no install bypass", () => {
  const config = projectionRegexManager();
  assert.deepEqual(config.managerFilePatterns, ["/^package\\.json$/"]);
  assert.equal(config.depTypeTemplate, "devDependencies");
  assert.equal(config.datasourceTemplate, "npm");
  assert.equal(config.registryUrlTemplate, "https://registry.npmjs.org");
  assert.equal(config.depNameTemplate, "@lapismd/spec-validator");
  assert.equal(JSON.stringify(config).includes("skipInstalls"), false);
});

function controlledOptIn() {
  const before = structuredClone(historical.before),
    name = "@lapismd/spec-validator",
    repository = "lapismd/lapis-desktop",
    sourceSha = "c".repeat(40);
  const manifest = JSON.parse(before["package.json"]);
  manifest.devDependencies[name] = "0.2.0";
  before["package.json"] = JSON.stringify(manifest, null, 2) + "\n";
  const workspace = YAML.parse(before["pnpm-workspace.yaml"]);
  workspace.overrides[name] = "0.2.0";
  before["pnpm-workspace.yaml"] = YAML.stringify(workspace);
  const lock = YAML.parse(before["pnpm-lock.yaml"]);
  lock.overrides[name] = "0.2.0";
  lock.importers["."].devDependencies[name].specifier = "0.2.0";
  before["pnpm-lock.yaml"] = YAML.stringify(lock);
  const descriptor = {
      ...historical.descriptor,
      immutableShapeSha256: immutableProjectionShape(before),
    },
    bytes = JSON.stringify(descriptor, null, 2) + "\n",
    sha256 = projectionHash(bytes);
  before[projectionPath] = bytes;
  const policy = {
      schemaVersion: 1,
      kind: "single-development-dependency",
      repository,
      dependency: name,
      slot: "validator-development",
      chapters: [
        "spec/src/current/governance.md",
        "spec/src/current/local-dependencies.md",
      ],
    },
    policyBytes = JSON.stringify(policy, null, 2) + "\n";
  before[intakePolicyPath] = policyBytes;
  for (const p of policy.chapters)
    before[p] =
      "# Controlled canonical opt-in\n\n" +
      intakeSlot(policy, intakeFacts(policy, policyBytes, before)) +
      "\n\nAuthored control text remains.\n";
  const repo = {
    repository,
    sourceSha,
    packageManager: "pnpm@10.34.5",
    paths: Object.keys(before),
    manifests: [{ repository, path: "package.json", manifest }],
    workspace,
    lock,
    canonicalIntake: { policyBytes, policy, sha256: intakeHash(policyBytes) },
    artifactProjection: { descriptor, bytes, sha256, inputs: before },
  };
  const update = {
    repository,
    path: "package.json",
    type: "devDependencies",
    name,
    range: "0.2.0",
    current: "0.2.0",
    target: "0.2.1",
    targetRange: "0.2.1",
    compatibility: "compatible",
    releaseIntent: null,
    updateType: "patch",
  };
  const node = {
    repository,
    sourceSha,
    acceptance: { state: "qualified" },
    holds: [],
    waits: [],
    updates: [update],
    admittedUpdates: [update],
    status: "admitted",
  };
  const graph = {
    packages: [],
    repositories: [repo],
    available: { [name]: ["0.2.1"] },
    registry: { [name]: { "0.2.1": { integrity: args().integrity } } },
    unpublished: [],
    cycles: [],
    edges: [update],
    waveAdmission: { nodes: [node] },
  };
  const capabilityBytes =
    JSON.stringify({
      schemaVersion: 1,
      repositories: { [repository]: sha256 },
    }) + "\n";
  return {
    before,
    repo,
    graph,
    node,
    policy,
    sourceSha,
    capabilityBytes,
    capabilities: projectionCapabilities(capabilityBytes),
  };
}

test("ordinary npm remains default and neither source data nor capability clears admission holds", () => {
  const f = controlledOptIn();
  assert.deepEqual(
    repositoryConfig(f.repo, f.graph, process.cwd()).enabledManagers,
    ["npm"],
  );
  const config = repositoryConfig(
    f.repo,
    f.graph,
    process.cwd(),
    f.capabilities,
  );
  assert.deepEqual(config.enabledManagers, ["custom.regex"]);
  assert.equal(config.skipInstalls, undefined);
  assert.equal(config.skipArtifactsUpdate, undefined);
  assert.equal(config.postUpgradeTasks.commands.length, 1);
  assert(config.postUpgradeTasks.fileFilters.includes("pnpm-lock.yaml"));
  f.node.holds.push("private source prerequisites");
  assert.throws(
    () => repositoryConfig(f.repo, f.graph, process.cwd(), f.capabilities),
    /ordinary canonical admission/,
  );
});

test(
  "real pinned Renovate regex, native artifact phase, trusted post-task and commit collect the seeded outputs",
  { timeout: 180000 },
  async () => {
    const f = controlledOptIn(),
      root = await mkdtemp(join(tmpdir(), "sdk-native-post-")),
      tools = await mkdtemp(join(tmpdir(), "sdk-native-tools-"));
    try {
      for (const [path, bytes] of Object.entries(f.before)) {
        await mkdir(dirname(join(root, path)), { recursive: true });
        await writeFile(join(root, path), bytes);
      }
      const inputFile = join(tools, "input.json"),
        outputFile = join(tools, "output.json"),
        config = repositoryConfig(
          f.repo,
          f.graph,
          process.cwd(),
          f.capabilities,
        );
      const collect = [
        "package.json",
        "pnpm-workspace.yaml",
        "pnpm-lock.yaml",
        ...f.policy.chapters,
      ];
      for (const [label, generated] of [
        ["projection", config],
        ["ordinary", repositoryConfig(f.repo, f.graph, process.cwd())],
      ]) {
        const path = join(tools, `${label}-config.json`);
        await writeFile(path, JSON.stringify(generated));
        const output = execFileSync(
          process.execPath,
          [
            fileURLToPath(
              new URL(
                "../node_modules/renovate/dist/config-validator.js",
                import.meta.url,
              ),
            ),
            "--strict",
            path,
          ],
          {
            encoding: "utf8",
            timeout: 30000,
            maxBuffer: 1024 * 1024,
            env: {
              PATH: dirname(process.execPath) + ":/usr/bin:/bin",
              TMPDIR: tmpdir(),
            },
          },
        );
        assert.match(output, /Config validated successfully/);
      }
      await writeFile(
        inputFile,
        JSON.stringify({
          root,
          before: f.before,
          sourceSha: f.sourceSha,
          collect,
          capabilityPath: fileURLToPath(
            new URL("../config/artifact-projections.json", import.meta.url),
          ),
          capabilityBytes: f.capabilityBytes,
          cacheDir: join(tools, "cache"),
          config,
        }),
      );
      execFileSync(
        process.execPath,
        [
          "--experimental-test-module-mocks",
          fileURLToPath(
            new URL("./helpers/native-projected-renovate.mjs", import.meta.url),
          ),
          inputFile,
          outputFile,
        ],
        {
          env: {
            ...process.env,
            LAPIS_AUTOMATION_REPOSITORY: f.repo.repository,
          },
          encoding: "utf8",
          timeout: 170000,
          maxBuffer: 2 * 1024 * 1024,
        },
      );
      const result = JSON.parse(await readFile(outputFile, "utf8"));
      assert.equal(result.extracted.deps.length, 1);
      assert.equal(result.nativeArtifactCount, 0);
      assert.deepEqual(Object.keys(result.finalFiles).sort(), collect.sort());
      const after = { ...f.before, ...result.finalFiles };
      assert.equal(
        immutableProjectionShape(after),
        f.repo.artifactProjection.descriptor.immutableShapeSha256,
      );
      assert.equal(
        JSON.parse(after["package.json"]).devDependencies[
          "@lapismd/spec-validator"
        ],
        "0.2.1",
      );
      assert.equal(
        after["scripts/ci-sources.json"],
        f.before["scripts/ci-sources.json"],
      );
      assert.equal(
        after[".github/ci-docs/package.json"],
        f.before[".github/ci-docs/package.json"],
      );
      assert(
        f.policy.chapters.every(
          (p) =>
            after[p].includes('"version": "0.2.1"') &&
            after[p].endsWith("Authored control text remains.\n"),
        ),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(tools, { recursive: true, force: true });
    }
  },
);

for (const portMutation of ["revoke-capability", "private-input-drift"])
  test(
    `late ${portMutation} rejects before any native artifact copyback`,
    { timeout: 180000 },
    async () => {
      const f = controlledOptIn(),
        root = await mkdtemp(join(tmpdir(), "sdk-late-post-")),
        tools = await mkdtemp(join(tmpdir(), "sdk-late-tools-"));
      try {
        for (const [path, bytes] of Object.entries(f.before)) {
          await mkdir(dirname(join(root, path)), { recursive: true });
          await writeFile(join(root, path), bytes);
        }
        const inputFile = join(tools, "input.json");
        await writeFile(
          inputFile,
          JSON.stringify({
            root,
            before: f.before,
            sourceSha: f.sourceSha,
            collect: [
              "package.json",
              "pnpm-workspace.yaml",
              "pnpm-lock.yaml",
              ...f.policy.chapters,
            ],
            capabilityPath: fileURLToPath(
              new URL("../config/artifact-projections.json", import.meta.url),
            ),
            capabilityBytes: f.capabilityBytes,
            cacheDir: join(tools, "cache"),
            config: repositoryConfig(
              f.repo,
              f.graph,
              process.cwd(),
              f.capabilities,
            ),
            portMutation,
          }),
        );
        assert.throws(
          () =>
            execFileSync(
              process.execPath,
              [
                "--experimental-test-module-mocks",
                fileURLToPath(
                  new URL(
                    "./helpers/native-projected-renovate.mjs",
                    import.meta.url,
                  ),
                ),
                inputFile,
                join(tools, "output.json"),
              ],
              {
                env: {
                  ...process.env,
                  LAPIS_AUTOMATION_REPOSITORY: f.repo.repository,
                },
                timeout: 170000,
                maxBuffer: 2 * 1024 * 1024,
                stdio: "pipe",
              },
            ),
          /late binding drift|input changed during generation/,
        );
        for (const p of [
          "pnpm-workspace.yaml",
          "pnpm-lock.yaml",
          ...f.policy.chapters,
        ])
          assert.equal(await readFile(join(root, p), "utf8"), f.before[p]);
      } finally {
        await rm(root, { recursive: true, force: true });
        await rm(tools, { recursive: true, force: true });
      }
    },
  );
