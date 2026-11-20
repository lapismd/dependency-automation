import assert from "node:assert/strict";
import test from "node:test";
import {
  readFile,
  readdir,
  mkdtemp,
  mkdir,
  writeFile,
  chmod,
  rm,
  access,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { assertVersioningRuntime } from "../templates/versioning-contract.mjs";
import YAML from "yaml";
import semver from "semver";
import {
  loadToolingPolicy,
  assessTooling,
  guardToolingChange,
  validateToolingPolicy,
} from "../src/tooling.mjs";

const policy = await loadToolingPolicy();
const snapshot = (version = "3.0.3") => ({
  repository: "lapismd/lapis-notes",
  sourceSha: "a".repeat(40),
  manifests: [
    {
      path: "package.json",
      manifest: {
        packageManager: "pnpm@10.34.5",
        engines: { node: ">=22.11" },
        devDependencies: { "@changesets/cli": `^${version}` },
      },
    },
  ],
  lock: {
    importers: { ".": { devDependencies: { "@changesets/cli": { version } } } },
    packages: {
      [`@changesets/cli@${version}`]: {
        resolution: {
          integrity: policy.versioning[version]?.integrity ?? "sha512-unknown",
        },
      },
    },
  },
});

test("installed executable guard rejects changed bytes, versions, engines and install hooks", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "lapis-runtime-contract-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const folder = join(root, "node_modules/@changesets/cli");
  await mkdir(folder, { recursive: true });
  await mkdir(join(root, "scripts/dependency-automation"), { recursive: true });
  await mkdir(join(root, ".changeset"));
  await writeFile(join(root, ".changeset/config.json"), "{}");
  await writeFile(
    join(root, "scripts/dependency-automation/versioning.json"),
    JSON.stringify({
      version: "2.31.1",
      ...policy.versioning["2.31.1"],
      projectConfigSha256: createHash("sha256").update("{}").digest("hex"),
    }),
  );
  const pkg = {
    name: "@changesets/cli",
    version: "2.31.1",
    bin: { changeset: "bin.js" },
  };
  const original = '#!/usr/bin/env node\n"use strict";\n\nrequire("./");\n';
  await writeFile(join(folder, "bin.js"), original);
  await writeFile(join(folder, "package.json"), JSON.stringify(pkg));
  assert.equal(await assertVersioningRuntime(root), "2.31.1");
  await writeFile(
    join(root, ".changeset/config.json"),
    '{"changelog":"./unqualified.mjs"}',
  );
  await assert.rejects(
    assertVersioningRuntime(root),
    /configuration requires source-owned project qualification/,
  );
  await writeFile(join(root, ".changeset/config.json"), "{}");
  for (const bad of [
    { ...pkg, version: "3.0.3" },
    { ...pkg, engines: { node: ">=26" } },
    { ...pkg, scripts: { postinstall: "deno install" } },
  ]) {
    await writeFile(join(folder, "package.json"), JSON.stringify(bad));
    await assert.rejects(
      assertVersioningRuntime(root),
      /reviewed Node executable/,
    );
  }
  await writeFile(join(folder, "package.json"), JSON.stringify(pkg));
  await writeFile(join(folder, "bin.js"), "#!/usr/bin/env deno\n");
  await assert.rejects(
    assertVersioningRuntime(root),
    /reviewed Node executable/,
  );
  await writeFile(join(root, "deno.json"), "{}");
  await writeFile(join(root, ".prettierrc.json"), "{}");
  await assert.rejects(assertVersioningRuntime(root), /Deno formatter input/);
});

test("onboarding retains an existing supported CLI major and refuses unqualified versions", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "lapis-tool-onboarding-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, ".github/workflows"), { recursive: true });
  const pkg = {
    name: "tooling-fixture",
    version: "1.0.0",
    devDependencies: { "@changesets/cli": "^2.31.1" },
  };
  await writeFile(join(root, "package.json"), JSON.stringify(pkg));
  const script = fileURLToPath(
    new URL("../scripts/onboard-changesets.mjs", import.meta.url),
  );
  execFileSync(process.execPath, [script, root]);
  assert.equal(
    JSON.parse(await readFile(join(root, "package.json"), "utf8"))
      .devDependencies["@changesets/cli"],
    "^2.31.1",
  );
  assert.equal(
    JSON.parse(
      await readFile(
        join(root, "scripts/dependency-automation/versioning.json"),
        "utf8",
      ),
    ).version,
    "2.31.1",
  );
  pkg.devDependencies["@changesets/cli"] = "^4.0.0";
  await writeFile(join(root, "package.json"), JSON.stringify(pkg));
  assert.throws(
    () => execFileSync(process.execPath, [script, root], { stdio: "pipe" }),
    /owning-source runtime qualification/,
  );
  pkg.devDependencies["@changesets/cli"] = "^3.0.3";
  pkg.scripts = { "release:version": "node scripts/source-owned-version.mjs" };
  await writeFile(join(root, "package.json"), JSON.stringify(pkg));
  assert.throws(
    () => execFileSync(process.execPath, [script, root], { stdio: "pipe" }),
    /source-owned version recipe/,
  );
  pkg.scripts = {};
  await writeFile(join(root, "package.json"), JSON.stringify(pkg));
  await writeFile(
    join(root, ".changeset/config.json"),
    '{"changelog":"./custom.mjs"}',
  );
  assert.throws(
    () => execFileSync(process.execPath, [script, root], { stdio: "pipe" }),
    /source-owned Changesets configuration/,
  );
  await writeFile(join(root, "deno.jsonc"), "{}");
  assert.throws(
    () => execFileSync(process.execPath, [script, root], { stdio: "pipe" }),
    /Deno formatter input/,
  );
});

test("production post-upgrade hook rejects a new runtime before writing release intent", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "lapis-tool-candidate-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "bin"));
  await mkdir(join(root, ".changeset"));
  const before = snapshot(),
    after = snapshot("3.1.0");
  for (const s of [before, after]) {
    Object.assign(s.manifests[0].manifest, {
      name: "tooling-fixture",
      version: "1.0.0",
      dependencies: { "@lapismd/mira": "~0.2.0" },
    });
  }
  after.manifests[0].manifest.dependencies["@lapismd/mira"] = "~0.2.1";
  await writeFile(
    join(root, "package.json"),
    JSON.stringify(after.manifests[0].manifest),
  );
  await writeFile(join(root, "pnpm-lock.yaml"), YAML.stringify(after.lock));
  await writeFile(
    join(root, ".changeset/config.json"),
    '{"baseBranch":"main"}',
  );
  await writeFile(
    join(root, "context.json"),
    '{"branchName":"lapis-dependencies/lapis-first-party"}',
  );
  for (const [name, code] of [
    [
      "pnpm",
      'require("node:fs").writeFileSync("calls.json", JSON.stringify(process.argv.slice(2)))',
    ],
    [
      "git",
      `const args=process.argv.slice(2); if(args[0]==="show") process.stdout.write(args[1]==="HEAD:package.json"?${JSON.stringify(JSON.stringify(before.manifests[0].manifest))}:${JSON.stringify(YAML.stringify(before.lock))}); else process.stdout.write("package.json\\n");`,
    ],
  ]) {
    const file = join(root, "bin", name);
    await writeFile(file, `#!${process.execPath}\n${code}\n`);
    await chmod(file, 0o755);
  }
  const script = fileURLToPath(
    new URL("../scripts/prepare-pr.mjs", import.meta.url),
  );
  const options = {
    cwd: root,
    stdio: "pipe",
    env: {
      ...process.env,
      PATH: join(root, "bin") + ":" + process.env.PATH,
      RENOVATE_POST_UPGRADE_COMMAND_DATA_FILE: join(root, "context.json"),
      LAPIS_AUTOMATION_REPOSITORY: before.repository,
    },
  };
  assert.throws(
    () => execFileSync(process.execPath, [script], options),
    /unqualified versioning/,
  );
  assert.deepEqual(
    JSON.parse(await readFile(join(root, "calls.json"), "utf8")),
    ["install", "--frozen-lockfile", "--ignore-scripts", "--ignore-pnpmfile"],
  );
  assert.deepEqual(await readdir(join(root, ".changeset")), ["config.json"]);
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      ...after.manifests[0].manifest,
      devDependencies: before.manifests[0].manifest.devDependencies,
    }),
  );
  await writeFile(join(root, "pnpm-lock.yaml"), YAML.stringify(before.lock));
  execFileSync(process.execPath, [script], options);
  const { changesetPath } = await import("../src/changesets.mjs");
  const note = join(
    root,
    changesetPath("lapis-dependencies/lapis-first-party"),
  );
  await access(note);
  const privateBefore = {
      ...before.manifests[0].manifest,
      private: true,
      dependencies: { "@lapismd/mira": "~0.2.0" },
    },
    privateAfter = {
      ...privateBefore,
      dependencies: { "@lapismd/mira": "~0.2.1" },
    };
  await writeFile(join(root, "package.json"), JSON.stringify(privateAfter));
  await writeFile(
    join(root, "bin/git"),
    `#!${process.execPath}\nconst args=process.argv.slice(2); if(args[0]==="show") process.stdout.write(args[1]==="HEAD:package.json"?${JSON.stringify(JSON.stringify(privateBefore))}:${JSON.stringify(YAML.stringify(before.lock))}); else process.stdout.write("package.json\\n");\n`,
  );
  options.env.LAPIS_EMPTY_CHANGESET = "1";
  execFileSync(process.execPath, [script], options);
  assert.equal(
    await readFile(note, "utf8"),
    "---\n---\n\nRefresh first-party Lapis dependencies to the published versions recorded in this pull request.\n",
  );
});

test("qualified Node Changesets contracts retain both existing major versions", () => {
  for (const version of ["2.31.1", "3.0.3"]) {
    const result = assessTooling(snapshot(version), policy);
    assert.equal(result.versioning.state, "reviewed-node-cli");
    assert.equal(result.versioning.version, version);
    assert.equal(policy.versioning[version].runtime, "node");
    assert.match(policy.versioning[version].binSha256, /^[a-f0-9]{64}$/);
  }
});

test("candidate preparation rejects unreviewed runtime adoption and altered registry bytes", () => {
  assert.throws(
    () => guardToolingChange(snapshot(), snapshot("3.1.0"), policy),
    /unqualified versioning/,
  );
  const altered = snapshot();
  altered.lock.packages["@changesets/cli@3.0.3"].resolution.integrity =
    "sha512-changed";
  assert.throws(
    () => guardToolingChange(snapshot(), altered, policy),
    /unqualified versioning/,
  );
  assert.throws(
    () => guardToolingChange(snapshot("2.31.1"), snapshot(), policy),
    /major.*source qualification/,
  );
});

test("unchanged legacy tooling is reported without forcing consumer migrations", () => {
  const old = snapshot("2.30.0");
  assert.equal(assessTooling(old, policy).versioning.state, "unqualified");
  assert.doesNotThrow(() =>
    guardToolingChange(old, structuredClone(old), policy),
  );
  const next = snapshot();
  assert.doesNotThrow(() => guardToolingChange(snapshot(), next, policy));
  const mixed = { ...snapshot(), toolingInputs: ["deno.json"] };
  assert.equal(
    assessTooling(mixed, policy).project.state,
    "source-qualification-required",
  );
  assert.doesNotThrow(() =>
    guardToolingChange(mixed, structuredClone(mixed), policy),
  );
  assert.throws(
    () =>
      guardToolingChange({ ...snapshot(), toolingInputs: [] }, mixed, policy),
    /New Deno formatter input/,
  );
});

test("tool cohorts retain repository differences and reject newly mixed engines", () => {
  assert.notDeepEqual(
    policy.repositories["lapismd/mira-mde"].tools,
    policy.repositories["lapismd/design-core"].tools,
  );
  assert.equal(
    semver.major(
      semver.minVersion(
        policy.repositories["lapismd/design-core"].tools.vitest,
      ),
    ),
    5,
  );
  assert.equal(
    semver.major(
      semver.minVersion(policy.repositories["lapismd/design-core"].tools.vite),
    ),
    8,
  );
  assert.equal(
    semver.major(
      semver.minVersion(policy.repositories["lapismd/mira-mde"].tools.vitest),
    ),
    4,
  );
  assert.equal(
    semver.major(
      semver.minVersion(
        policy.repositories["lapismd/lapis-plugin-notebook"].tools.vite,
      ),
    ),
    6,
  );
  const before = snapshot();
  const after = snapshot();
  before.manifests[0].manifest.devDependencies.vitest = "4.1.12";
  after.manifests[0].manifest.devDependencies.vitest = "5.0.5";
  assert.throws(
    () => guardToolingChange(before, after, policy),
    /cohort drift/,
  );
  const denied = snapshot();
  denied.manifests[0].manifest.engines.node = ">=26";
  assert.throws(
    () => guardToolingChange(snapshot(), denied, policy),
    /Node 24/,
  );
});

test("each recorded cohort admits its own resolved tuple and rejects cross-family pairs", () => {
  for (const [repository, cohort] of Object.entries(policy.repositories)) {
    const s = snapshot(
      repository.endsWith("lapis-plugins") ? "2.31.1" : "3.0.3",
    );
    s.repository = repository;
    s.manifests[0].manifest.packageManager = "pnpm@" + cohort.pnpm;
    for (const [name, range] of Object.entries(cohort.tools)) {
      const version = semver.minVersion(range).version;
      s.manifests[0].manifest.devDependencies[name] = range;
      s.lock.importers["."].devDependencies[name] = { version };
    }
    assert.deepEqual(assessTooling(s, policy).findings, [], repository);
    if (s.manifests[0].manifest.devDependencies["@vitest/browser-playwright"]) {
      const changed = structuredClone(s);
      changed.lock.importers["."].devDependencies[
        "@vitest/browser-playwright"
      ].version = "99.0.0";
      assert.throws(
        () => guardToolingChange(s, changed, policy),
        /cohort drift/,
      );
    }
  }
});

test("missing locks and unconfigured repositories remain explicit coverage gaps", () => {
  const missing = snapshot();
  missing.lock = null;
  assert.equal(assessTooling(missing, policy).versioning.state, "unqualified");
  assert.equal(
    assessTooling({ ...snapshot(), repository: "lapismd/unconfigured" }, policy)
      .cohort,
    "unconfigured",
  );
});

test("tooling policy cannot introduce advisory exceptions or Deno contracts", () => {
  for (const mutate of [
    (p) => {
      p.auditExceptions = ["ignore-all"];
    },
    (p) => {
      p.versioning["3.0.3"].runtime = "deno";
    },
    (p) => {
      p.repositories["lapismd/design-core"].tools.vitest = "latest";
    },
  ]) {
    const bad = structuredClone(policy);
    mutate(bad);
    assert.throws(() => validateToolingPolicy(bad), /tooling policy/);
  }
});

test("generated version workflow is Node-only and validates the installed CLI before App minting", async () => {
  const workflow = YAML.parse(
    await readFile(
      new URL("../templates/version-packages.yml", import.meta.url),
      "utf8",
    ),
  );
  const steps = workflow.jobs.version.steps;
  assert(
    !steps.some(
      (s) => s.uses?.startsWith("denoland/") || /\bdeno\b/.test(s.run ?? ""),
    ),
  );
  const guard = steps.findIndex(
    (s) =>
      s.run === "node scripts/dependency-automation/versioning-contract.mjs",
  );
  assert(guard >= 0 && guard < steps.findIndex((s) => s.id === "app"));
  assert(steps.some((s) => /--frozen-lockfile/.test(s.run ?? "")));
});
