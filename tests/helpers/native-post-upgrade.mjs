// Exercise Renovate's real artifact collector and commit boundary in an isolated
// process. Only Git status, command transport and remote SCM writes are ports.
import { mock } from "node:test";
import { readFile, realpath, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const [inputFile, outputFile] = process.argv.slice(2);
const input = JSON.parse(await readFile(inputFile, "utf8"));
const dist = await realpath(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../node_modules/renovate/dist",
  ),
);
const moduleUrl = (path) => pathToFileURL(resolve(dist, path)).href;
const gitUrl = moduleUrl("util/git/index.js"),
  execUrl = moduleUrl("util/git/exec.js");
const git = await import(gitUrl),
  execution = await import(execUrl);
mock.module(gitUrl, {
  namedExports: {
    ...git,
    getRepoStatus: async () => ({
      modified: input.modified,
      not_added: [],
      deleted: [],
      renamed: [],
    }),
    isFileModeEnabled: async () => false,
  },
});
mock.module(execUrl, {
  namedExports: {
    ...execution,
    withGitEnvironment: () => async (command, options) => ({
      stdout: execSync(command, {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        encoding: "utf8",
      }),
      stderr: "",
    }),
  },
});

const { GlobalConfig } = await import(moduleUrl("config/global.js"));
GlobalConfig.set({
  localDir: input.root,
  cacheDir: input.cacheDir,
  platform: "github",
  allowedCommands: input.tasks.commands.map(
    (command) => "^" + command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$",
  ),
  allowShellExecutorForPostUpgradeCommands: true,
});
const { postUpgradeCommandsExecutor } = await import(
  moduleUrl("workers/repository/update/branch/execute-post-upgrade-commands.js")
);
const config = { ...input.config, postUpgradeTasks: input.tasks };
const result = await postUpgradeCommandsExecutor(
  [
    {
      depName: "@lapismd/design-core",
      packageFile: "package.json",
      postUpgradeTasks: input.tasks,
    },
  ],
  config,
);
if (result.artifactErrors.length)
  throw Error(JSON.stringify(result.artifactErrors));
const { platformScmImpls, setPlatformScmApi } = await import(
  moduleUrl("modules/platform/scm.js")
);
let finalFiles;
platformScmImpls.set(
  "fixture",
  class {
    async commitAndPush({ files }) {
      // The real Git SCM writes the supplied list in order; retain that ordering,
      // including a post-upgrade artifact replacing native package-file bytes.
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
  moduleUrl("workers/repository/update/branch/commit.js")
);
await commitFilesToBranch({
  ...config,
  updatedArtifacts: result.updatedArtifacts,
  commitMessage: "Qualified dependency fixture",
});
await writeFile(
  outputFile,
  JSON.stringify({
    artifacts: result.updatedArtifacts.map((f) => f.path),
    finalFiles,
  }),
);
