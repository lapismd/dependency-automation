import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import YAML from "yaml";
import { loadAllowlist } from "../src/github.mjs";
await loadAllowlist();
for (const dir of ["src", "scripts", "templates", "tests"]) {
  for (const file of await readdir(dir))
    if (file.endsWith(".mjs"))
      execFileSync(process.execPath, ["--check", join(dir, file)], {
        stdio: "inherit",
      });
}
for (const file of await readdir(".github/workflows")) {
  const doc = YAML.parse(
    await readFile(join(".github/workflows", file), "utf8"),
  );
  if (!doc.jobs) throw Error(`Missing jobs in ${file}`);
  for (const job of Object.values(doc.jobs))
    for (const step of job.steps ?? []) {
      if (step.uses && !/@[a-f0-9]{40}$/.test(step.uses))
        throw Error(`Unpinned action: ${step.uses}`);
    }
}
console.log(
  "Repository allowlist, JavaScript syntax and workflow pins passed.",
);
