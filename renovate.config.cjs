const fs = require("node:fs");
const path = require("node:path");
const graph = JSON.parse(fs.readFileSync(process.env.LAPIS_INVENTORY, "utf8"));
const repo = graph.repositories.find(
  (r) => r.repository === process.env.LAPIS_TARGET_REPOSITORY,
);
if (!repo) throw new Error("Renovate target is not in the validated inventory");
// Repository rules are generated and validated before Renovate starts. Local
// renovate.json files cannot override the centrally restricted write policy.
const generated = JSON.parse(
  fs.readFileSync(process.env.LAPIS_RENOVATE_CONFIG, "utf8"),
);
const root = __dirname;
module.exports = {
  platform: "github",
  repositories: [generated],
  ...(process.env.LAPIS_BOT_GIT_AUTHOR
    ? { gitAuthor: process.env.LAPIS_BOT_GIT_AUTHOR }
    : {}),
  binarySource: "global",
  allowScripts: false,
  allowedCommands: [
    "^node " +
      (
        "'" +
        path.join(root, "scripts/prepare-pr.mjs").replaceAll("'", "'\\''") +
        "'"
      ).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
      "$",
  ],
  allowedEnv: [],
  exposeAllEnv: false,
  customEnvVariables: {
    LAPIS_AUTOMATION_REPOSITORY: repo.repository,
    LAPIS_EMPTY_CHANGESET: repo.emptyChangeset ? "1" : "0",
  },
  cacheDir: path.join(root, ".renovate/cache"),
  baseDir: path.join(root, ".renovate/work"),
  repositoryCache: "disabled",
  dryRun: process.env.LAPIS_WRITE_ENABLED === "true" ? null : "full",
};
