import { readFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { requestJson } from "./github.mjs";

const sha = (value) => /^[a-f0-9]{40}$/.test(value ?? "");
const positive = (value) => Number.isSafeInteger(value) && value > 0;
const workflowPath = (value) =>
  /^\.github\/workflows\/[a-z0-9-]+\.ya?ml$/.test(value);
const hold = (reason) => {
  throw new Error(reason);
};

export async function loadCompletionPolicy(entries) {
  const policy = JSON.parse(
    await readFile(
      new URL("../config/completions.json", import.meta.url),
      "utf8",
    ),
  );
  return validateCompletionPolicy(policy, entries);
}

export function validateCompletionPolicy(policy, entries) {
  if (
    policy.schemaVersion !== 1 ||
    !workflowPath(policy.callbackPath) ||
    !policy.repositories ||
    Object.keys(policy).some(
      (k) => !["schemaVersion", "callbackPath", "repositories"].includes(k),
    )
  )
    hold("invalid-completion-policy");
  for (const [repository, workflows] of Object.entries(policy.repositories)) {
    if (
      !entries.some((e) => e.repository === repository && !e.holdReason) ||
      !Array.isArray(workflows) ||
      !workflows.length
    )
      hold("invalid-completion-policy");
    const ids = new Set(),
      paths = new Set();
    for (const w of workflows) {
      if (
        !positive(w.id) ||
        !workflowPath(w.path) ||
        w.path === policy.callbackPath ||
        ids.has(w.id) ||
        paths.has(w.path) ||
        !Array.isArray(w.events) ||
        !w.events.length ||
        w.events.some(
          (event) =>
            !["pull_request", "push", "workflow_dispatch"].includes(event),
        ) ||
        Object.keys(w).some((k) => !["id", "path", "events"].includes(k))
      )
        hold("invalid-completion-policy");
      ids.add(w.id);
      paths.add(w.path);
    }
  }
  return policy;
}

function sameRepository(value, info) {
  return (
    value?.id === info.id &&
    value?.full_name === info.full_name &&
    value?.fork === false
  );
}
function publicRepository(info, repository) {
  if (
    !positive(info?.id) ||
    info.full_name !== repository ||
    info.private !== false ||
    info.visibility !== "public" ||
    info.archived !== false ||
    !info.default_branch
  )
    hold("source-not-public");
}
function runIdentity(run, expected, info) {
  if (
    run.id !== expected.id ||
    run.run_attempt !== expected.run_attempt ||
    run.workflow_id !== expected.workflow_id ||
    run.path !== expected.path ||
    run.head_sha !== expected.head_sha ||
    run.event !== expected.event ||
    run.head_branch !== expected.head_branch ||
    !sameRepository(run.repository, info) ||
    !sameRepository(run.head_repository, info)
  )
    hold("run-identity-mismatch");
}
async function callbackRun(base, notification, policy, info, get) {
  if (!positive(notification?.runId) || !positive(notification.runAttempt))
    hold("invalid-callback-identity");
  const workflow = await get(
    `${base}/actions/workflows/${encodeURIComponent(policy.callbackPath.split("/").at(-1))}`,
  );
  if (
    !positive(workflow.id) ||
    workflow.path !== policy.callbackPath ||
    workflow.state !== "active"
  )
    hold("callback-workflow-unknown");
  const run = await get(`${base}/actions/runs/${notification.runId}`);
  if (
    run.id !== notification.runId ||
    run.run_attempt !== notification.runAttempt ||
    run.workflow_id !== workflow.id ||
    run.path !== policy.callbackPath ||
    run.event !== "workflow_run" ||
    !sha(run.head_sha) ||
    !positive(run.check_suite_id) ||
    run.head_branch !== info.default_branch ||
    !sameRepository(run.repository, info) ||
    !sameRepository(run.head_repository, info)
  )
    hold("callback-identity-mismatch");
  return run;
}

// No candidate file/artifact is read or executed; all evidence is GitHub metadata.
export async function qualifyCompletion(context, event, policy, options = {}) {
  try {
    const rules = policy.repositories[context.repository];
    if (
      !rules ||
      context.eventName !== "workflow_run" ||
      event.action !== "completed" ||
      !sha(context.sha) ||
      !positive(context.runId) ||
      !positive(context.runAttempt)
    )
      hold("untrusted-completion-context");
    const source = event.workflow_run;
    const rule = rules.find(
      (w) =>
        w.id === source?.workflow_id &&
        w.path === source?.path &&
        w.events.includes(source?.event),
    );
    if (
      !rule ||
      !positive(source.id) ||
      !positive(source.run_attempt) ||
      !sha(source.head_sha)
    )
      hold("source-workflow-not-allowed");
    const get = (url) => requestJson(url, options);
    const base = `https://api.github.com/repos/${context.repository}`;
    const info = await get(base);
    publicRepository(info, context.repository);
    if (
      context.ref !== `refs/heads/${info.default_branch}` ||
      event.repository?.id !== info.id ||
      event.repository?.full_name !== info.full_name
    )
      hold("untrusted-completion-context");
    const workflow = await get(`${base}/actions/workflows/${rule.id}`);
    if (
      workflow.id !== rule.id ||
      workflow.path !== rule.path ||
      workflow.state !== "active"
    )
      hold("source-workflow-not-allowed");
    const run = await get(
      `${base}/actions/runs/${source.id}/attempts/${source.run_attempt}`,
    );
    runIdentity(run, source, info);
    if (
      run.status !== "completed" ||
      run.conclusion !== "success" ||
      source.status !== "completed" ||
      source.conclusion !== "success"
    )
      hold("source-run-not-successful");
    const notification = {
      runId: context.runId,
      runAttempt: context.runAttempt,
    };
    const callback = await callbackRun(base, notification, policy, info, get);
    if (callback.head_sha !== context.sha || callback.status !== "in_progress")
      hold("untrusted-completion-context");
    async function currentHead() {
      if (run.event !== "pull_request") {
        const branch = await get(
          `${base}/branches/${encodeURIComponent(info.default_branch)}`,
        );
        if (
          run.head_branch !== info.default_branch ||
          branch.commit?.sha !== run.head_sha
        )
          hold("source-head-moved");
        return;
      }
      if (
        !run.pull_requests?.length ||
        run.pull_requests.length > 20 ||
        run.pull_requests.some((p) => !positive(p.number))
      )
        hold("current-pr-unknown");
      let matches = 0;
      for (const { number } of run.pull_requests) {
        const pr = await get(`${base}/pulls/${number}`);
        if (
          pr.number === number &&
          pr.state === "open" &&
          pr.merged === false &&
          pr.base?.repo?.id === info.id &&
          pr.base.ref === info.default_branch &&
          sameRepository(pr.head?.repo, info) &&
          pr.head.sha === run.head_sha &&
          pr.head.ref === run.head_branch
        )
          matches++;
      }
      if (matches !== 1) hold("source-head-moved");
    }
    await currentHead();
    const latest = await get(`${base}/actions/runs/${source.id}`);
    runIdentity(latest, run, info);
    if (latest.status !== "completed" || latest.conclusion !== "success")
      hold("source-run-not-successful");
    // Repeat after the other reads; dispatch repeats the entire verification too.
    await currentHead();
    return {
      eligible: true,
      reason: "verified-current-completion",
      repository: context.repository,
      sourceSha: run.head_sha,
      notification,
    };
  } catch (error) {
    const reason = /^[a-z-]+$/.test(error.message)
      ? error.message
      : "completion-coverage-unavailable";
    return { eligible: false, reason };
  }
}

// The dispatch is sent while its job is running. Settle that exact attempt first
// so the final completion hint cannot observe its own pending check and stall.
export async function settleCompletion(hint, policy, options = {}) {
  if (!hint.notification) return; // Legacy hints remain wake-ups only.
  const get = (url) => requestJson(url, options);
  const base = `https://api.github.com/repos/${hint.repository}`;
  if (!policy.repositories[hint.repository])
    hold("source-workflow-not-allowed");
  const info = await get(base);
  publicRepository(info, hint.repository);
  const attempts = options.attempts ?? 24;
  for (let n = 0; n < attempts; n++) {
    const run = await callbackRun(base, hint.notification, policy, info, get);
    if (run.status === "completed") {
      if (run.conclusion !== "success") hold("callback-not-successful");
      const checks = await get(
        `${base}/check-suites/${run.check_suite_id}/check-runs?filter=latest&per_page=100`,
      );
      if (
        !Array.isArray(checks.check_runs) ||
        !positive(checks.total_count) ||
        checks.total_count > 100 ||
        checks.total_count !== checks.check_runs.length ||
        checks.check_runs.some((check) => check.head_sha !== run.head_sha)
      )
        hold("callback-check-coverage-unknown");
      if (checks.check_runs.every((check) => check.status === "completed")) {
        if (checks.check_runs.some((check) => check.conclusion !== "success"))
          hold("callback-check-not-successful");
        return;
      }
    } else if (
      !["queued", "in_progress", "waiting", "pending", "requested"].includes(
        run.status,
      )
    )
      hold("callback-status-unknown");
    if (n + 1 < attempts) await (options.sleep ?? setTimeout)(5000);
  }
  hold("callback-settlement-timeout");
}
