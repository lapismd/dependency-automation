import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import YAML from "yaml";
import { releaseIntent, writeChangeset } from "../src/changesets.mjs";
import { activeManifests } from "../src/policy.mjs";

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
// Renovate has already regenerated candidate artifacts. Prove that the exact
// candidate installs without rewriting its lockfile or executing package code.
execFileSync(
  "pnpm",
  ["install", "--frozen-lockfile", "--ignore-scripts", "--ignore-pnpmfile"],
  { cwd: root, stdio: "inherit", timeout: 20 * 60 * 1000 },
);
const git = (args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" });
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
const empty =
  process.env.LAPIS_EMPTY_CHANGESET === "1" && publicManifestChanged;
await writeChangeset(root, changes, { empty, scope: context.branchName });
