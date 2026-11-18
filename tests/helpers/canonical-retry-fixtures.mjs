import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { gunzipSync } from "node:zlib";
import YAML from "yaml";
import {
  intakeFacts,
  intakeHash,
  intakePolicyPath,
  intakeSlot,
} from "../../src/canonical-intake.mjs";
import {
  workspaceIntakeFacts,
  workspaceIntakeSlot,
} from "../../src/canonical-workspace.mjs";
const fixture = (name) =>
  JSON.parse(
    gunzipSync(
      readFileSync(
        new URL("../fixtures/" + name + ".json.gz", import.meta.url),
      ),
    ),
  );
export function retryInput(schema = 1) {
  const f = fixture(
    schema === 1 ? "notebook-core-intake" : "notes-core0135-intake",
  );
  const chapters = ["spec/src/first.md", "spec/src/last.md"];
  const policy =
    schema === 1
      ? {
          schemaVersion: 1,
          kind: "single-development-dependency",
          repository: f.repository,
          dependency: "@lapismd/design-core",
          slot: "core-development",
          chapters,
        }
      : {
          schemaVersion: 2,
          kind: "workspace-dependency-intake",
          repository: f.repository,
          lockClosure: "registry-transitives",
          dependencies: ["@lapismd/design-core"],
          manifests: f.manifests,
          slot: "framework-registry",
          chapters,
        };
  const policyBytes = JSON.stringify(policy) + "\n";
  const slot =
    schema === 1
      ? intakeSlot(policy, intakeFacts(policy, policyBytes, f.before))
      : workspaceIntakeSlot(policy, workspaceIntakeFacts(policy, f.before));
  const baseChapters = Object.fromEntries(
    chapters.map((p) => [p, "# Source\n\n" + slot + "\n\nAuthored ending.\n"]),
  );
  return {
    repository: f.repository,
    sourceSha: f.sourceSha,
    headSha: f.sourceSha,
    policyBytes,
    currentPolicyBytes: policyBytes,
    before: structuredClone(f.before),
    after: structuredClone(f.after),
    baseChapters,
    currentChapters: { ...baseChapters },
    changedFiles: Object.keys(f.before).filter(
      (p) => f.before[p] !== f.after[p],
    ),
    branchName: "lapis-dependencies/retry-control",
    admittedUpdates:
      schema === 1
        ? undefined
        : ["api", "ui", "web", "workspace"].map((name) => ({
            repository: f.repository,
            path: `packages/${name}/package.json`,
            type: "dependencies",
            name: "@lapismd/design-core",
            current: "0.13.4",
            target: "0.13.5",
            targetRange: "^0.13.5",
            compatibility: "compatible",
            integrity: YAML.parse(f.after["pnpm-lock.yaml"]).packages[
              "@lapismd/design-core@0.13.5"
            ].resolution.integrity,
          })),
  };
}
export async function retryFilesystem(data, additional = {}) {
  const root = await mkdtemp(join(tmpdir(), "canonical-retry-"));
  const put = async (p, bytes) => {
    await mkdir(dirname(join(root, p)), { recursive: true });
    await writeFile(join(root, p), bytes);
  };
  const git = (args, input) =>
    execFileSync("git", ["-C", root, "-c", "commit.gpgsign=false", ...args], {
      cwd: root,
      input,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        PATH: process.env.PATH,
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_AUTHOR_NAME: "Retry fixture",
        GIT_AUTHOR_EMAIL: "fixture@example.invalid",
        GIT_COMMITTER_NAME: "Retry fixture",
        GIT_COMMITTER_EMAIL: "fixture@example.invalid",
      },
    }).trim();
  try {
    for (const [p, bytes] of Object.entries({
      ...data.before,
      ...data.baseChapters,
      [intakePolicyPath]: data.policyBytes,
      ".changeset/config.json": '{"baseBranch":"main"}\n',
      ...additional,
    }))
      await put(p, bytes);
    git(["init", "--quiet"]);
    async function tree(directory = "") {
      const rows = [];
      for (const e of (
        await readdir(join(root, directory), { withFileTypes: true })
      ).sort((a, b) => a.name.localeCompare(b.name))) {
        if (e.name === ".git") continue;
        const path = join(directory, e.name);
        rows.push(
          e.isDirectory()
            ? `040000 tree ${await tree(path)}\t${e.name}`
            : `100644 blob ${git(["hash-object", "-w", "--stdin"], await readFile(join(root, path)))}\t${e.name}`,
        );
      }
      return git(["mktree"], rows.join("\n") + "\n");
    }
    const sourceSha = git(
      ["commit-tree", await tree()],
      "Reviewed fixture source\n",
    );
    git(["update-ref", "HEAD", sourceSha]);
    git(["read-tree", sourceSha]);
    for (const [p, bytes] of Object.entries(data.after)) await put(p, bytes);
    return {
      root,
      put,
      read: (p) => readFile(join(root, p), "utf8"),
      remove: () => rm(root, { recursive: true, force: true }),
      args: {
        root,
        repository: data.repository,
        sourceSha,
        policySha256: intakeHash(data.policyBytes),
        admittedUpdates: data.admittedUpdates,
        branchName: data.branchName,
      },
    };
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}
