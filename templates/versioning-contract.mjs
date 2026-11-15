import { readFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";

export async function assertNodeProject(root = process.cwd()) {
  for (let directory = resolve(root); ; directory = dirname(directory)) {
    for (const name of ["deno.json", "deno.jsonc"]) {
      try {
        await access(resolve(directory, name));
      } catch (error) {
        if (error.code === "ENOENT") continue;
        throw error;
      }
      throw Error(
        "Deno formatter input requires source-owned project qualification",
      );
    }
    if (dirname(directory) === directory) break;
  }
}

export async function assertVersioningRuntime(root = process.cwd()) {
  await assertNodeProject(root);
  const contract = JSON.parse(
    await readFile(
      resolve(root, "scripts/dependency-automation/versioning.json"),
      "utf8",
    ),
  );
  if (
    Number(process.versions.node.split(".")[0]) !== 24 ||
    contract.runtime !== "node" ||
    contract.bin !== "bin.js"
  )
    throw Error("Version preparation requires the reviewed Node 24 contract");
  const config = JSON.parse(
    await readFile(resolve(root, ".changeset/config.json"), "utf8"),
  );
  if (
    createHash("sha256").update(JSON.stringify(config)).digest("hex") !==
    contract.projectConfigSha256
  )
    throw Error(
      "Changesets configuration requires source-owned project qualification",
    );
  const folder = resolve(root, "node_modules/@changesets/cli");
  const pkg = JSON.parse(
    await readFile(resolve(folder, "package.json"), "utf8"),
  );
  const bin = await readFile(resolve(folder, contract.bin), "utf8");
  if (
    pkg.name !== "@changesets/cli" ||
    pkg.version !== contract.version ||
    pkg.bin?.changeset !== contract.bin ||
    (pkg.engines?.node ?? null) !== contract.engines ||
    !bin.startsWith("#!/usr/bin/env node\n") ||
    createHash("sha256").update(bin).digest("hex") !== contract.binSha256 ||
    ["preinstall", "install", "postinstall"].some((key) => pkg.scripts?.[key])
  )
    throw Error(
      "Installed Changesets does not match the reviewed Node executable",
    );
  return pkg.version;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  console.log(`Qualified Node Changesets ${await assertVersioningRuntime()}`);
