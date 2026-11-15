import semver from "semver";
import { workflowApplies } from "./policy.mjs";
import { discoverRepository, requestJson } from "./github.mjs";

// Pagination is bounded and fails closed; incomplete evidence never qualifies.
export async function pages(url, options = {}, field) {
  const all = [];
  for (let page = 1; page <= 100; page++) {
    const data = await requestJson(
      `${url}${url.includes("?") ? "&" : "?"}per_page=100&page=${page}`,
      options,
    );
    const rows = field ? data[field] : data;
    if (!Array.isArray(rows)) throw Error("Invalid paginated evidence");
    all.push(...rows);
    if (rows.length < 100) return all;
  }
  throw Error("Incomplete paginated evidence");
}

export function lockVersion(repo, edge) {
  if (edge.type === "peerDependencies")
    return {
      version: semver.minVersion(edge.range)?.version,
      basis: "peer-support",
    };
  const importer =
    edge.path === "package.json"
      ? "."
      : edge.path.replace(/\/package.json$/, "");
  const raw = repo.lock?.importers?.[importer]?.[edge.type]?.[edge.name];
  const version = typeof raw === "string" ? raw : raw?.version;
  const clean = typeof version === "string" ? version.split("(")[0] : null;
  return semver.valid(clean)
    ? { version: clean, basis: "lock" }
    : { version: null, basis: "unknown-lock" };
}

export function qualification(evidence, sha) {
  if (!evidence || evidence.sha !== sha || evidence.incomplete)
    return {
      state: "unknown",
      reason: "missing or stale qualification coverage",
    };
  const runs = evidence.runs.filter(
    (r) =>
      r.head_sha === sha &&
      [
        "push",
        "pull_request",
        "pull_request_target",
        "workflow_dispatch",
        "workflow_call",
      ].includes(r.event),
  );
  const latest = new Map();
  for (const run of runs) {
    const key = run.workflow_id ?? run.path;
    if (
      !latest.has(key) ||
      run.run_number > latest.get(key).run_number ||
      (run.run_number === latest.get(key).run_number &&
        run.run_attempt > latest.get(key).run_attempt)
    )
      latest.set(key, run);
  }
  // Every currently active workflow with a push trigger must have current evidence.
  if (
    !evidence.expected?.length ||
    evidence.expected.some((id) => !latest.has(id))
  )
    return { state: "unknown", reason: "current workflow coverage incomplete" };
  const checks = evidence.checks ?? [],
    statuses = evidence.statuses ?? [];
  const currentStatuses = new Map();
  for (const status of statuses)
    if (!currentStatuses.has(status.context))
      currentStatuses.set(status.context, status);
  const rows = [...latest.values(), ...checks];
  if (
    runs.some((r) => r.status !== "completed") ||
    rows.some((r) => r.status !== "completed") ||
    [...currentStatuses.values()].some((s) => s.state === "pending")
  )
    return { state: "waiting", reason: "current CI still running" };
  if (
    rows.some(
      (r) => !["success", "neutral", "skipped"].includes(r.conclusion),
    ) ||
    [...currentStatuses.values()].some((s) => s.state !== "success")
  )
    return { state: "failed", reason: "current CI failure" };
  // A skipped workflow cannot qualify a publication boundary.
  if ([...latest.values()].some((r) => r.conclusion !== "success"))
    return { state: "unknown", reason: "workflow qualification skipped" };
  return {
    state: "qualified",
    reason: "all observed current workflows and checks completed",
  };
}

export function branchOwnership(prs, botLogin, botAuthor) {
  if (!botLogin || !botAuthor)
    return { state: "unknown", reason: "bot identity not configured" };
  for (const pr of prs) {
    if (
      pr.untrustedHead ||
      pr.user?.login !== botLogin ||
      !pr.commits?.length ||
      pr.commits.some(
        (c) =>
          c.author?.login !== botLogin ||
          `${c.commit?.author?.name} <${c.commit?.author?.email}>` !==
            botAuthor,
      )
    )
      return {
        state: "repair-owned",
        reason: "manual or unknown branch commit ownership",
        pr: pr.number,
        head: pr.head.sha,
      };
  }
  return {
    state: "bot-owned",
    reason: "PR and branch commit authors verified",
  };
}

export async function observeRepository(repo, options = {}) {
  const base = `https://api.github.com/repos/${repo.repository}`;
  const observations = {
    sha: repo.sourceSha,
    runs: [],
    checks: [],
    statuses: [],
    expected: [],
    prs: [],
    orphanBranches: [],
  };
  try {
    observations.runs = await pages(
      `${base}/actions/runs?head_sha=${repo.sourceSha}`,
      options,
      "workflow_runs",
    );
    observations.checks = await pages(
      `${base}/commits/${repo.sourceSha}/check-runs`,
      options,
      "check_runs",
    );
    observations.statuses = await pages(
      `${base}/commits/${repo.sourceSha}/statuses`,
      options,
    );
    const workflows = await pages(
      `${base}/actions/workflows`,
      options,
      "workflows",
    );
    // Expected push workflows are supplied by discovery of exact workflow YAML.
    observations.expected = workflows
      .filter(
        (w) => w.state === "active" && repo.pushWorkflows?.includes(w.path),
      )
      .map((w) => w.id);
    observations.prs = (
      await pages(`${base}/pulls?state=open`, options)
    ).filter((pr) => pr.head?.ref?.startsWith("lapis-dependencies/"));
    for (const pr of observations.prs) {
      pr.commits = await pages(`${base}/pulls/${pr.number}/commits`, options);
      const head = pr.head.sha;
      const changedFiles = await pages(
        `${base}/pulls/${pr.number}/files`,
        options,
      );
      const changedPaths =
        changedFiles.length < 3000
          ? changedFiles.flatMap((file) => [
              file.filename,
              ...(file.previous_filename ? [file.previous_filename] : []),
            ])
          : null;
      const applicable =
        repo.prWorkflowRules
          ?.filter(
            (rule) =>
              workflowApplies(
                rule.trigger,
                repo.defaultBranch,
                changedPaths,
              ) !== false,
          )
          .map((rule) => rule.path) ?? repo.prWorkflows;
      const prEvidence = {
        sha: head,
        expected: workflows
          .filter((w) => w.state === "active" && applicable?.includes(w.path))
          .map((w) => w.id),
        runs: await pages(
          `${base}/actions/runs?head_sha=${head}`,
          options,
          "workflow_runs",
        ),
        checks: await pages(
          `${base}/commits/${head}/check-runs`,
          options,
          "check_runs",
        ),
        statuses: await pages(`${base}/commits/${head}/statuses`, options),
      };
      pr.qualification = qualification(prEvidence, head);
      if (pr.head.repo?.full_name !== repo.repository) pr.untrustedHead = true;
      else {
        const comparison = await requestJson(
          `${base}/compare/${repo.sourceSha}...${head}`,
          options,
        );
        pr.basedOnCurrentSource =
          comparison.merge_base_commit?.sha === repo.sourceSha;
        pr.candidate = await discoverRepository(repo, {
          ...options,
          revision: head,
          publicOnly: true,
          waveEvidence: true,
        });
      }
    }
    const branches = await pages(`${base}/branches`, options);
    observations.dependencyBranches = branches
      .filter((b) => b.name.startsWith("lapis-dependencies/"))
      .map((b) => ({ branch: b.name, head: b.commit.sha }));
    for (const branch of branches.filter(
      (b) =>
        b.name.startsWith("lapis-dependencies/") &&
        !observations.prs.some((pr) => pr.head.ref === b.name),
    )) {
      const closed = await pages(
        `${base}/pulls?state=closed&head=${repo.repository.split("/")[0]}:${encodeURIComponent(branch.name)}`,
        options,
      );
      const merged = closed.find(
        (pr) => pr.merged_at && pr.head.sha === branch.commit.sha,
      );
      if (merged)
        merged.commits = await pages(
          `${base}/pulls/${merged.number}/commits`,
          options,
        );
      if (
        !merged ||
        branchOwnership([merged], options.botLogin, options.botAuthor).state !==
          "bot-owned"
      )
        observations.orphanBranches.push({
          branch: branch.name,
          head: branch.commit.sha,
        });
    }
  } catch {
    observations.incomplete = true;
  }
  observations.qualification = qualification(observations, repo.sourceSha);
  observations.ownership = branchOwnership(
    observations.prs,
    options.botLogin,
    options.botAuthor,
  );
  // Retain only the evidence consumed by admission, never arbitrary API bodies.
  observations.runs = observations.runs.map(
    ({
      head_sha,
      workflow_id,
      path,
      run_number,
      run_attempt,
      event,
      status,
      conclusion,
    }) => ({
      head_sha,
      workflow_id,
      path,
      run_number,
      run_attempt,
      event,
      status,
      conclusion,
    }),
  );
  observations.checks = observations.checks.map(
    ({ name, status, conclusion }) => ({ name, status, conclusion }),
  );
  observations.statuses = observations.statuses.map(({ context, state }) => ({
    context,
    state,
  }));
  observations.prs = observations.prs.map((pr) => ({
    number: pr.number,
    user: { login: pr.user?.login },
    head: { sha: pr.head.sha, ref: pr.head.ref },
    commits: pr.commits?.map((c) => ({
      author: { login: c.author?.login },
      commit: {
        author: {
          name: c.commit?.author?.name,
          email: c.commit?.author?.email,
        },
      },
    })),
    qualification: pr.qualification,
    basedOnCurrentSource: pr.basedOnCurrentSource,
    untrustedHead: pr.untrustedHead,
    candidate: pr.candidate,
  }));
  return observations;
}

// Hints are verified independently; the full scan remains authoritative.
export async function verifyHint(hint, entries, options = {}) {
  const entry = entries.find((e) => e.repository === hint.repository);
  if (!entry) throw Error("Hint source not allowlisted");
  let repo;
  try {
    repo = await discoverRepository(entry, {
      ...options,
      revision: hint.sourceSha,
      publicOnly: true,
    });
  } catch {
    return {
      status: "held",
      reason: "hint source unavailable; no public coverage",
    };
  }
  if (!repo || repo.visibility !== "public")
    return { status: "held", reason: "hint source lacks public coverage" };
  for (const p of hint.packages ?? []) {
    if (
      !repo.manifests.some(
        ({ manifest: m }) =>
          !m.private && m.name === p.name && m.version === p.version,
      )
    )
      throw Error("Hint does not match exact source manifest");
    const metadata = await requestJson(
      `https://registry.npmjs.org/${encodeURIComponent(p.name)}/${p.version}`,
      { fetcher: options.fetcher, allow404: true },
    );
    if (
      !metadata ||
      metadata.name !== p.name ||
      metadata.version !== p.version ||
      !metadata.dist?.integrity
    )
      throw Error("Hint registry identity/integrity unverified");
  }
  return {
    status: "verified",
    sourceSha: repo.sourceSha,
    repository: repo.repository,
    action: hint.action,
    packages: (hint.packages ?? []).map(({ name, version }) => ({
      name,
      version,
    })),
  };
}
