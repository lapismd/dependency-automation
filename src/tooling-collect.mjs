import { monitoringRepositories } from "./maintenance-policy.mjs";
import { toolingVersions } from "./tooling.mjs";
import {
  sourceCiEvidence,
  validateCohortEvidence,
} from "./tooling-evidence.mjs";
import {
  manifestPackageManager,
  workflowPackageManager,
} from "./tooling-provenance.mjs";
export function selectCohortEntries(policy, tooling, args) {
  const monitored = new Set(monitoringRepositories(policy));
  const eligible = policy.repositories.filter(
    (entry) => monitored.has(entry.repository) && !entry.holdReason,
  );
  if (!args.length)
    return eligible.filter((entry) => !tooling.repositories[entry.repository]);
  if (
    args[0] !== "--refresh" ||
    new Set(args.slice(1)).size !== args.length - 1
  )
    throw Error("Expected --refresh [eligible repository ...]");
  if (args.length === 1)
    return eligible.filter((entry) => tooling.repositories[entry.repository]);
  return args.slice(1).map((name) => {
    const entry = eligible.find((entry) => entry.repository === name);
    if (!entry || !tooling.repositories[name])
      throw Error("Refresh source is not an existing eligible cohort");
    return entry;
  });
}
export async function collectToolingCohort(snapshot, recorded, read) {
  const manifest = snapshot.manifests.find(
    (p) => p.path === "package.json",
  ).manifest;
  const prefix = `https://api.github.com/repos/${snapshot.repository}`;
  let packageManager = manifestPackageManager(
    manifest,
    snapshot.toolingManifestSha256,
  );
  if (!packageManager) {
    const reference = recorded?.evidence?.packageManager;
    if (!reference || manifest.packageManager)
      throw Error("Unavailable source-owned package manager");
    const source = await read(
      `${prefix}/contents/${reference.path}?ref=${snapshot.sourceSha}`,
    );
    packageManager = workflowPackageManager(
      Buffer.from(source.content, "base64").toString("utf8"),
      reference,
    );
  }
  if (recorded && packageManager.version !== recorded.pnpm)
    throw Error("Observed package-manager cohort drift");
  const observed = toolingVersions(snapshot);
  const tools =
    recorded?.tools ??
    Object.fromEntries(
      Object.entries(observed).map(([name, v]) => [name, v.declared]),
    );
  const runs = await read(
    `${prefix}/actions/runs?event=push&branch=${encodeURIComponent(snapshot.defaultBranch)}&per_page=100`,
  );
  if (!Array.isArray(runs.workflow_runs))
    throw Error("Unavailable source CI reads");
  const jobsByRun = {},
    observations = [];
  if (recorded?.ci !== undefined) {
    for (const run of runs.workflow_runs
      .filter(
        (r) =>
          r.event === "push" &&
          r.head_branch === snapshot.defaultBranch &&
          Object.hasOwn(recorded.ci, r.path),
      )
      .slice(0, 10)) {
      try {
        if (
          !/^\d+$/.test(String(run.id)) ||
          !Number.isSafeInteger(run.run_attempt) ||
          run.run_attempt < 1
        )
          continue;
        const payload = await read(
          `${prefix}/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`,
        );
        jobsByRun[run.id] = payload;
        observations.push({
          runId: String(run.id),
          sourceSha: run.head_sha,
          workflow: run.path,
          status: run.status,
          conclusion: run.conclusion,
          requiredJobs: (payload.jobs ?? [])
            .filter((j) => recorded.ci[run.path].includes(j.name))
            .map((j) => ({
              name: j.name,
              status: j.status,
              conclusion: j.conclusion,
            })),
        });
      } catch {
        observations.push({ runId: String(run.id), state: "unavailable-jobs" });
      }
      if (
        sourceCiEvidence(snapshot.sourceSha, [run], snapshot.defaultBranch, {
          policy: recorded.ci,
          jobsByRun,
        }).state !== "unavailable"
      )
        break;
    }
  }
  const cohort = {
    sourceSha: snapshot.sourceSha,
    pnpm: recorded?.pnpm ?? packageManager.version,
    tools,
    ...(recorded?.ci !== undefined ? { ci: recorded.ci } : {}),
    evidence: {
      observedAt: new Date().toISOString(),
      manifestSha256: snapshot.toolingManifestSha256,
      lockSha256: snapshot.toolingLockSha256,
      resolved: Object.fromEntries(
        Object.keys(tools).map((name) => [
          name,
          observed[name]?.version ?? null,
        ]),
      ),
      sourceCi: sourceCiEvidence(
        snapshot.sourceSha,
        runs.workflow_runs,
        snapshot.defaultBranch,
        recorded?.ci !== undefined ? { policy: recorded.ci, jobsByRun } : {},
      ),
      recipe: {
        qualification: "unqualified",
        command: manifest.scripts?.["release:version"] ?? null,
        runtimeInputs: snapshot.toolingInputs,
      },
      packageManager,
    },
  };
  validateCohortEvidence(cohort.evidence, cohort);
  return {
    cohort,
    observations,
    declaredRangeDifferences: Object.entries(tools)
      .filter(([name, range]) => observed[name]?.declared !== range)
      .map(([name, range]) => ({
        tool: name,
        supported: range,
        observed: observed[name]?.declared ?? null,
      })),
  };
}
