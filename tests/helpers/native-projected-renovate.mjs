import { mock } from "node:test";
import { readFile, realpath, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
const [inputFile, outputFile] = process.argv.slice(2),
  input = JSON.parse(await readFile(inputFile, "utf8"));
const dist = await realpath(
  new URL("../../node_modules/renovate/dist", import.meta.url),
);
const url = (p) => pathToFileURL(resolve(dist, p)).href;
const gitUrl = url("util/git/index.js"),
  execUrl = url("util/git/exec.js");
const git = await import(gitUrl),
  execution = await import(execUrl);
mock.module(gitUrl, {
  namedExports: {
    ...git,
    getFile: async (p) => input.before[p] ?? null,
    isFileModeEnabled: async () => false,
    getRepoStatus: async () => ({
      modified: Object.keys(input.before).filter((p) =>
        input.collect.includes(p),
      ),
      not_added: [],
      deleted: [],
      renamed: [],
    }),
  },
});
mock.module(execUrl, {
  namedExports: {
    ...execution,
    withGitEnvironment: () => async (command, options) => ({
      stdout: execSync(command, {
        cwd: options.cwd,
        env: {
          ...process.env,
          ...options.env,
          LAPIS_TEST_PROJECTION_PORT: inputFile,
        },
        encoding: "utf8",
      }),
      stderr: "",
    }),
  },
});
const preload = fileURLToPath(
  new URL("./projection-source-port.mjs", import.meta.url),
);
const tasks = {
  ...input.config.postUpgradeTasks,
  commands: input.config.postUpgradeTasks.commands.map((c) =>
    c.replace(
      /^node /,
      `node --experimental-test-module-mocks --import '${preload}' `,
    ),
  ),
};
const { GlobalConfig } = await import(url("config/global.js"));
GlobalConfig.set({
  localDir: input.root,
  cacheDir: input.cacheDir,
  platform: "github",
  allowedCommands: tasks.commands.map(
    (c) => "^" + c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$",
  ),
  allowShellExecutorForPostUpgradeCommands: true,
});
const regex = input.config.customManagers[0];
const { extractPackageFile } = await import(
  url("modules/manager/custom/regex/index.js")
);
const extracted = extractPackageFile(
  input.before["package.json"],
  "package.json",
  regex,
);
if (extracted?.deps?.length !== 1)
  throw Error("Unexpected native regex extraction");
const upgrade = {
  ...regex,
  ...extracted,
  ...extracted.deps[0],
  manager: "regex",
  packageFile: "package.json",
  depIndex: 0,
  currentVersion: "0.2.0",
  newVersion: "0.2.1",
  newValue: "0.2.1",
  autoReplaceGlobalMatch: false,
  postUpgradeTasks: tasks,
};
const { getUpdatedPackageFiles } = await import(
  url("workers/repository/update/branch/get-updated.js")
);
const native = await getUpdatedPackageFiles({
  ...input.config,
  branchName: "lapis-dependencies/lapis-first-party",
  baseBranch: "main",
  reuseExistingBranch: false,
  upgrades: [upgrade],
  packageFiles: { regex: [{ packageFile: "package.json", ...extracted }] },
});
if (native.artifactErrors.length || native.updatedArtifacts.length)
  throw Error("Regex manager attempted native root artifacts");
const { postUpgradeCommandsExecutor } = await import(
  url("workers/repository/update/branch/execute-post-upgrade-commands.js")
);
const config = {
  ...input.config,
  ...native,
  branchName: "lapis-dependencies/lapis-first-party",
  baseBranch: "main",
  postUpgradeTasks: tasks,
};
const result = await postUpgradeCommandsExecutor([upgrade], config);
if (result.artifactErrors.length)
  throw Error(JSON.stringify(result.artifactErrors));
const { platformScmImpls, setPlatformScmApi } = await import(
  url("modules/platform/scm.js")
);
let finalFiles;
platformScmImpls.set(
  "fixture",
  class {
    async commitAndPush({ files }) {
      finalFiles = Object.fromEntries(
        files
          .filter((f) => f.type === "addition")
          .map((f) => [
            f.path,
            typeof f.contents === "string"
              ? f.contents
              : Buffer.from(f.contents).toString("utf8"),
          ]),
      );
      return "fixture";
    }
  },
);
setPlatformScmApi("fixture");
const { commitFilesToBranch } = await import(
  url("workers/repository/update/branch/commit.js")
);
await commitFilesToBranch({
  ...config,
  updatedArtifacts: result.updatedArtifacts,
  commitMessage: "Controlled real SDK artifact proof",
});
await writeFile(
  outputFile,
  JSON.stringify(
    {
      extracted,
      nativeArtifactCount: native.updatedArtifacts.length,
      artifacts: result.updatedArtifacts.map((f) => f.path),
      finalFiles,
    },
    null,
    2,
  ),
);
