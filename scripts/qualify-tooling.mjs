import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  symlink,
  realpath,
} from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { loadToolingPolicy, toolingVersions } from "../src/tooling.mjs";
import YAML from "yaml";

// Explicit, local qualification only. No publisher or credential API is called.
const version = process.argv[2] ?? "3.0.3";
const policy = await loadToolingPolicy();
if (!policy.versioning[version]) throw Error("Choose a reviewed CLI version");
const base = resolve(fileURLToPath(new URL("../", import.meta.url)));
await mkdir(join(base, ".local"), { recursive: true });
const root = await mkdtemp(join(base, ".local/tooling-"));
const bin = join(root, "bin");
await mkdir(bin);
await mkdir(join(root, ".github/workflows"), { recursive: true });
const find = (name) =>
  execFileSync("which", [name], { encoding: "utf8" }).trim();
for (const [name, file] of [
  ["node", process.execPath],
  ["pnpm", find("pnpm")],
  ["git", find("git")],
  ["sh", find("sh")],
  ["sed", find("sed")],
  ["dirname", find("dirname")],
  ["uname", find("uname")],
])
  await symlink(await realpath(file), join(bin, name));
const env = { ...process.env, PATH: bin };
assert.equal(spawnSync("deno", ["--version"], { env }).error?.code, "ENOENT");
const run = (command, args, options = {}) =>
  execFileSync(command, args, {
    cwd: root,
    env,
    stdio: "pipe",
    encoding: "utf8",
    timeout: 180000,
    ...options,
  });
await writeFile(
  join(root, "package.json"),
  JSON.stringify(
    {
      name: "tooling-acceptance",
      version: "1.2.3",
      license: "MIT",
      packageManager: "pnpm@10.34.5",
      scripts: {},
      devDependencies: { "@changesets/cli": version, prettier: "3.7.4" },
    },
    null,
    2,
  ) + "\n",
);
await writeFile(join(root, ".prettierrc.json"), "{}\n");
run(process.execPath, [join(base, "scripts/onboard-changesets.mjs"), root]);
run("pnpm", [
  "install",
  "--lockfile-only",
  "--ignore-scripts",
  "--ignore-pnpmfile",
  "--registry=https://registry.npmjs.org",
]);
run("pnpm", [
  "install",
  "--frozen-lockfile",
  "--ignore-scripts",
  "--ignore-pnpmfile",
]);
const audit = JSON.parse(run("pnpm", ["audit", "--json"]));
assert.equal(Object.keys(audit.advisories ?? {}).length, 0);
const installed = toolingVersions({
  manifests: [
    {
      path: "package.json",
      manifest: JSON.parse(await readFile(join(root, "package.json"), "utf8")),
    },
  ],
  lock: YAML.parse(await readFile(join(root, "pnpm-lock.yaml"), "utf8")),
})["@changesets/cli"];
assert.equal(installed.integrity, policy.versioning[version].integrity);
const jj = find("jj");
run(jj, ["git", "init", "--colocate"], { env: process.env });
run(
  jj,
  [
    "--config",
    "signing.behavior=drop",
    "commit",
    "-m",
    "Prepare isolated tooling fixture",
  ],
  { env: process.env },
);
run(jj, ["bookmark", "create", "main", "-r", "@-"], { env: process.env });
await writeFile(
  join(root, ".changeset/runtime-proof.md"),
  '---\n"tooling-acceptance": patch\n---\n\nProve Node-only generated version preparation.\n',
);
run(
  jj,
  [
    "--config",
    "signing.behavior=drop",
    "commit",
    "-m",
    "Record isolated fixture release intent",
  ],
  { env: process.env },
);
run("pnpm", ["exec", "changeset", "status", "--output", "status.json"]);
const status = JSON.parse(await readFile(join(root, "status.json"), "utf8"));
assert.equal(status.releases[0].newVersion, "1.2.4");
run("pnpm", ["release:version"]);
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
assert.equal(pkg.version, "1.2.4");
assert.equal(pkg.devDependencies["@changesets/cli"], version);
assert.match(await readFile(join(root, "CHANGELOG.md"), "utf8"), /1\.2\.4/);
assert.equal(spawnSync("deno", ["--version"], { env }).error?.code, "ENOENT");
let formatterContext = "prettier-only";
let upstreamDenoDetection = false;
let formatterVersion = null;
if (version.startsWith("3.")) {
  const cli = createRequire(
    await realpath(join(root, "node_modules/@changesets/cli/package.json")),
  );
  const plan = createRequire(cli.resolve("@changesets/apply-release-plan"));
  const entry = pathToFileURL(plan.resolve("@changesets/format"));
  formatterVersion = JSON.parse(
    await readFile(new URL("../package.json", entry), "utf8"),
  ).version;
  assert.equal(formatterVersion, "0.1.3");
  const formatter = await import(entry.href);
  assert.equal(await formatter.detect({ cwd: root }), "prettier");
  await writeFile(join(root, "deno.json"), "{}\n");
  assert.equal(await formatter.detect({ cwd: root }), "deno");
  assert.throws(
    () =>
      run(process.execPath, [
        "scripts/dependency-automation/versioning-contract.mjs",
      ]),
    /Deno formatter input/,
  );
  await writeFile(
    join(root, ".changeset/formatter-proof.md"),
    '---\n"tooling-acceptance": patch\n---\n\nNegative formatter context proof.\n',
  );
  let failure = "";
  try {
    run("pnpm", ["exec", "changeset", "version"]);
  } catch (error) {
    failure = String(error.stdout) + String(error.stderr);
  }
  assert.match(failure, /deno.*ENOENT|ENOENT.*deno/s);
  upstreamDenoDetection = true;
  formatterContext = "prettier-positive/deno-config-held";
}
const receipt = {
  version,
  node: process.versions.node,
  denoOnPath: false,
  integrity: policy.versioning[version].integrity,
  statusVersion: status.releases[0].newVersion,
  preparedVersion: pkg.version,
  auditFindings: Object.keys(audit.advisories ?? {}).length,
  published: false,
  formatterContext,
  upstreamDenoDetection,
  formatterVersion,
};
await mkdir(join(base, "reports"), { recursive: true });
await writeFile(
  join(base, `reports/tooling-qualification-${version}.json`),
  JSON.stringify(receipt, null, 2) + "\n",
);
console.log(JSON.stringify(receipt));
