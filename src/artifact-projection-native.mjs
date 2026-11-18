import { execFileSync } from "node:child_process";
import {
  lstat,
  realpath,
  readFile,
  writeFile,
  mkdtemp,
  rm,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { homedir, tmpdir } from "node:os";
import YAML from "yaml";
import semver from "semver";
import {
  projectionDependency,
  projectionHash,
  projectionState,
  seedProjection,
} from "./artifact-projection.mjs";

// Official pnpm10.34.5 npm distribution, checked against its published SHA512.
export const nativePnpmSha256 =
  "ca969fbb32c08be8395c744c64e131c2ba2c93067e1b483171dbc6ed439e1143";
export async function nativeProjectionArtifacts({
  before,
  target,
  targetRange,
  sourceRoot,
}) {
  if (
    process.versions.node !== "24.15.0" ||
    process.platform !== "linux" ||
    process.arch !== "x64" ||
    !semver.valid(target) ||
    !semver.satisfies(target, targetRange)
  )
    throw Error(
      "SDK artifact projection held: unsupported native runtime or target",
    );
  const tool = resolve(
    process.env.COREPACK_HOME ?? join(homedir(), ".cache/node/corepack"),
    "v1/pnpm/10.34.5/dist/pnpm.cjs",
  );
  if (
    (sourceRoot && tool.startsWith(resolve(sourceRoot) + "/")) ||
    (await realpath(tool)) !== tool ||
    !(await lstat(tool)).isFile() ||
    (await lstat(tool)).size > 16 * 1024 * 1024 ||
    projectionHash(await readFile(tool)) !== nativePnpmSha256
  )
    throw Error("SDK artifact projection held: unqualified pnpm executable");
  const root = await mkdtemp(join(tmpdir(), "lapis-sdk-artifacts-"));
  try {
    const seed = seedProjection(before),
      s = projectionState(before);
    const workspace = YAML.parse(seed["pnpm-workspace.yaml"]) ?? {};
    if (workspace.overrides?.[projectionDependency]) {
      workspace.overrides[projectionDependency] = target;
      seed["pnpm-workspace.yaml"] = YAML.stringify(workspace);
    }
    for (const [path, bytes] of Object.entries(seed))
      await writeFile(join(root, path), bytes, { mode: 0o600 });
    const userconfig = join(root, "public-npmrc"),
      globalconfig = join(root, "empty-global-npmrc");
    await writeFile(
      userconfig,
      "registry=https://registry.npmjs.org/\nignore-scripts=true\nignore-pnpmfile=true\n",
      { mode: 0o600 },
    );
    await writeFile(globalconfig, "", { mode: 0o600 });
    const env = {
      PATH: dirname(process.execPath) + ":/usr/bin:/bin",
      TMPDIR: tmpdir(),
      CI: "true",
      NPM_CONFIG_USERCONFIG: userconfig,
      NPM_CONFIG_GLOBALCONFIG: globalconfig,
      NPM_CONFIG_REGISTRY: "https://registry.npmjs.org/",
    };
    const common = [
      "--ignore-scripts",
      "--ignore-pnpmfile",
      "--config.manage-package-manager-versions=false",
      "--registry=https://registry.npmjs.org/",
      "--config.fetch-retries=0",
      "--config.fetch-timeout=30000",
      `--store-dir=${join(root, "public-store")}`,
      "--reporter=append-only",
    ];
    const run = (args) =>
      execFileSync(process.execPath, [tool, ...args, ...common], {
        cwd: root,
        env,
        encoding: "utf8",
        timeout: 120000,
        maxBuffer: 1024 * 1024,
      });
    if (
      execFileSync(process.execPath, [tool, "--version"], {
        cwd: root,
        env,
        encoding: "utf8",
        timeout: 10000,
      }).trim() !== "10.34.5"
    )
      throw Error("SDK artifact projection held: pnpm version drift");
    const update = [
      "update",
      `${projectionDependency}@${targetRange}`,
      "--dev",
      "--lockfile-only",
    ];
    run(update);
    const lock = await readFile(join(root, "pnpm-lock.yaml"), "utf8");
    const install = ["install", "--frozen-lockfile"];
    run(install);
    if ((await readFile(join(root, "pnpm-lock.yaml"), "utf8")) !== lock)
      throw Error(
        "SDK artifact projection held: frozen verification changed the lock",
      );
    return {
      files: {
        "pnpm-lock.yaml": lock,
        "package.json": await readFile(join(root, "package.json"), "utf8"),
        "pnpm-workspace.yaml": await readFile(
          join(root, "pnpm-workspace.yaml"),
          "utf8",
        ),
      },
      proof: {
        node: process.versions.node,
        pnpm: "10.34.5",
        pnpmSha256: nativePnpmSha256,
        sourceVersion: s.version,
        seedClosure: s.keys,
        sourceLockSha256: projectionHash(before["pnpm-lock.yaml"]),
        commands: [update, install].map((args) => [
          process.execPath,
          tool,
          ...args,
          ...common,
        ]),
        scriptsAndPnpmfileDisabled: true,
        fullRootProductionQualified: false,
      },
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
