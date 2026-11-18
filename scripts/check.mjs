import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import YAML from "yaml";
import { loadAllowlist } from "../src/github.mjs";
import { loadToolingPolicy } from "../src/tooling.mjs";
import { validateAdvisoryPolicy } from "../src/advisories.mjs";
import {
  validateOperationsPolicy,
  exclusionCoverage,
} from "../src/operational-drift.mjs";
const entries = await loadAllowlist();
const { projectionCapabilities } =
  await import("../src/artifact-projection-policy.mjs");
projectionCapabilities();
const { loadChannelPolicy } = await import("../src/channels.mjs");
loadChannelPolicy();
const { loadCompletionPolicy } = await import("../src/completion.mjs");
await loadCompletionPolicy(entries);
const { loadPublicationPolicy } = await import("../src/publications.mjs");
await loadPublicationPolicy(entries);
await loadToolingPolicy();
validateAdvisoryPolicy(
  JSON.parse(await readFile("config/advisories.json", "utf8")),
);
const operations = validateOperationsPolicy(
  JSON.parse(await readFile("config/operations.json", "utf8")),
);
if (
  exclusionCoverage(
    JSON.parse(await readFile("config/repositories.json", "utf8")),
    operations,
  ).state !== "source-retained"
)
  throw Error("Runtime exclusions drifted");
const versionTemplate = YAML.parse(
  await readFile("templates/version-packages.yml", "utf8"),
);
const versionSteps = versionTemplate.jobs.version.steps;
for (const step of versionSteps) {
  if (!step.uses) continue;
  const [name, pin] = step.uses.split("@");
  if (operations.actionPins[name] && !operations.actionPins[name].includes(pin))
    throw Error("Upstream version template pin drifted from reviewed contract");
}
if (
  versionSteps.some((step) => step.uses?.startsWith("denoland/")) ||
  !versionSteps.some(
    (step) =>
      step.run === "node scripts/dependency-automation/versioning-contract.mjs",
  )
)
  throw Error(
    "Version template must retain the reviewed Node-only runtime guard",
  );
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
