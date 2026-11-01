import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const [directory] = process.argv.slice(2);
if (!directory) throw Error("Provide the consumer checkout directory");
const root = resolve(directory);
const file = join(root, "package.json");
const pkg = JSON.parse(await readFile(file, "utf8"));
if (pkg.private) throw Error("Onboarding targets only public package roots");
await mkdir(join(root, ".changeset"), { recursive: true });
await writeFile(
  join(root, ".changeset/config.json"),
  JSON.stringify(
    {
      $schema: "https://unpkg.com/@changesets/config@3.1.2/schema.json",
      changelog: "@changesets/cli/changelog",
      commit: false,
      fixed: [],
      linked: [],
      access: "public",
      baseBranch: "main",
      updateInternalDependencies: "patch",
      ignore: [],
    },
    null,
    2,
  ) + "\n",
);
pkg.devDependencies ??= {};
pkg.devDependencies["@changesets/cli"] = "3.0.3";
pkg.scripts.changeset = "changeset";
pkg.scripts["release:version"] =
  "node scripts/dependency-automation/version.mjs";
await writeFile(file, JSON.stringify(pkg, null, 2) + "\n");
await mkdir(join(root, "scripts/dependency-automation"), { recursive: true });
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
