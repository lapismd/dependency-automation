import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import {
  inventory,
  loadAllowlist,
  loadPolicy,
  requestJson,
} from "../src/github.mjs";
import { observeRepository } from "../src/wave-evidence.mjs";
import { planWaves, recoverEmptyOperation } from "../src/waves.mjs";
import { readWaveState } from "../src/wave-state.mjs";
import { execFileSync } from "node:child_process";
import { validateNotification, validateCompletion } from "../src/policy.mjs";
import { assessTooling, loadToolingPolicy } from "../src/tooling.mjs";

const entries = await loadAllowlist();
let hint;
if (process.env.GITHUB_EVENT_NAME === "repository_dispatch") {
  const event = JSON.parse(
    await readFile(process.env.GITHUB_EVENT_PATH, "utf8"),
  );
  if (event.action === "lapis-npm-published-v1")
    hint = {
      action: event.action,
      ...validateNotification(event.client_payload, entries),
    };
  else if (event.action === "lapis-dependency-completed-v1")
    hint = {
      action: event.action,
      ...validateCompletion(event.client_payload, entries),
    };
  else throw Error("Unsupported notification event");
}
const waveMode = process.env.LAPIS_WAVES_ENABLED === "true";
const result = await inventory(entries, {
  publicOnly: true,
  waveEvidence: waveMode,
  toolingEvidence: true,
  excludedPackages: (await loadPolicy()).excludedPackages,
  token: process.env.GH_TOKEN,
  progress: (repository) => console.log(`Inspecting ${repository}`),
});
const toolingPolicy = await loadToolingPolicy();
for (const repo of result.repositories)
  repo.tooling = assessTooling(repo, toolingPolicy);
if (hint) {
  const { verifyHint } = await import("../src/wave-evidence.mjs");
  result.hint = await verifyHint(hint, entries, {
    token: process.env.GH_TOKEN,
  });
}
await mkdir("reports", { recursive: true });
await writeFile(
  "reports/inventory.json",
  JSON.stringify(result, null, 2) + "\n",
);
const phase = process.env.LAPIS_ROLLOUT_PHASE === "full" ? "full" : "pilot";
let waves;
if (waveMode) {
  const options = {
    token: process.env.GH_TOKEN,
    botLogin: process.env.LAPIS_BOT_LOGIN,
    botAuthor: process.env.LAPIS_BOT_GIT_AUTHOR,
  };
  for (const repo of result.repositories)
    repo.evidence = await observeRepository(repo, options);
  const previous = await readWaveState(options);
  if (process.env.LAPIS_WAVE_RECOVER_OPERATION) {
    if (process.env.GITHUB_EVENT_NAME !== "workflow_dispatch")
      throw Error("Recovery is manual-only");
    const operation =
      previous.state.operations[process.env.LAPIS_WAVE_RECOVER_OPERATION];
    if (!operation?.runId || !/^\d+$/.test(operation.runId))
      throw Error("Recovery originating run is unknown");
    const completedRun = await requestJson(
      `https://api.github.com/repos/lapismd/dependency-automation/actions/runs/${operation.runId}`,
      options,
    );
    previous.state = recoverEmptyOperation(previous.state, result, {
      operationId: process.env.LAPIS_WAVE_RECOVER_OPERATION,
      expectedRevision: process.env.LAPIS_WAVE_EXPECTED_STATE,
      revision: previous.revision,
      completedRun,
    });
  }
  waves = planWaves(result, previous.state, {
    ...options,
    phase,
    writes: process.env.LAPIS_WRITE_ENABLED === "true",
    runId: process.env.GITHUB_RUN_ID,
    policyRevision:
      process.env.GITHUB_SHA ??
      execFileSync("jj", ["log", "-r", "@", "--no-graph", "-T", "commit_id"], {
        encoding: "utf8",
      }).trim(),
  });
  await writeFile(
    "reports/wave-state-before.json",
    JSON.stringify(previous, null, 2) + "\n",
  );
  await writeFile(
    "reports/wave-state-candidate.json",
    JSON.stringify(
      { expectedRevision: previous.revision, state: waves.state },
      null,
      2,
    ) + "\n",
  );
  await writeFile(
    "reports/waves.json",
    JSON.stringify(waves.report, null, 2) + "\n",
  );
  // Include exact admitted candidates in the inventory consumed by config generation.
  result.waveAdmission = waves.report;
  await writeFile(
    "reports/inventory.json",
    JSON.stringify(result, null, 2) + "\n",
  );
}
const targets = result.repositories
  .filter(
    (r) =>
      (!waveMode || waves.admitted.includes(r.repository)) &&
      !r.nonPortable.length &&
      !r.missingChangesets &&
      !r.holdReason &&
      (phase === "full" || r.phase === "pilot"),
  )
  .map((r) => ({
    repository: r.repository,
    owner: r.repository.split("/")[0],
    name: r.repository.split("/")[1],
    pnpm: r.packageManager?.replace("pnpm@", "").split("+")[0] ?? "10.34.5",
  }));
if (targets.some((r) => !/^\d+\.\d+\.\d+$/.test(r.pnpm)))
  throw new Error("Consumers must pin an exact pnpm version");
if (process.env.GITHUB_OUTPUT)
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `matrix=${JSON.stringify({ include: targets })}\ncount=${targets.length}\n`,
  );
const blocked = result.repositories
  .filter((r) => r.nonPortable.length || r.missingChangesets || r.holdReason)
  .map(
    (r) =>
      `${r.repository}: ${[...r.nonPortable, ...(r.holdReason ? [r.holdReason] : []), ...(r.missingChangesets ? ["Changesets onboarding must land before dependency writes"] : [])].join(", ")}`,
  )
  .join("\n\n");
const summary = `# First-party npm inventory\n\n${result.repositories.length} repositories; ${result.packages.length} public package owners; ${result.edges.length} consumer edges.\n\nRollout: ${phase}. Writes: ${process.env.LAPIS_WRITE_ENABLED === "true" ? "enabled" : "disabled (dry-run)"}.\n\nRuntime cycles: ${result.cycles.length}. Unpublished references: ${result.unpublished.join(", ") || "none"}.\n\nConsumers waiting for portable registry dependencies:\n\n${blocked || "None"}\n\nCoverage holds: ${result.coverage?.length ?? 0}. Wave mode: ${waveMode ? "enabled" : "disabled"}.\n${waves ? waves.report.nodes.map((n) => `${n.repository}: ${n.status}; ${[...n.holds, ...n.waits.map((w) => w.reason)].join(", ")}`).join("\n") : ""}\n`;
await writeFile("reports/inventory.md", summary);
if (process.env.GITHUB_STEP_SUMMARY)
  await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
console.log(summary);
