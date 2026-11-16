import { mkdir, writeFile } from "node:fs/promises";
import { discoverRepository, loadPolicy, requestJson } from "../src/github.mjs";
import { loadToolingPolicy } from "../src/tooling.mjs";
import {
  selectCohortEntries,
  collectToolingCohort,
} from "../src/tooling-collect.mjs";

// Public GET-only review candidates. Never update policy, branches or activation.
const policy = await loadPolicy(),
  tooling = await loadToolingPolicy();
const candidates = [],
  coverage = [];
for (const entry of selectCohortEntries(
  policy,
  tooling,
  process.argv.slice(2),
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
    const result = await collectToolingCohort(
      snapshot,
      tooling.repositories[entry.repository],
      (url) => requestJson(url, options),
    );
    const { cohort } = result;
    candidates.push({ repository: entry.repository, ...result });
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
        "GET-only missing or explicit existing cohort refresh; reviewed paths require successful source/run/attempt-bound jobs; legacy run-only evidence and unqualified recipes remain explicit",
      candidates,
      coverage,
    },
    null,
    2,
  ) + "\n",
);
