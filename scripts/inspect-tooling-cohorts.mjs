import { mkdir, writeFile } from "node:fs/promises";
import { discoverRepository, loadPolicy, requestJson } from "../src/github.mjs";
import { monitoringRepositories } from "../src/maintenance-policy.mjs";
import { loadToolingPolicy, toolingVersions } from "../src/tooling.mjs";
import {
  validateCohortEvidence,
  sourceCiEvidence,
} from "../src/tooling-evidence.mjs";

// Public GET-only review candidates. Never update policy, branches or activation.
const policy = await loadPolicy(),
  tooling = await loadToolingPolicy();
const monitored = new Set(monitoringRepositories(policy));
const candidates = [],
  coverage = [];
for (const entry of policy.repositories.filter(
  (entry) =>
    monitored.has(entry.repository) &&
    !entry.holdReason &&
    !tooling.repositories[entry.repository],
)) {
  try {
    const options = {
      publicOnly: true,
      toolingEvidence: true,
      token: process.env.GH_TOKEN,
    };
    const snapshot = await discoverRepository(entry, options);
    if (
      !snapshot ||
      snapshot.coverageOnly ||
      snapshot.visibility !== "public" ||
      snapshot.nonPortable.length ||
      !snapshot.lock
    )
      throw Error("Unavailable eligible source");
    const manifest = snapshot.manifests.find(
      (p) => p.path === "package.json",
    ).manifest;
    const pnpm = /^pnpm@(\d+\.\d+\.\d+)(?:\+.*)?$/.exec(
      manifest.packageManager ?? "",
    )?.[1];
    if (!pnpm) throw Error("Unpinned package manager");
    const observed = toolingVersions(snapshot);
    const runs = await requestJson(
      `https://api.github.com/repos/${entry.repository}/actions/runs?event=push&status=success&branch=${encodeURIComponent(snapshot.defaultBranch)}&per_page=100`,
      options,
    );
    if (!Array.isArray(runs.workflow_runs)) throw Error("Unavailable CI reads");
    // A bounded latest-successful default-branch source-pipeline observation,
    // not a complete workflow/security audit or a portable versioning proof.
    const cohort = {
      sourceSha: snapshot.sourceSha,
      pnpm,
      tools: Object.fromEntries(
        Object.entries(observed).map(([name, value]) => [name, value.declared]),
      ),
      evidence: {
        observedAt: new Date().toISOString(),
        manifestSha256: snapshot.toolingManifestSha256,
        lockSha256: snapshot.toolingLockSha256,
        resolved: Object.fromEntries(
          Object.entries(observed).map(([name, value]) => [
            name,
            value.version,
          ]),
        ),
        sourceCi: sourceCiEvidence(
          snapshot.sourceSha,
          runs.workflow_runs,
          snapshot.defaultBranch,
        ),
        recipe: {
          qualification: "unqualified",
          command: manifest.scripts?.["release:version"] ?? null,
          runtimeInputs: snapshot.toolingInputs,
        },
      },
    };
    validateCohortEvidence(cohort.evidence, cohort);
    candidates.push({ repository: entry.repository, cohort });
    console.log(
      `${entry.repository}: recorded source observation; CI ${cohort.evidence.sourceCi.state}; recipe unqualified`,
    );
  } catch {
    coverage.push({
      repository: entry.repository,
      state: "unavailable",
      reason:
        "Public source, cohort resolution or source CI evidence unavailable",
    });
    process.exitCode = 1;
  }
}
await mkdir("reports", { recursive: true });
await writeFile(
  "reports/tooling-cohort-candidates.json",
  JSON.stringify(
    {
      schemaVersion: 1,
      scope:
        "Latest observed successful default-branch push pipeline among first100runs, standard check/CI/test/validate/verify filenames only; no whole-recipe qualification",
      candidates,
      coverage,
    },
    null,
    2,
  ) + "\n",
);
