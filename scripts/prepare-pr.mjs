import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { releaseIntent, writeChangeset } from "../src/changesets.mjs";

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
const changed = git(["diff", "--name-only", "HEAD", "--"])
  .trim()
  .split("\n")
  .filter((p) => /(^|\/)package\.json$/.test(p));
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
  if (!after.private) publicManifestChanged = true;
  changes.push(
    releaseIntent(before, after, {
      versionPrivate: config.privatePackages?.version === true,
    }),
  );
}
const empty =
  process.env.LAPIS_EMPTY_CHANGESET === "1" && publicManifestChanged;
await writeChangeset(root, changes, { empty, scope: context.branchName });
