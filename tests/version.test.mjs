import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  chmod,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadToolingPolicy } from "../src/tooling.mjs";
import { createHash } from "node:crypto";

test("Notebook version preparation synchronizes package, runtime and archive identity without publishing", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "lapis-version-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "bin"));
  await mkdir(join(root, "src/lib"), { recursive: true });
  await mkdir(join(root, "scripts/dependency-automation"), { recursive: true });
  await mkdir(join(root, "node_modules/@changesets/cli"), { recursive: true });
  const policy = await loadToolingPolicy();
  await mkdir(join(root, ".changeset"));
  await writeFile(join(root, ".changeset/config.json"), "{}");
  await writeFile(
    join(root, "scripts/dependency-automation/versioning.json"),
    JSON.stringify({
      version: "3.0.3",
      ...policy.versioning["3.0.3"],
      projectConfigSha256: createHash("sha256").update("{}").digest("hex"),
    }),
  );
  await writeFile(
    join(root, "node_modules/@changesets/cli/package.json"),
    JSON.stringify({
      name: "@changesets/cli",
      version: "3.0.3",
      bin: { changeset: "bin.js" },
      engines: { node: "^22.11 || ^24 || >=26" },
    }),
  );
  await writeFile(
    join(root, "node_modules/@changesets/cli/bin.js"),
    '#!/usr/bin/env node\n\nif (globalThis.process?.getBuiltinModule) {\n  const { enableCompileCache } =\n    globalThis.process.getBuiltinModule("node:module");\n  enableCompileCache();\n}\n\nawait import("@changesets/cli");\n',
  );
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      name: "@lapis-notes/lapis-plugin-notebook",
      version: "0.2.0",
    }),
  );
  await writeFile(
    join(root, "manifest.json"),
    JSON.stringify({ id: "lapis-notebook", version: "0.2.0" }),
  );
  await writeFile(
    join(root, "src/lib/notebook-plugin.ts"),
    'const MANIFEST: PluginManifest = {\n id: "lapis-notebook",\n version: "0.1.0",\n};\n',
  );
  const stub = join(root, "bin/pnpm");
  await writeFile(
    stub,
    `#!${process.execPath}\nconst fs=require('node:fs'); const args=process.argv.slice(2); fs.appendFileSync('calls.jsonl',JSON.stringify(args)+'\\n'); if(args[0]==='exec'){const p=JSON.parse(fs.readFileSync('package.json'));p.version='0.2.1';fs.writeFileSync('package.json',JSON.stringify(p));}\n`,
  );
  await chmod(stub, 0o755);
  execFileSync(
    process.execPath,
    [fileURLToPath(new URL("../templates/version.mjs", import.meta.url))],
    {
      cwd: root,
      env: { ...process.env, PATH: join(root, "bin") + ":" + process.env.PATH },
    },
  );
  assert.equal(
    JSON.parse(await readFile(join(root, "manifest.json"), "utf8")).version,
    "0.2.1",
  );
  assert.match(
    await readFile(join(root, "src/lib/notebook-plugin.ts"), "utf8"),
    /version: "0.2.1"/,
  );
  assert.deepEqual(
    (await readFile(join(root, "calls.jsonl"), "utf8"))
      .trim()
      .split("\n")
      .map(JSON.parse),
    [
      ["exec", "changeset", "version"],
      ["install", "--lockfile-only", "--ignore-scripts", "--ignore-pnpmfile"],
    ],
  );
});
