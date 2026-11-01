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

test("Notebook version preparation synchronizes package, runtime and archive identity without publishing", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "lapis-version-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "bin"));
  await mkdir(join(root, "src/lib"), { recursive: true });
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
