import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  activeManifests,
  availableVersions,
  runtimeCycles,
  validateNotification,
} from "../src/policy.mjs";
import {
  changesetPath,
  releaseIntent,
  writeChangeset,
} from "../src/changesets.mjs";
import { repositoryConfig } from "../src/renovate.mjs";
import {
  botSpecificationExemption,
  skipSpecification,
  specificationDockerArguments,
  runFunctionalCheckLanes,
} from "../templates/spec-policy.mjs";

const pkg = (name, deps = {}, extra = {}) => ({
  name,
  dependencies: deps,
  ...extra,
});
test("inventory selects active workspaces and excludes parked packages and fixtures", () => {
  const paths = [
    "package.json",
    "packages/api/package.json",
    "packages/parked/package.json",
    "fixtures/x/package.json",
    "packages/api/dist/package.json",
    "packages/desktop-deno/package.json",
    "packages/server-deno/package.json",
  ];
  assert.deepEqual(
    activeManifests(
      paths,
      {},
      { packages: ["packages/*", "!packages/parked"] },
    ),
    ["package.json", "packages/api/package.json"],
  );
});
test("runtime SCCs detect cross-repository cycles and retain acyclic packages", () => {
  const p = (name, deps) => ({ name, manifest: pkg(name, deps) });
  assert.deepEqual(
    runtimeCycles([
      p("@lapismd/a", { "@lapismd/b": "^1" }),
      p("@lapismd/b", { "@lapismd/a": "workspace:*" }),
      p("@lapismd/c", {}),
    ]),
    [["@lapismd/a", "@lapismd/b"]],
  );
});
test("partial publication and missing peer prerequisites cannot become update candidates", () => {
  const registry = new Map([
    [
      "@lapismd/mira",
      {
        "dist-tags": { latest: "0.1.5" },
        versions: {
          "0.1.4": {},
          "0.1.5": { dependencies: { "@lapismd/helper": "^0.2.0" } },
          "0.2.0-rc.1": {},
        },
      },
    ],
    [
      "@lapismd/helper",
      { "dist-tags": { latest: "0.1.0" }, versions: { "0.1.0": {} } },
    ],
  ]);
  assert.deepEqual(availableVersions(registry)["@lapismd/mira"], ["0.1.4"]);
  registry.set("@lapismd/helper", {
    "dist-tags": { latest: "0.2.0" },
    versions: { "0.1.0": {}, "0.2.0": {} },
  });
  assert.deepEqual(availableVersions(registry)["@lapismd/mira"], [
    "0.1.4",
    "0.1.5",
  ]);
});
test("notification validates source and stable versions without trusting arbitrary repositories", () => {
  const payload = {
    repository: "lapismd/mira-mde",
    sourceSha: "a".repeat(40),
    packages: [{ name: "@lapismd/mira", version: "0.1.5" }],
  };
  assert.deepEqual(
    validateNotification(payload, [{ repository: payload.repository }]),
    payload,
  );
  assert.throws(() => validateNotification(payload, []), /allowlisted/);
  assert.throws(
    () =>
      validateNotification(
        {
          ...payload,
          packages: [{ name: "@lapismd/mira", version: "0.2.0-rc.1" }],
        },
        [{ repository: payload.repository }],
      ),
    /stable/,
  );
});
test("Changesets include only runtime or peer manifest changes and configured private versions", () => {
  const before = pkg("@lapis-notes/markdown", { "@lapismd/mira": "~0.1.4" });
  assert.equal(
    releaseIntent(before, pkg(before.name, { "@lapismd/mira": "~0.1.5" })),
    before.name,
  );
  assert.equal(
    releaseIntent(before, {
      ...before,
      devDependencies: { "@lapismd/spec-validator": "^0.2.1" },
    }),
    null,
  );
  assert.equal(
    releaseIntent(before, {
      ...before,
      private: true,
      dependencies: { "@lapismd/mira": "~0.1.5" },
    }),
    null,
  );
  assert.equal(
    releaseIntent(
      before,
      { ...before, private: true, dependencies: { "@lapismd/mira": "~0.1.5" } },
      { versionPrivate: true },
    ),
    before.name,
  );
});
test("repeated compatible updates rewrite one deterministic Changeset", async () => {
  const root = await mkdtemp(join(tmpdir(), "lapis-changeset-"));
  await mkdir(join(root, ".changeset"));
  await writeFile(
    join(root, ".changeset/config.json"),
    JSON.stringify({ baseBranch: "main" }),
  );
  const first = await writeChangeset(root, [
    "@lapismd/a",
    "@lapismd/a",
    "@lapismd/b",
  ]);
  assert.equal(await writeChangeset(root, ["@lapismd/b", "@lapismd/a"]), first);
  assert.equal(
    (await readFile(join(root, changesetPath()), "utf8")).match(
      /"@lapismd\/a": patch/g,
    ).length,
    1,
  );
  await writeChangeset(root, [], { empty: true, scope: "development-only" });
  assert.match(
    await readFile(join(root, changesetPath("development-only")), "utf8"),
    /^---\n---/,
  );
  await writeChangeset(root, ["@lapismd/c"]);
  const accumulated = await readFile(join(root, changesetPath()), "utf8");
  assert.match(accumulated, /"@lapismd\/a": patch/);
  assert.match(accumulated, /"@lapismd\/c": patch/);
  await writeChangeset(root, []);
  assert.equal(
    await readFile(join(root, changesetPath()), "utf8"),
    accumulated,
  );
  await writeChangeset(root, ["@lapismd/d"], { scope: "breaking-upstream" });
  assert.notEqual(changesetPath(), changesetPath("breaking-upstream"));
});
test("catalog runtime and peer updates create release intent without releasing development consumers", () => {
  const options = {
    workspaceBefore: {
      catalog: { "@lapismd/mira": "~0.1.4" },
      catalogs: { ui: { "@lapismd/design-core": "^0.9.0" } },
    },
    workspaceAfter: {
      catalog: { "@lapismd/mira": "~0.1.5" },
      catalogs: { ui: { "@lapismd/design-core": "^0.10.0" } },
    },
  };
  for (const section of [
    "dependencies",
    "peerDependencies",
    "devDependencies",
  ]) {
    const manifest = {
      name: "@lapismd/consumer",
      [section]: {
        "@lapismd/mira": "catalog:",
        "@lapismd/design-core": "catalog:ui",
      },
    };
    assert.equal(
      releaseIntent(manifest, manifest, options),
      section === "devDependencies" ? null : manifest.name,
    );
    assert.equal(
      releaseIntent(
        { ...manifest, private: true },
        { ...manifest, private: true },
        options,
      ),
      null,
    );
  }
});
test("bot exemption uses PR authors, preserves human reruns and never skips functional lanes", () => {
  const env = {
    CI: "true",
    LAPIS_CI_EVENT: "pull_request",
    LAPIS_CI_PR_AUTHOR: "lapismd-dependency-bot[bot]",
    LAPIS_CI_PR_AUTHOR_TYPE: "Bot",
    GITHUB_ACTOR: "human-rerunning",
  };
  assert.equal(botSpecificationExemption(env), true);
  assert.equal(skipSpecification("check", env), false);
  assert.equal(skipSpecification("spec:first", env), true);
  assert.equal(
    botSpecificationExemption({ ...env, LAPIS_CI_EVENT: "push" }),
    false,
  );
  assert.equal(
    botSpecificationExemption({ ...env, LAPIS_CI_PR_AUTHOR_TYPE: "User" }),
    false,
  );
  assert.equal(
    botSpecificationExemption({
      ...env,
      LAPIS_CI_PR_AUTHOR: "unrelated-bot[bot]",
    }),
    false,
  );
  assert.equal(botSpecificationExemption({ ...env, CI: "false" }), false);
});
test("config groups compatible updates and makes major and 0.x minor updates draft", () => {
  const repo = {
    repository: "lapismd/lapis-notes",
    paths: ["package.json", "packages/api/package.json"],
    manifests: [
      {
        path: "packages/api/package.json",
        manifest: { name: "@lapis-notes/api" },
      },
    ],
  };
  const graph = {
    packages: [{ repository: "lapismd/mira-mde", name: "@lapismd/mira" }],
    available: { "@lapismd/mira": ["0.1.4", "0.1.5"] },
    unpublished: [],
    cycles: [],
    excludedPackages: ["@lapismd/terminal-host"],
  };
  const config = repositoryConfig(repo, graph, "/automation");
  assert.equal(config.automerge, false);
  assert.deepEqual(config.enabledManagers, ["npm"]);
  assert.ok(
    config.packageRules.some((r) => r.groupSlug === "lapis-first-party"),
  );
  assert.ok(
    config.packageRules.some(
      (r) =>
        r.matchCurrentVersion === "<1.0.0" &&
        r.draftPR &&
        r.matchUpdateTypes.includes("minor"),
    ),
  );
  assert.ok(
    config.packageRules.some(
      (r) => r.matchUpdateTypes?.includes("major") && r.draftPR,
    ),
  );
  assert.ok(
    config.packageRules.some(
      (r) =>
        r.matchDepTypes?.includes("peerDependencies") &&
        r.rangeStrategy === "widen",
    ),
  );
  assert.equal(config.ignoreScripts, true);
  assert.ok(config.ignoreDeps.includes("@lapismd/terminal-host"));
  assert.equal(config.vulnerabilityAlerts.enabled, false);
});
test("Docker workers inherit only explicit public PR context", () => {
  const env = {
    CI: "true",
    LAPIS_CI_PR_AUTHOR: "dependabot[bot]",
    GH_TOKEN: "never-forward",
    APP_PRIVATE_KEY: "never-forward",
  };
  const args = specificationDockerArguments(
    ["create", "--name", "worker", "image", "/input/worker.mjs"],
    env,
  );
  assert.ok(args.includes("LAPIS_CI_PR_AUTHOR=dependabot[bot]"));
  assert.ok(!args.join(" ").includes("never-forward"));
  assert.deepEqual(
    specificationDockerArguments(["create", "image", "other.mjs"], env),
    ["create", "image", "other.mjs"],
  );
});
test("bot spec-check exemptions retain configured functional lanes and their failures", async () => {
  const commands = [];
  const loadConfig = async () => ({
    check: {
      build: true,
      first: true,
      lanes: [
        {
          name: "architecture",
          command: "node",
          args: ["scripts/check-architecture.mjs"],
        },
        { name: "tests", command: "pnpm", args: ["test"] },
      ],
    },
  });
  assert.equal(
    await runFunctionalCheckLanes({
      loadConfig,
      run: (command, args) => {
        commands.push([command, ...args]);
        return { status: 0 };
      },
    }),
    0,
  );
  assert.deepEqual(commands, [
    ["node", "scripts/check-architecture.mjs"],
    ["pnpm", "test"],
  ]);
  assert.equal(
    await runFunctionalCheckLanes({ loadConfig, run: () => ({ status: 7 }) }),
    7,
  );
});
