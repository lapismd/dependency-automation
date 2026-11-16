import semver from "semver";
const keys = (value, allowed) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).every((key) => allowed.includes(key));
const sha = (value) => /^[a-f0-9]{40}$/.test(value ?? "");
const digest = (value) => /^[a-f0-9]{64}$/.test(value ?? "");
const date = (value) =>
  typeof value === "string" && Number.isFinite(Date.parse(value));

export function sourceCiEvidence(sourceSha, runs, branch) {
  if (!Array.isArray(runs)) throw Error("Unavailable source CI evidence");
  const run = runs
    .filter(
      (r) =>
        r.event === "push" &&
        r.head_branch === branch &&
        r.status === "completed" &&
        r.conclusion === "success" &&
        sha(r.head_sha) &&
        /^\d+$/.test(String(r.id)) &&
        date(r.created_at) &&
        date(r.updated_at) &&
        /^\.github\/workflows\/(?:check|checks|ci|test|tests|validate|verify)(?:[-.][\w.-]+)?\.ya?ml$/.test(
          r.path,
        ),
    )
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  return run
    ? {
        state: run.head_sha === sourceSha ? "same-source" : "prior-source",
        runId: String(run.id),
        sourceSha: run.head_sha,
        workflow: run.path,
        completedAt: run.updated_at,
      }
    : { state: "unavailable" };
}

export function validateCohortEvidence(evidence, cohort) {
  if (
    !keys(evidence, [
      "observedAt",
      "manifestSha256",
      "lockSha256",
      "resolved",
      "sourceCi",
      "recipe",
    ]) ||
    !date(evidence.observedAt) ||
    !digest(evidence.manifestSha256) ||
    !digest(evidence.lockSha256) ||
    !keys(evidence.resolved, Object.keys(cohort.tools)) ||
    Object.entries(cohort.tools).some(
      ([name, range]) =>
        !semver.valid(evidence.resolved[name]) ||
        !semver.satisfies(evidence.resolved[name], range),
    )
  )
    throw Error("Invalid cohort evidence binding");
  const ci = evidence.sourceCi;
  if (ci?.state === "unavailable") {
    if (!keys(ci, ["state"]))
      throw Error("Invalid unavailable cohort evidence");
  } else if (
    !keys(ci, ["state", "runId", "sourceSha", "workflow", "completedAt"]) ||
    !["same-source", "prior-source"].includes(ci.state) ||
    !/^\d+$/.test(ci.runId ?? "") ||
    !sha(ci.sourceSha) ||
    !/^\.github\/workflows\/[\w.-]+\.ya?ml$/.test(ci.workflow ?? "") ||
    !date(ci.completedAt) ||
    (ci.state === "same-source") !== (ci.sourceSha === cohort.sourceSha)
  )
    throw Error("Invalid source CI cohort evidence");
  const recipe = evidence.recipe;
  if (
    !keys(recipe, ["qualification", "command", "runtimeInputs"]) ||
    recipe.qualification !== "unqualified" ||
    !(
      recipe.command === null ||
      (typeof recipe.command === "string" &&
        recipe.command.length > 0 &&
        recipe.command.length <= 4096)
    ) ||
    !Array.isArray(recipe.runtimeInputs) ||
    recipe.runtimeInputs.some(
      (path) => !["deno.json", "deno.jsonc"].includes(path),
    ) ||
    new Set(recipe.runtimeInputs).size !== recipe.runtimeInputs.length
  )
    throw Error("Invalid recipe cohort evidence");
  return evidence;
}

export function assessCohortEvidence(snapshot, cohort) {
  const evidence = cohort?.evidence;
  if (!evidence)
    return { state: "unrecorded", recipe: { qualification: "unqualified" } };
  return {
    state: "recorded",
    source:
      snapshot.sourceSha === cohort.sourceSha
        ? "matches-recorded-source"
        : "source-changed",
    manifest: !snapshot.toolingManifestSha256
      ? "unavailable"
      : snapshot.toolingManifestSha256 === evidence.manifestSha256
        ? "matches-recorded-manifest"
        : "manifest-changed",
    lock: !snapshot.toolingLockSha256
      ? "unavailable"
      : snapshot.toolingLockSha256 === evidence.lockSha256
        ? "matches-recorded-lock"
        : "lock-changed",
    observedAt: evidence.observedAt,
    sourceCi: {
      ...evidence.sourceCi,
      currentSource:
        evidence.sourceCi.state === "unavailable"
          ? "unavailable"
          : evidence.sourceCi.sourceSha === snapshot.sourceSha
            ? "matches-current-source"
            : "different-current-source",
    },
    recipe: evidence.recipe,
    limit:
      "Historical successful source pipeline only; whole version recipe remains unqualified and current-head functional gates still apply.",
  };
}
