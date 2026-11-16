import assert from "node:assert/strict";
import test from "node:test";
import YAML from "yaml";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { classifySpecFirstChanges } from "@lapismd/spec-validator";
import {
  intakeFacts,
  intakeSlot,
  prepareCanonicalIntake,
} from "../src/canonical-intake.mjs";
const fixture = JSON.parse(
  gunzipSync(
    await readFile(
      new URL("./fixtures/notebook-core-intake.json.gz", import.meta.url),
    ),
  ),
);
const chapters = [
  "spec/src/plugins/notebook/index.md",
  "spec/src/spec-governance.md",
];
const policy = {
  schemaVersion: 1,
  kind: "single-development-dependency",
  repository: fixture.repository,
  dependency: "@lapismd/design-core",
  slot: "core-development",
  chapters,
};
const policyBytes = JSON.stringify(policy, null, 2) + "\n";
function input() {
  const before = structuredClone(fixture.before),
    after = structuredClone(fixture.after);
  const baseChapters = Object.fromEntries(
    chapters.map((p) => [
      p,
      "# Source-owned contract\n\n" +
        intakeSlot(policy, intakeFacts(policy, policyBytes, before)) +
        "\n\nAuthored text stays.\n",
    ]),
  );
  return {
    repository: fixture.repository,
    sourceSha: fixture.sourceSha,
    headSha: fixture.sourceSha,
    policyBytes,
    currentPolicyBytes: policyBytes,
    before,
    after,
    baseChapters,
    currentChapters: { ...baseChapters },
    changedFiles: Object.keys(before),
  };
}
const map = {
  rules: [
    { pattern: "^package\\.json$", chapters: [chapters[0]] },
    { pattern: "^pnpm-", chapters: [chapters[1]] },
  ],
  protected: ["^package\\.json$", "^pnpm-"],
};
test("actual Notebook PR36 has two missing chapters before preparation and none after", () => {
  const data = input();
  assert.equal(
    classifySpecFirstChanges(data.changedFiles, map).missingChapters.length,
    2,
  );
  const result = prepareCanonicalIntake(data);
  assert.equal(result.facts.version, "0.13.4");
  assert.equal(
    classifySpecFirstChanges(
      [...data.changedFiles, ...Object.keys(result.outputs)],
      map,
    ).missingChapters.length,
    0,
  );
  for (const p of chapters) {
    assert(result.outputs[p].endsWith("Authored text stays.\n"));
    assert(result.outputs[p].includes("0.13.4"));
  }
  assert.deepEqual(
    prepareCanonicalIntake({ ...data, currentChapters: result.outputs })
      .outputs,
    result.outputs,
  );
});
for (const [name, mutate] of [
  ["stale source", (d) => (d.headSha = "f".repeat(40))],
  ["changed policy", (d) => (d.currentPolicyBytes += " ")],
  ["missing policy", (d) => (d.policyBytes = undefined)],
  ["unexpected source", (d) => d.changedFiles.push("src/lib/product.ts")],
  [
    "manual canonical text",
    (d) => (d.currentChapters[chapters[0]] += "Manual repair"),
  ],
  [
    "ambiguous marker",
    (d) => (d.baseChapters[chapters[0]] += d.baseChapters[chapters[0]]),
  ],
  ["missing marker", (d) => (d.baseChapters[chapters[0]] = "no marker")],
  [
    "changed script",
    (d) => {
      const p = JSON.parse(d.after["package.json"]);
      p.scripts.test = "true";
      d.after["package.json"] = JSON.stringify(p);
    },
  ],
  [
    "arbitrary lock package",
    (d) => (d.after["pnpm-lock.yaml"] += "\nunknownSetting: changed\n"),
  ],
  [
    "wrong override",
    (d) =>
      (d.after["pnpm-workspace.yaml"] = d.after["pnpm-workspace.yaml"].replace(
        "0.13.4",
        "0.13.5",
      )),
  ],
])
  test(`canonical intake holds ${name} without rewriting inputs`, () => {
    const data = input();
    mutate(data);
    const saved = structuredClone(data);
    assert.throws(() => prepareCanonicalIntake(data), /Canonical intake held/);
    assert.deepEqual(data, saved);
  });

test("native Renovate post-upgrade filters retain exactly the opted-in two chapters", async () => {
  const { repositoryConfig } = await import("../src/renovate.mjs");
  const { minimatch } =
    await import("../node_modules/renovate/dist/util/minimatch.js");
  const data = input(),
    result = prepareCanonicalIntake(data);
  const repo = {
    repository: fixture.repository,
    sourceSha: fixture.sourceSha,
    canonicalIntake: { policy, sha256: "a".repeat(64) },
    manifests: [
      {
        path: "package.json",
        manifest: JSON.parse(data.before["package.json"]),
      },
    ],
    workspace: {},
  };
  const graph = {
    packages: [],
    available: {},
    unpublished: [],
    cycles: [],
    edges: [],
    repositories: [repo],
  };
  const config = repositoryConfig(repo, graph, process.cwd());
  const filters = config.postUpgradeTasks.fileFilters;
  const retained = Object.keys(result.outputs).filter((p) =>
    filters.some((pattern) => minimatch(pattern, { dot: true }).match(p)),
  );
  assert.deepEqual(retained, chapters);
  assert(
    !filters.some((pattern) =>
      minimatch(pattern, { dot: true }).match("spec/src/unrelated.md"),
    ),
  );
  assert.equal(
    classifySpecFirstChanges([...data.changedFiles, ...retained], map).ok,
    true,
  );
  assert.equal(
    JSON.parse(config.postUpgradeTasks.dataFileTemplate).sourceSha,
    fixture.sourceSha,
  );
});

test("filesystem preparation binds admitted source, regular paths and immutable policy before writes", async () => {
  const { mkdtemp, mkdir, writeFile, rm, symlink } =
    await import("node:fs/promises");
  const { join, dirname } = await import("node:path");
  const { tmpdir } = await import("node:os");
  const { execFileSync } = await import("node:child_process");
  const { prepareCanonicalFiles } =
    await import("../src/canonical-intake-files.mjs");
  const { intakeHash, intakePolicyPath } =
    await import("../src/canonical-intake.mjs");
  const root = await mkdtemp(join(tmpdir(), "canonical-intake-"));
  // Only this disposable fixture uses Git plumbing: production preparation runs
  // in Renovate's Git clone, and hosted verification does not require jj.
  const git = (args, input) =>
    execFileSync(
      "git",
      [
        "--git-dir",
        join(root, ".git"),
        "--work-tree",
        root,
        "-c",
        "commit.gpgsign=false",
        ...args,
      ],
      {
        cwd: root,
        input,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          PATH: process.env.PATH,
          GIT_CONFIG_NOSYSTEM: "1",
          GIT_CONFIG_GLOBAL: "/dev/null",
          GIT_AUTHOR_NAME: "Intake fixture",
          GIT_AUTHOR_EMAIL: "fixture@example.invalid",
          GIT_COMMITTER_NAME: "Intake fixture",
          GIT_COMMITTER_EMAIL: "fixture@example.invalid",
        },
      },
    ).trim();
  try {
    git(["init", "--quiet"]);
    const data = input();
    const seed = {
      ...data.before,
      ...data.baseChapters,
      [intakePolicyPath]: policyBytes,
    };
    for (const [p, bytes] of Object.entries(seed)) {
      await mkdir(dirname(join(root, p)), { recursive: true });
      await writeFile(join(root, p), bytes);
    }
    const { readdir } = await import("node:fs/promises");
    async function tree(directory = "") {
      const entries = [];
      for (const entry of (
        await readdir(join(root, directory), { withFileTypes: true })
      ).sort((a, b) => a.name.localeCompare(b.name))) {
        if (entry.name === ".git") continue;
        const relative = join(directory, entry.name);
        entries.push(
          entry.isDirectory()
            ? `040000 tree ${await tree(relative)}\t${entry.name}`
            : `100644 blob ${git(["hash-object", "-w", "--stdin"], await readFile(join(root, relative)))}\t${entry.name}`,
        );
      }
      return git(["mktree"], entries.join("\n") + "\n");
    }
    const sourceSha = git(
      ["commit-tree", await tree()],
      "Reviewed source policy\n",
    );
    git(["update-ref", "HEAD", sourceSha]);
    git(["read-tree", sourceSha]);
    for (const [p, bytes] of Object.entries(data.after))
      await writeFile(join(root, p), bytes);
    const args = {
      root,
      repository: fixture.repository,
      sourceSha,
      policySha256: intakeHash(policyBytes),
    };
    await assert.rejects(
      prepareCanonicalFiles({ ...args, sourceSha: "f".repeat(40) }),
      /stale admitted source/,
    );
    await assert.rejects(
      prepareCanonicalFiles({ ...args, policySha256: "f".repeat(64) }),
      /policy digest/,
    );
    for (const p of chapters)
      assert.equal(await readFile(join(root, p), "utf8"), data.baseChapters[p]);
    const { fileURLToPath } = await import("node:url");
    const { chmod } = await import("node:fs/promises");
    const toolsRoot = await mkdtemp(join(tmpdir(), "canonical-tools-"));
    try {
      const contextFile = join(toolsRoot, "context.json"),
        logFile = join(toolsRoot, "install.log");
      await writeFile(
        join(toolsRoot, "pnpm"),
        '#!/bin/sh\necho "$*" > "$LAPIS_TEST_INSTALL_LOG"\n',
      );
      await chmod(join(toolsRoot, "pnpm"), 0o755);
      const env = {
        ...process.env,
        PATH: toolsRoot + ":" + process.env.PATH,
        LAPIS_AUTOMATION_REPOSITORY: fixture.repository,
        RENOVATE_POST_UPGRADE_COMMAND_DATA_FILE: contextFile,
        LAPIS_TEST_INSTALL_LOG: logFile,
      };
      const script = fileURLToPath(
        new URL("../scripts/prepare-pr.mjs", import.meta.url),
      );
      await writeFile(
        contextFile,
        JSON.stringify({ branchName: "lapis-dependencies/lapis-first-party" }),
      );
      assert.throws(
        () =>
          execFileSync(process.execPath, [script], {
            cwd: root,
            env,
            stdio: "pipe",
          }),
        /missing admitted source policy context/,
      );
      await writeFile(
        contextFile,
        JSON.stringify({
          branchName: "lapis-dependencies/lapis-first-party",
          sourceSha,
          canonicalPolicySha256: args.policySha256,
        }),
      );
      execFileSync(process.execPath, [script], {
        cwd: root,
        env,
        stdio: "pipe",
      });
      assert.equal(
        (await readFile(logFile, "utf8")).trim(),
        "install --frozen-lockfile --ignore-scripts --ignore-pnpmfile",
      );
    } finally {
      await rm(toolsRoot, { recursive: true, force: true });
    }
    const result = await prepareCanonicalFiles(args);
    for (const p of chapters)
      assert.equal(await readFile(join(root, p), "utf8"), result.outputs[p]);
    await rm(join(root, chapters[0]));
    await symlink(join(root, chapters[1]), join(root, chapters[0]));
    await assert.rejects(prepareCanonicalFiles(args), /unsafe current file/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

for (const [name, mutate] of [
  [
    "same-version integrity mutation",
    (d) => {
      d.after = structuredClone(d.before);
      const lock = YAML.parse(d.after["pnpm-lock.yaml"]);
      lock.packages["@lapismd/design-core@0.13.3"].resolution.integrity =
        "sha512-" + Buffer.alloc(64, 1).toString("base64");
      d.after["pnpm-lock.yaml"] = YAML.stringify(lock);
    },
  ],
  [
    "unrelated package integrity mutation",
    (d) => {
      const lock = YAML.parse(d.after["pnpm-lock.yaml"]);
      const key = Object.keys(lock.packages).find(
        (k) =>
          !k.startsWith("@lapismd/design-core@") &&
          lock.packages[k].resolution?.integrity,
      );
      lock.packages[key].resolution.integrity =
        "sha512-" + Buffer.alloc(64, 1).toString("base64");
      d.after["pnpm-lock.yaml"] = YAML.stringify(lock);
    },
  ],
  [
    "unrelated importer specifier mutation",
    (d) => {
      const lock = YAML.parse(d.after["pnpm-lock.yaml"]);
      lock.importers["."].devDependencies["@lapismd/mira"].specifier = "0.13.4";
      d.after["pnpm-lock.yaml"] = YAML.stringify(lock);
    },
  ],
])
  test(`canonical preparation rejects ${name}`, () => {
    const d = input();
    mutate(d);
    assert.throws(() => prepareCanonicalIntake(d), /Canonical intake held/);
  });

test("ambiguous normalized peer contexts remain held instead of losing multiplicity", async () => {
  const { lockShape } = await import("../src/canonical-intake.mjs");
  assert.throws(
    () =>
      lockShape(
        {
          snapshots: {
            ["package@1.0.0(" + "a".repeat(32) + ")"]: {},
            ["package@1.0.0(" + "b".repeat(32) + ")"]: {},
          },
        },
        policy.dependency,
        "0.13.3",
      ),
    /ambiguous lock peer closure/,
  );
});

test("selected version boundaries preserve unrelated prefix-sharing identities", async () => {
  const { lockShape } = await import("../src/canonical-intake.mjs");
  const metadata = { resolution: { integrity: "unchanged-bytes" } };
  assert.notDeepEqual(
    lockShape(
      { packages: { "@lapismd/design-core@0.13.30": metadata } },
      policy.dependency,
      "0.13.3",
    ),
    lockShape(
      { packages: { "@lapismd/design-core@0.13.40": metadata } },
      policy.dependency,
      "0.13.4",
    ),
  );
});
test("full preparation rejects an unrelated prefix-sharing package rename", () => {
  const d = input(),
    before = YAML.parse(d.before["pnpm-lock.yaml"]),
    after = YAML.parse(d.after["pnpm-lock.yaml"]);
  const metadata = {
    resolution: {
      integrity: "sha512-" + Buffer.alloc(64, 2).toString("base64"),
    },
  };
  before.packages["@lapismd/design-core@0.13.30"] = metadata;
  after.packages["@lapismd/design-core@0.13.40"] = metadata;
  d.before["pnpm-lock.yaml"] = YAML.stringify(before);
  d.after["pnpm-lock.yaml"] = YAML.stringify(after);
  assert.throws(
    () => prepareCanonicalIntake(d),
    /unsupported manifest, workspace or lock closure/,
  );
});
