const keys = (value, allowed) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).every((key) => allowed.includes(key));
const sha = (value) => /^[a-f0-9]{40}$/.test(value ?? "");
const date = (value) =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
const id = (value) => /^[1-9]\d*$/.test(String(value ?? ""));
export function validateSourceCiPolicy(policy) {
  if (
    !policy ||
    typeof policy !== "object" ||
    Array.isArray(policy) ||
    Object.keys(policy).length > 8
  )
    throw Error("Invalid source CI workflow policy");
  for (const [path, names] of Object.entries(policy)) {
    if (
      !/^\.github\/workflows\/[\w.-]+\.ya?ml$/.test(path) ||
      !Array.isArray(names) ||
      !names.length ||
      names.length > 32 ||
      new Set(names).size !== names.length ||
      names.some(
        (name) =>
          typeof name !== "string" || !/^[^\x00-\x1f]{1,200}$/.test(name),
      )
    )
      throw Error("Invalid source CI required jobs");
  }
  return policy;
}
function requiredJobs(run, policy, payload) {
  const names = policy[run.path];
  if (
    !names ||
    !payload ||
    !Array.isArray(payload.jobs) ||
    payload.total_count !== payload.jobs.length ||
    payload.jobs.length > 100 ||
    !Number.isSafeInteger(run.run_attempt) ||
    run.run_attempt < 1
  )
    return null;
  const selected = [];
  for (const name of names) {
    const matches = payload.jobs.filter((job) => job.name === name);
    if (matches.length !== 1) return null;
    const job = matches[0];
    if (
      !id(job.id) ||
      String(job.run_id) !== String(run.id) ||
      job.run_attempt !== run.run_attempt ||
      job.head_sha !== run.head_sha ||
      job.status !== "completed" ||
      job.conclusion !== "success"
    )
      return null;
    selected.push({ id: String(job.id), name, conclusion: "success" });
  }
  return new Set(selected.map((job) => job.id)).size === selected.length
    ? selected
    : null;
}
export function sourceCiEvidence(sourceSha, runs, branch, options = {}) {
  if (!Array.isArray(runs)) throw Error("Unavailable source CI evidence");
  if (options.policy !== undefined) validateSourceCiPolicy(options.policy);
  const candidates = runs
    .filter(
      (run) =>
        run.event === "push" &&
        run.head_branch === branch &&
        run.status === "completed" &&
        run.conclusion === "success" &&
        sha(run.head_sha) &&
        id(run.id) &&
        date(run.created_at) &&
        date(run.updated_at) &&
        (options.policy !== undefined
          ? Object.hasOwn(options.policy, run.path)
          : /^\.github\/workflows\/(?:check|checks|ci|test|tests|validate|verify)(?:[-.][\w.-]+)?\.ya?ml$/.test(
              run.path,
            )),
    )
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  for (const run of candidates) {
    const jobs =
      options.policy !== undefined
        ? requiredJobs(run, options.policy, options.jobsByRun?.[run.id])
        : null;
    if (options.policy !== undefined && !jobs) continue;
    return {
      state: run.head_sha === sourceSha ? "same-source" : "prior-source",
      runId: String(run.id),
      sourceSha: run.head_sha,
      workflow: run.path,
      completedAt: run.updated_at,
      ...(jobs ? { runAttempt: run.run_attempt, jobs } : {}),
    };
  }
  return { state: "unavailable" };
}
export function validateSourceCiReceipt(ci, policy) {
  if (policy !== undefined) validateSourceCiPolicy(policy);
  const required = policy?.[ci.workflow];
  const hasReceipt = ci.jobs !== undefined || ci.runAttempt !== undefined;
  if (policy !== undefined && !required)
    throw Error("Unreviewed source CI evidence path");
  if (!hasReceipt && policy === undefined) return;
  if (hasReceipt && policy === undefined)
    throw Error("Required-job receipt needs reviewed source CI policy");
  if (
    !Number.isSafeInteger(ci.runAttempt) ||
    ci.runAttempt < 1 ||
    !Array.isArray(ci.jobs) ||
    !ci.jobs.length ||
    ci.jobs.length > 32 ||
    ci.jobs.some(
      (job) =>
        !keys(job, ["id", "name", "conclusion"]) ||
        !id(job.id) ||
        typeof job.name !== "string" ||
        job.conclusion !== "success",
    ) ||
    new Set(ci.jobs.map((job) => job.name)).size !== ci.jobs.length ||
    new Set(ci.jobs.map((job) => job.id)).size !== ci.jobs.length ||
    (required &&
      (required.length !== ci.jobs.length ||
        required.some((name) => !ci.jobs.some((job) => job.name === name))))
  )
    throw Error("Invalid source CI required-job receipt");
}
