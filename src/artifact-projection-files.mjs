import { execFileSync } from "node:child_process";
import { readFile, writeFile, realpath, lstat } from "node:fs/promises";
import { resolve } from "node:path";
import {
  projectionPath,
  projectionInputs,
  projectionHash,
  projectionRepository,
  projectionDependency,
  projectionState,
  parseProjectionDescriptor,
  mergeProjection,
} from "./artifact-projection.mjs";
import { projectionCapabilities } from "./artifact-projection-policy.mjs";
import { nativeProjectionArtifacts } from "./artifact-projection-native.mjs";

export async function prepareProjectedArtifacts({
  root,
  repository,
  sourceSha,
  context,
}) {
  const capabilities = projectionCapabilities();
  if (
    repository !== projectionRepository ||
    capabilities.sha256 !== context?.capabilitySha256 ||
    capabilities.policy.repositories[repository] !== context?.descriptorSha256
  )
    throw Error("Artifact projection held: no exact operator capability");
  const git = (args) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 3 * 1024 * 1024,
    });
  if (
    !/^[a-f0-9]{40}$/.test(sourceSha ?? "") ||
    git(["rev-parse", "HEAD"]).trim() !== sourceSha
  )
    throw Error("Artifact projection held: stale immutable source");
  const base = (path) => {
    const entry = git(["ls-tree", sourceSha, "--", path]).trim();
    if (!entry.startsWith("100644 blob ") || entry.split("\t")[1] !== path)
      throw Error("Artifact projection held: unsafe immutable file");
    return git(["show", `${sourceSha}:${path}`]);
  };
  const current = async (path) => {
    const file = resolve(root, path);
    if (
      (await realpath(file)) !== file ||
      !(await lstat(file)).isFile() ||
      (await lstat(file)).size > 2 * 1024 * 1024
    )
      throw Error("Artifact projection held: unsafe current file");
    return readFile(file, "utf8");
  };
  const bytes = base(projectionPath);
  if (
    Buffer.byteLength(bytes) > 8192 ||
    projectionHash(bytes) !== context.descriptorSha256 ||
    (await current(projectionPath)) !== bytes
  )
    throw Error("Artifact projection held: source descriptor changed");
  const before = Object.fromEntries(
    projectionInputs.map((path) => [path, base(path)]),
  );
  const descriptor = parseProjectionDescriptor(bytes, before);
  const allowed = ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml"];
  const changed = [
    ...git(["diff", "--name-only", "HEAD", "--"]).trim().split("\n"),
    ...git(["ls-files", "--others", "--exclude-standard", "-z"]).split("\0"),
  ].filter(Boolean);
  if (changed.some((p) => !allowed.includes(p)))
    throw Error("Artifact projection held: unrelated candidate files");
  const actual = Object.fromEntries(
    await Promise.all(projectionInputs.map(async (p) => [p, await current(p)])),
  );
  if (projectionInputs.slice(3).some((p) => actual[p] !== before[p]))
    throw Error("Artifact projection held: private source inventory changed");
  const u = context.update;
  if (
    !u ||
    u.current !== projectionState(before).version ||
    u.name !== projectionDependency ||
    u.path !== "package.json" ||
    u.type !== "devDependencies" ||
    u.repository !== repository ||
    u.compatibility !== "compatible" ||
    u.releaseIntent !== null ||
    u.updateType !== "patch" ||
    u.targetRange !== u.target
  )
    throw Error("Artifact projection held: unsupported admitted update");
  const native = await nativeProjectionArtifacts({
    before,
    target: u.target,
    targetRange: u.targetRange,
    sourceRoot: root,
  });
  const result = mergeProjection({
    before,
    candidateManifest: actual["package.json"],
    projected: native.files,
    target: u.target,
    targetRange: u.targetRange,
    integrity: u.integrity,
    descriptor,
  });
  for (const p of projectionInputs)
    if ((await current(p)) !== actual[p])
      throw Error("Artifact projection held: input changed during generation");
  for (const p of allowed.slice(1))
    if (actual[p] !== before[p] && actual[p] !== result.outputs[p])
      throw Error("Artifact projection held: manual artifact change");
  if (
    projectionCapabilities().sha256 !== capabilities.sha256 ||
    (await current(projectionPath)) !== bytes ||
    git(["rev-parse", "HEAD"]).trim() !== sourceSha
  )
    throw Error("Artifact projection held: late binding drift");
  if (
    [
      ...git(["diff", "--name-only", "HEAD", "--"]).trim().split("\n"),
      ...git(["ls-files", "--others", "--exclude-standard", "-z"]).split("\0"),
    ]
      .filter(Boolean)
      .some((p) => !allowed.includes(p))
  )
    throw Error("Artifact projection held: late unrelated source change");
  for (const p of allowed.slice(1))
    if (actual[p] !== result.outputs[p])
      await writeFile(resolve(root, p), result.outputs[p]);
  return { changed: result.changed, proof: native.proof };
}
