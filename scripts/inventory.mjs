import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { inventory, loadAllowlist, loadPolicy } from "../src/github.mjs";
import { validateNotification } from "../src/policy.mjs";

const entries = await loadAllowlist();
if (process.env.GITHUB_EVENT_NAME === "repository_dispatch") {
  const event = JSON.parse(
    await readFile(process.env.GITHUB_EVENT_PATH, "utf8"),
  );
  if (event.action !== "lapis-npm-published-v1")
    throw new Error("Unsupported notification event");
  validateNotification(event.client_payload, entries);
}
const result = await inventory(entries, {
  excludedPackages: (await loadPolicy()).excludedPackages,
  token: process.env.GH_TOKEN,
  progress: (repository) => console.log(`Inspecting ${repository}`),
});
await mkdir("reports", { recursive: true });
await writeFile(
  "reports/inventory.json",
  JSON.stringify(result, null, 2) + "\n",
);
const phase = process.env.LAPIS_ROLLOUT_PHASE === "full" ? "full" : "pilot";
const targets = result.repositories
  .filter(
    (r) =>
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
const summary = `# First-party npm inventory\n\n${result.repositories.length} repositories; ${result.packages.length} public package owners; ${result.edges.length} consumer edges.\n\nRollout: ${phase}. Writes: ${process.env.LAPIS_WRITE_ENABLED === "true" ? "enabled" : "disabled (dry-run)"}.\n\nRuntime cycles: ${result.cycles.length}. Unpublished references: ${result.unpublished.join(", ") || "none"}.\n\nConsumers waiting for portable registry dependencies:\n\n${blocked || "None"}\n`;
await writeFile("reports/inventory.md", summary);
if (process.env.GITHUB_STEP_SUMMARY)
  await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
console.log(summary);
