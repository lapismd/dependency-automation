import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import semver from "semver";
import { createHash } from "node:crypto";
import { loadToolingPolicy } from "../src/tooling.mjs";
import { assertNodeProject } from "../templates/versioning-contract.mjs";

const [directory] = process.argv.slice(2);
if (!directory) throw Error("Provide the consumer checkout directory");
const root = resolve(directory);
const file = join(root, "package.json");
const pkg = JSON.parse(await readFile(file, "utf8"));
if (pkg.private) throw Error("Onboarding targets only public package roots");
await assertNodeProject(root);
const recipe = "node scripts/dependency-automation/version.mjs";
if (
  pkg.scripts?.["release:version"] &&
  pkg.scripts["release:version"] !== recipe
)
  throw Error(
    "Preserve the source-owned version recipe through explicit integration",
  );
const policy = await loadToolingPolicy();
const declared = pkg.devDependencies?.["@changesets/cli"] ?? "3.0.3";
const version = semver.minVersion(declared)?.version;
const contract = policy.versioning[version];
if (!contract)
  throw Error(
    "Existing Changesets requires owning-source runtime qualification",
  );
const config = {
  $schema: "https://unpkg.com/@changesets/config@3.1.2/schema.json",
  changelog: "@changesets/cli/changelog",
  commit: false,
  fixed: [],
  linked: [],
  access: "public",
  baseBranch: "main",
  updateInternalDependencies: "patch",
  ignore: [],
};
try {
  const existing = JSON.parse(
    await readFile(join(root, ".changeset/config.json"), "utf8"),
  );
  if (JSON.stringify(existing) !== JSON.stringify(config))
    throw Error(
      "Preserve source-owned Changesets configuration through explicit integration",
    );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await mkdir(join(root, ".changeset"), { recursive: true });
await writeFile(
  join(root, ".changeset/config.json"),
  JSON.stringify(config, null, 2) + "\n",
);
pkg.devDependencies ??= {};
pkg.devDependencies["@changesets/cli"] = declared;
pkg.scripts ??= {};
pkg.scripts.changeset = "changeset";
pkg.scripts["release:version"] = recipe;
await writeFile(file, JSON.stringify(pkg, null, 2) + "\n");
await mkdir(join(root, "scripts/dependency-automation"), { recursive: true });
await writeFile(
  join(root, "scripts/dependency-automation/versioning.json"),
  JSON.stringify(
    {
      version,
      ...contract,
      projectConfigSha256: createHash("sha256")
        .update(JSON.stringify(config))
        .digest("hex"),
    },
    null,
    2,
  ) + "\n",
);
await writeFile(
  join(root, "scripts/dependency-automation/versioning-contract.mjs"),
  await readFile(
    new URL("../templates/versioning-contract.mjs", import.meta.url),
  ),
);
await writeFile(
  join(root, "scripts/dependency-automation/version.mjs"),
  await readFile(new URL("../templates/version.mjs", import.meta.url)),
);
await writeFile(
  join(root, ".github/workflows/version-packages.yml"),
  await readFile(new URL("../templates/version-packages.yml", import.meta.url)),
);
if (pkg.name === "@lapis-notes/lapis-plugin-notebook") {
  const modelPath = join(root, "scripts/validation/model.mjs");
  const model = await readFile(modelPath, "utf8");
  if (
    !model.includes(
      '"release:version": "node scripts/dependency-automation/version.mjs"',
    )
  )
    await writeFile(
      modelPath,
      model.replace(
        "  const native = {",
        '  const native = {\n    changeset: "changeset",\n    "release:version": "node scripts/dependency-automation/version.mjs",',
      ),
    );
}
console.log(
  `Changesets version-PR support prepared for ${pkg.name}; publication unchanged.`,
);
