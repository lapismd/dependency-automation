import { execFileSync } from "node:child_process";
import { lstat, readFile, writeFile, realpath } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import {
  intakePolicyPath,
  intakeInputs,
  intakeHash,
  validateIntakePolicy,
  prepareCanonicalIntake,
} from "./canonical-intake.mjs";
import { workspaceIntakeInputs } from "./canonical-workspace-policy.mjs";
import { prepareWorkspaceIntake } from "./canonical-workspace.mjs";
import { changesetPath } from "./changesets.mjs";

export async function prepareCanonicalFiles({
  root,
  repository,
  sourceSha,
  policySha256,
  admittedUpdates,
  branchName,
}) {
  const git = (args) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 3 * 1024 * 1024,
    });
  const base = (path) => {
    const entry = git(["ls-tree", sourceSha, "--", path]).trim();
    if (!entry.startsWith("100644 blob ") || entry.split("\t")[1] !== path)
      throw Error(
        "Canonical intake held: source file is missing or not regular",
      );
    return git(["show", `${sourceSha}:${path}`]);
  };
  const current = async (path, maximum = 2 * 1024 * 1024) => {
    const target = resolve(root, path);
    if (
      (await realpath(target)) !== target ||
      !(await lstat(target)).isFile() ||
      (await lstat(target)).size > maximum
    )
      throw Error("Canonical intake held: unsafe current file");
    return maximum === 8192
      ? new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
          await readFile(target),
        )
      : readFile(target, "utf8");
  };
  const headSha = git(["rev-parse", "HEAD"]).trim();
  if (!/^[a-f0-9]{40}$/.test(sourceSha ?? "") || headSha !== sourceSha)
    throw Error("Canonical intake held: stale admitted source");
  const policyBytes = base(intakePolicyPath);
  if (intakeHash(policyBytes) !== policySha256)
    throw Error("Canonical intake held: immutable policy digest mismatch");
  const policy = validateIntakePolicy(JSON.parse(policyBytes), repository);
  const before = {},
    after = {},
    baseChapters = {},
    currentChapters = {};
  const inputs =
    policy.schemaVersion === 2 ? workspaceIntakeInputs(policy) : intakeInputs;
  for (const path of inputs) {
    before[path] = base(path);
    after[path] = await current(path);
  }
  for (const path of policy.chapters) {
    baseChapters[path] = base(path);
    currentChapters[path] = await current(path);
  }
  const changedFiles = [
    ...git(["diff", "--name-only", "HEAD", "--"]).trim().split("\n"),
    ...git(["ls-files", "--others", "--exclude-standard", "-z"]).split("\0"),
  ].filter(Boolean);
  // Inspect only the caller-bound optional note; all other changed paths remain
  // scope failures. The note is never a canonical output or writer authority.
  if (policy.schemaVersion === 1 && typeof branchName === "string") {
    const note = changesetPath(branchName);
    if (changedFiles.includes(note)) after[note] = await current(note, 8192);
  }
  const prepare =
    policy.schemaVersion === 2
      ? prepareWorkspaceIntake
      : prepareCanonicalIntake;
  const result = prepare({
    repository,
    sourceSha,
    headSha,
    policyBytes,
    currentPolicyBytes: await current(intakePolicyPath),
    before,
    after,
    baseChapters,
    currentChapters,
    admittedUpdates,
    branchName,
    changedFiles,
  });
  const outputs = { ...result.outputs };
  const workspacePath = "pnpm-workspace.yaml";
  // pnpm's native updater trims final blank lines. Restore only the immutable
  // source's newline ending after all semantic/scope checks, preserving exact
  // recipe-input bindings without relaxing the consumer's independent guard.
  if (
    typeof before[workspacePath] === "string" &&
    typeof after[workspacePath] === "string"
  ) {
    const ending = (bytes) => bytes.match(/(?:\r?\n)*$/)[0];
    const original = ending(before[workspacePath]),
      candidate = ending(after[workspacePath]);
    if (original !== candidate)
      outputs[workspacePath] =
        after[workspacePath].slice(
          0,
          after[workspacePath].length - candidate.length,
        ) + original;
  }
  // Every byte/path/ownership check completes before touching any output.
  for (const path of Object.keys(outputs)) {
    if (
      (await realpath(dirname(resolve(root, path)))) !==
      dirname(resolve(root, path))
    )
      throw Error("Canonical intake held: unsafe output parent");
  }
  for (const [path, bytes] of Object.entries(outputs)) {
    if ((currentChapters[path] ?? after[path]) !== bytes)
      await writeFile(resolve(root, path), bytes);
  }
  return result;
}
