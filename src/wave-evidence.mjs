import semver from "semver";
import YAML from "yaml";
import { createHash } from "node:crypto";
import { workflowApplies } from "./policy.mjs";
import { discoverRepository, requestJson } from "./github.mjs";

const object = (value) =>
  value && typeof value === "object" && !Array.isArray(value);
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : object(value)
      ? Object.fromEntries(
          Object.keys(value)
            .sort((a, b) => a.localeCompare(b, "en"))
            .map((key) => [key, canonical(value[key])]),
        )
      : value;
const digest = (value) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");

function targetLockProjection(lock, targetNames) {
  if (!object(lock) || !object(lock.importers))
    throw Error("Recovery requires a valid pnpm lockfile");
  const names = [...new Set(targetNames)].sort((a, b) =>
      a.localeCompare(b, "en"),
    ),
    normalizeReference = (value) => {
      if (typeof value === "string") {
        const version = value.split("(")[0];
        return semver.valid(version) ? version : value;
      }
      if (!object(value)) return value;
      const normalized = { ...value };
      if (typeof normalized.version === "string") {
        const version = normalized.version.split("(")[0];
        if (semver.valid(version)) normalized.version = version;
      }
      return normalized;
    },
    selectedNames = (value) =>
      object(value)
        ? Object.fromEntries(
            names
              .filter((name) => Object.hasOwn(value, name))
              .map((name) => [name, normalizeReference(value[name])]),
          )
        : {},
    ownCoordinate = (key) => {
      if (typeof key !== "string") return null;
      for (const name of names) {
        const clean = key.startsWith("/") ? key.slice(1) : key;
        for (const separator of ["@", "/"])
          if (clean.startsWith(`${name}${separator}`)) {
            const version = clean
              .slice(name.length + 1)
              .split("(")[0]
              .split("/")[0];
            if (semver.valid(version)) return `${name}@${version}`;
          }
      }
      return null;
    },
    dependencyFields = [
      "specifiers",
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
      "dependenciesMeta",
      "peerDependenciesMeta",
    ],
    importers = {};
  for (const [path, importer] of Object.entries(lock.importers)) {
    if (!object(importer))
      throw Error("Recovery requires a valid pnpm lock importer");
    const selected = {};
    for (const field of dependencyFields) {
      const values = selectedNames(importer[field]);
      if (Object.keys(values).length) selected[field] = values;
    }
    if (Object.keys(selected).length) importers[path] = selected;
  }
  const graphTable = (value, packageRecords = false) => {
    if (value === undefined) return {};
    if (!object(value))
      throw Error("Recovery requires a valid pnpm lock graph");
    const selected = {};
    for (const [key, record] of Object.entries(value)) {
      const own = ownCoordinate(key);
      if (!object(record)) continue;
      const fields = {};
      if (own && packageRecords)
        for (const field of [
          "resolution",
          "id",
          "name",
          "version",
          "engines",
          "cpu",
          "os",
          "libc",
          "deprecated",
          "hasBin",
        ])
          if (record[field] !== undefined) fields[field] = record[field];
      for (const field of dependencyFields) {
        const values = selectedNames(record[field]);
        if (Object.keys(values).length) fields[field] = values;
      }
      if (Array.isArray(record.transitivePeerDependencies)) {
        const peers = record.transitivePeerDependencies.filter((name) =>
          names.includes(name),
        );
        if (peers.length) fields.transitivePeerDependencies = peers;
      }
      if (own || Object.keys(fields).length) {
        const coordinate = own ?? key.split("(")[0];
        selected[coordinate] ??= [];
        const normalized = canonical(fields),
          signature = JSON.stringify(normalized);
        if (
          !selected[coordinate].some(
            (candidate) => JSON.stringify(candidate) === signature,
          )
        )
          selected[coordinate].push(normalized);
      }
    }
    return selected;
  };
  const catalogs = {};
  if (lock.catalogs !== undefined) {
    if (!object(lock.catalogs))
      throw Error("Recovery requires a valid pnpm lock catalog");
    for (const [catalog, values] of Object.entries(lock.catalogs)) {
      const selected = selectedNames(values);
      if (Object.keys(selected).length) catalogs[catalog] = selected;
    }
  }
  const graphKeys = new Set([
    "importers",
    "packages",
    "snapshots",
    "catalogs",
    "patchedDependencies",
  ]);
  return canonical({
    targetNames: names,
    metadata: Object.fromEntries(
      Object.entries(lock).filter(([key]) => !graphKeys.has(key)),
    ),
    importers,
    packages: graphTable(lock.packages, true),
    snapshots: graphTable(lock.snapshots),
    catalogs,
    patchedDependencies: object(lock.patchedDependencies)
      ? Object.fromEntries(
          Object.entries(lock.patchedDependencies).filter(([key]) =>
            Boolean(ownCoordinate(key)),
          ),
        )
      : {},
  });
}

export async function qualifyRecoverySource(operation, repo, options = {}) {
  const validSha = (value) => /^[a-f0-9]{40}$/.test(value ?? "");
  if (
    repo?.visibility !== "public" ||
    repo.repository !== operation?.repository ||
    !validSha(operation.sourceSha) ||
    !validSha(repo.sourceSha) ||
    options.expectedSourceSha !== repo.sourceSha
  )
    throw Error("Recovery requires an exact current public source revision");
  const projection = async (revision) => {
    const tree = await requestJson(
      `https://api.github.com/repos/${repo.repository}/git/trees/${revision}?recursive=1`,
      options,
    );
    if (
      tree.truncated !== false ||
      !validSha(tree.sha) ||
      !Array.isArray(tree.tree) ||
      !tree.tree.length
    )
      throw Error("Recovery requires complete immutable source trees");
    const paths = new Set(),
      entries = [],
      all = new Map();
    for (const entry of tree.tree) {
      if (
        typeof entry.path !== "string" ||
        !entry.path ||
        /[\x00-\x1f\x7f\\]/.test(entry.path) ||
        entry.path.split("/").some((p) => !p || p === "." || p === "..") ||
        paths.has(entry.path) ||
        !validSha(entry.sha) ||
        !{
          blob: ["100644", "100755", "120000"],
          tree: ["040000"],
          commit: ["160000"],
        }[entry.type]?.includes(entry.mode)
      )
        throw Error("Recovery requires complete safe unique source paths");
      paths.add(entry.path);
      if (entry.type === "tree") {
        if (entry.mode !== "040000") throw Error("Invalid recovery tree mode");
        continue;
      }
      all.set(entry.path, [entry.path, entry.type, entry.mode, entry.sha]);
      const operational =
        entry.type === "blob" &&
        entry.mode === "100644" &&
        (/^(?:spec|docs)\/.*\.md$/.test(entry.path) ||
          /^\.github\/workflows\/[^/]+\.ya?ml$/.test(entry.path) ||
          entry.path === ".github/versioning-runtime.json" ||
          /^(?:scripts|tests)\/.*\.test\.[cm]?[jt]s$/.test(entry.path));
      if (!operational)
        entries.push([entry.path, entry.type, entry.mode, entry.sha]);
    }
    return {
      all,
      legacy: createHash("sha256")
        .update(
          JSON.stringify(
            entries.sort((a, b) => a[0].localeCompare(b[0], "en")),
          ),
        )
        .digest("hex"),
    };
  };
  const before = await projection(operation.sourceSha);
  const after = await projection(repo.sourceSha);
  const proof = {
    repository: repo.repository,
    sourceSha: operation.sourceSha,
    currentSourceSha: repo.sourceSha,
  };
  if (before.legacy === after.legacy)
    return {
      schemaVersion: 1,
      ...proof,
      projectionSha256: before.legacy,
    };

  const safeManifest = (path) =>
    typeof path === "string" &&
    (path === "package.json" || path.endsWith("/package.json")) &&
    !path.startsWith("/") &&
    !/[\x00-\x1f\x7f\\]/.test(path) &&
    !path.split("/").some((part) => !part || part === "." || part === "..");
  if (
    !/^[a-f0-9]{64}$/.test(operation.id ?? "") ||
    !operation.targets?.length ||
    operation.targets.some(
      (target) =>
        !safeManifest(target.path) ||
        ![
          "dependencies",
          "devDependencies",
          "optionalDependencies",
          "peerDependencies",
        ].includes(target.type) ||
        typeof target.name !== "string" ||
        !target.name ||
        !semver.valid(target.target),
    )
  )
    throw Error(
      "Source-advanced recovery requires unchanged code and dependency inputs",
    );
  const surface = new Set([
    "package.json",
    "pnpm-lock.yaml",
    ...operation.targets.map((target) => target.path),
  ]);
  for (const optional of [
    "pnpm-workspace.yaml",
    ".github/dependency-automation/canonical-intake.json",
  ])
    if (before.all.has(optional) || after.all.has(optional))
      surface.add(optional);
  const targetSurfacePaths = [...surface].sort((a, b) =>
    a.localeCompare(b, "en"),
  );
  const surfaceProjection = (tree) => {
    const entries = targetSurfacePaths.map((path) => tree.all.get(path));
    if (
      entries.some(
        (entry) =>
          !entry ||
          entry[1] !== "blob" ||
          !["100644", "100755"].includes(entry[2]),
      )
    )
      throw Error(
        "Source-advanced recovery requires unchanged operation target surface",
      );
    return createHash("sha256").update(JSON.stringify(entries)).digest("hex");
  };
  const beforeSurface = surfaceProjection(before),
    afterSurface = surfaceProjection(after);
  if (beforeSurface === afterSurface)
    return {
      schemaVersion: 2,
      ...proof,
      operationId: operation.id,
      targetSurfacePaths,
      projectionSha256: beforeSurface,
    };

  const changedSurface = targetSurfacePaths.filter(
    (path) =>
      JSON.stringify(before.all.get(path)) !==
      JSON.stringify(after.all.get(path)),
  );
  if (changedSurface.length !== 1 || changedSurface[0] !== "pnpm-lock.yaml")
    throw Error(
      "Source-advanced recovery requires unchanged operation target surface",
    );
  const readBlob = async (tree) => {
    const entry = tree.all.get("pnpm-lock.yaml"),
      value = await requestJson(
        `https://api.github.com/repos/${repo.repository}/git/blobs/${entry[3]}`,
        options,
      );
    if (
      value?.encoding !== "base64" ||
      typeof value.content !== "string" ||
      (value.sha !== undefined && value.sha !== entry[3])
    )
      throw Error("Recovery requires exact pnpm lock blobs");
    const bytes = Buffer.from(value.content.replace(/\s/gu, ""), "base64");
    if (!bytes.length || bytes.length > 16 * 1024 * 1024)
      throw Error("Recovery requires bounded pnpm lock blobs");
    const observed = createHash("sha1")
      .update(`blob ${bytes.length}\0`)
      .update(bytes)
      .digest("hex");
    if (observed !== entry[3])
      throw Error("Recovery requires exact pnpm lock blobs");
    return { bytes: bytes.toString("utf8"), sha: entry[3] };
  };
  const beforeLock = await readBlob(before),
    afterLock = await readBlob(after);
  let beforeDocument, afterDocument;
  try {
    beforeDocument = YAML.parse(beforeLock.bytes);
    afterDocument = YAML.parse(afterLock.bytes);
  } catch {
    throw Error("Recovery requires valid pnpm lock blobs");
  }
  const targetNames = operation.targets.map((target) => target.name),
    beforeLockProjection = digest(
      targetLockProjection(beforeDocument, targetNames),
    ),
    afterLockProjection = digest(
      targetLockProjection(afterDocument, targetNames),
    );
  if (beforeLockProjection !== afterLockProjection)
    throw Error(
      "Source-advanced recovery requires unchanged operation target lock projection",
    );
  const stableSurface = (tree) =>
      targetSurfacePaths.map((path) =>
        path === "pnpm-lock.yaml"
          ? [
              path,
              tree.all.get(path)[1],
              tree.all.get(path)[2],
              beforeLockProjection,
            ]
          : tree.all.get(path),
      ),
    beforeStable = digest(stableSurface(before)),
    afterStable = digest(stableSurface(after));
  if (beforeStable !== afterStable)
    throw Error(
      "Source-advanced recovery requires unchanged operation target surface",
    );
  return {
    schemaVersion: 3,
    ...proof,
    operationId: operation.id,
    targetSurfacePaths,
    sourceLockSha: beforeLock.sha,
    currentLockSha: afterLock.sha,
    targetLockProjectionSha256: beforeLockProjection,
    projectionSha256: beforeStable,
  };
}

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
  const expected = new Set(evidence.expected ?? []);
  const runs = evidence.runs.filter(
    (r) =>
      r.head_sha === sha &&
      expected.has(r.workflow_id ?? r.path) &&
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
  const checks = (evidence.checks ?? []).filter(
      (check) => check.app !== "github-actions",
    ),
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
    ({ name, status, conclusion, app }) => ({
      name,
      status,
      conclusion,
      app: app?.slug ?? null,
    }),
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
