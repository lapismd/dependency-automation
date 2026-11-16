import { execFileSync } from "node:child_process";
import { readFile, access } from "node:fs/promises";
import YAML from "yaml";
import { releaseIntent, writeChangeset } from "../src/changesets.mjs";
import { activeManifests } from "../src/policy.mjs";
import { intakePolicyPath } from "../src/canonical-intake.mjs";
import { guardToolingChange, loadToolingPolicy } from "../src/tooling.mjs";

const root = process.cwd();
if (!process.env.RENOVATE_POST_UPGRADE_COMMAND_DATA_FILE)
  throw Error(
    "Missing Renovate branch context for deterministic release intent",
  );
const context = JSON.parse(
  await readFile(process.env.RENOVATE_POST_UPGRADE_COMMAND_DATA_FILE, "utf8"),
);
if (typeof context.branchName !== "string" || !context.branchName)
  throw Error("Invalid Renovate branch context");
let hasCanonicalPolicy = false;
try {
  await access(intakePolicyPath);
  hasCanonicalPolicy = true;
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (hasCanonicalPolicy && !context.canonicalPolicySha256)
  throw Error("Canonical intake held: missing admitted source policy context");
// Renovate has already regenerated candidate artifacts. Prove that the exact
// candidate installs without rewriting its lockfile or executing package code.
execFileSync(
  "pnpm",
  ["install", "--frozen-lockfile", "--ignore-scripts", "--ignore-pnpmfile"],
  { cwd: root, stdio: "inherit", timeout: 20 * 60 * 1000 },
);
const git = (args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" });
const formattingInputs = ["deno.json", "deno.jsonc"];
const previousInputs = git([
  "ls-tree",
  "--name-only",
  "HEAD",
  "--",
  ...formattingInputs,
])
  .trim()
  .split("\n")
  .filter((path) => formattingInputs.includes(path));
const currentInputs = [];
for (const path of formattingInputs) {
  try {
    await access(path);
    currentInputs.push(path);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
const snapshot = (manifest, lock, toolingInputs) => ({
  repository: process.env.LAPIS_AUTOMATION_REPOSITORY,
  manifests: [{ path: "package.json", manifest }],
  lock,
  toolingInputs,
});
guardToolingChange(
  snapshot(
    JSON.parse(git(["show", "HEAD:package.json"])),
    YAML.parse(git(["show", "HEAD:pnpm-lock.yaml"])),
    previousInputs,
  ),
  snapshot(
    JSON.parse(await readFile("package.json", "utf8")),
    YAML.parse(await readFile("pnpm-lock.yaml", "utf8")),
    currentInputs,
  ),
  await loadToolingPolicy(),
);
const changedFiles = git(["diff", "--name-only", "HEAD", "--"])
  .trim()
  .split("\n")
  .filter(Boolean);
let changed = changedFiles.filter((p) => /(^|\/)package\.json$/.test(p));
let workspaceBefore = {},
  workspaceAfter = {};
if (changedFiles.includes("pnpm-workspace.yaml")) {
  workspaceBefore = YAML.parse(git(["show", "HEAD:pnpm-workspace.yaml"])) ?? {};
  workspaceAfter =
    YAML.parse(await readFile("pnpm-workspace.yaml", "utf8")) ?? {};
  // Catalog changes affect packed runtime/peer manifests even when their source
  // continues to say catalog:. Discover the active consumers, including peers.
  changed = activeManifests(
    git(["ls-files"]).trim().split("\n"),
    JSON.parse(await readFile("package.json", "utf8")),
    workspaceAfter,
  );
}
let config = {};
try {
  config = JSON.parse(await readFile(".changeset/config.json", "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const changes = [];
let publicManifestChanged = false;
for (const path of changed) {
  const before = JSON.parse(git(["show", `HEAD:${path}`]));
  const after = JSON.parse(await readFile(path, "utf8"));
  const intent = releaseIntent(before, after, {
    versionPrivate: config.privatePackages?.version === true,
    workspaceBefore,
    workspaceAfter,
  });
  if (!after.private && (changedFiles.includes(path) || intent))
    publicManifestChanged = true;
  changes.push(intent);
}
if (context.canonicalPolicySha256) {
  const { prepareCanonicalFiles } =
    await import("../src/canonical-intake-files.mjs");
  await prepareCanonicalFiles({
    root,
    repository: process.env.LAPIS_AUTOMATION_REPOSITORY,
    sourceSha: context.sourceSha,
    policySha256: context.canonicalPolicySha256,
  });
}
const empty =
  process.env.LAPIS_EMPTY_CHANGESET === "1" && publicManifestChanged;
await writeChangeset(root, changes, { empty, scope: context.branchName });
