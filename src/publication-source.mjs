import { createHash } from "node:crypto";
import YAML from "yaml";
import { qualification } from "./wave-evidence.mjs";
import { workflowApplies } from "./policy.mjs";
import { hash } from "./publication-tool.mjs";
import { limits, publicArtifact } from "./publication-transport.mjs";
import {
  contractDigest,
  dependencyContractDigest,
} from "./publication-evidence.mjs";

const fail = (r) => {
  throw Error(r);
};
const positive = (v) => Number.isSafeInteger(v) && v > 0;
const exactArray = (value, field) => {
  const rows = value[field];
  if (
    !Array.isArray(rows) ||
    !Number.isInteger(value.total_count) ||
    rows.length !== value.total_count ||
    rows.length > 100
  )
    fail("publication-coverage-incomplete");
  return rows;
};
function validRun(run, context, policy, info) {
  if (
    run.id !== context.runId ||
    run.run_attempt !== context.runAttempt ||
    run.head_sha !== context.sourceSha ||
    run.path !== policy.workflow ||
    run.workflow_id !== policy.workflowId ||
    run.event !== policy.event ||
    run.head_branch !== info.default_branch ||
    run.repository?.id !== info.id ||
    run.head_repository?.id !== info.id ||
    run.head_repository?.full_name !== info.full_name ||
    run.head_repository?.fork !== false ||
    run.status !== "completed"
  )
    fail("publication-run-mismatch");
}
async function jobs(reader, base, context) {
  return exactArray(
    await reader.json(
      `${base}/actions/runs/${context.runId}/attempts/${context.runAttempt}/jobs?per_page=100`,
    ),
    "jobs",
  );
}
const job = (rows, name) => rows.filter((r) => r.name === name);
function requireJobs(rows, names) {
  for (const name of names)
    if (
      job(rows, name).length !== 1 ||
      job(rows, name)[0].status !== "completed" ||
      job(rows, name)[0].conclusion !== "success"
    )
      fail("publication-verification-incomplete");
}

export function publishedTarballUrl(metadata) {
  const url = new URL(metadata.dist.tarball),
    slug = metadata.name.split("/").at(-1);
  if (
    url.origin !== "https://registry.npmjs.org" ||
    decodeURIComponent(url.pathname) !==
      `/${metadata.name}/-/${slug}-${metadata.version}.tgz` ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    fail("publication-url-rejected");
  return url.href;
}

async function releaseArtifact(reader, base, context, policy, rows, metadata) {
  const artifacts = exactArray(
    await reader.json(
      `${base}/actions/runs/${context.runId}/artifacts?per_page=100`,
    ),
    "artifacts",
  );
  const matches = artifacts.filter(
    (a) =>
      a.name === policy.artifactPrefix + context.sourceSha &&
      a.expired === false,
  );
  if (matches.length !== 1) fail("publication-artifact-unknown");
  const artifact = matches[0],
    prepare = job(rows, policy.prepareJob)[0];
  const created = Date.parse(artifact.created_at);
  if (
    !positive(artifact.id) ||
    !/^sha256:[a-f0-9]{64}$/.test(artifact.digest ?? "") ||
    artifact.size_in_bytes <= 0 ||
    artifact.size_in_bytes > limits.artifact ||
    artifact.workflow_run?.id !== context.runId ||
    artifact.workflow_run.head_sha !== context.sourceSha ||
    artifact.workflow_run.repository_id !== context.repositoryId ||
    artifact.workflow_run.head_repository_id !== context.repositoryId ||
    !Number.isFinite(created) ||
    !(
      created >= Date.parse(prepare.started_at) &&
      created <= Date.parse(prepare.completed_at)
    )
  )
    fail("publication-artifact-mismatch");
  const bytes = await reader.bytes(
    `${base}/actions/artifacts/${artifact.id}/zip`,
    limits.artifact,
    true,
  );
  if (
    bytes.length !== artifact.size_in_bytes ||
    "sha256:" + hash(bytes) !== artifact.digest
  )
    fail("publication-artifact-mismatch");
  const read = publicArtifact(
      bytes,
      (name) =>
        name === policy.manifest ||
        name === "release-plan.json" ||
        /^tarballs\/[A-Za-z0-9._-]+\.tgz$/.test(name),
    ),
    manifestBytes = read(policy.manifest),
    manifest = JSON.parse(manifestBytes);
  if (
    manifest.schemaVersion !== 1 ||
    manifest.repository !==
      base.slice("https://api.github.com/repos/".length) ||
    manifest.commit !== context.sourceSha ||
    manifest.artifactName !== artifact.name ||
    manifest.registry !== "https://registry.npmjs.org" ||
    !Array.isArray(manifest.packages) ||
    manifest.packages.length > 64
  )
    fail("publication-manifest-mismatch");
  const entries = manifest.packages.filter(
    (p) => p.name === metadata.name && p.version === metadata.version,
  );
  if (entries.length !== 1) fail("publication-manifest-mismatch");
  const entry = entries[0];
  if (
    entry.tag !== "next" ||
    entry.integrity !== metadata.dist.integrity ||
    !/^[a-f0-9]{64}$/.test(entry.shasum ?? "") ||
    !/^tarballs\/[A-Za-z0-9._-]+\.tgz$/.test(entry.tarball ?? "")
  )
    fail("publication-manifest-mismatch");
  const tarball = read(entry.tarball, limits.tarball);
  if (
    tarball.length !== entry.size ||
    hash(tarball) !== entry.shasum ||
    "sha512-" + createHash("sha512").update(tarball).digest("base64") !==
      entry.integrity
  )
    fail("publication-tarball-mismatch");
  const url = publishedTarballUrl(metadata);
  const published = await reader.bytes(url, limits.tarball);
  if (!published.equals(tarball)) fail("publication-tarball-mismatch");
  return {
    id: artifact.id,
    sha256: hash(bytes),
    manifestSha256: hash(manifestBytes),
    tarballSha256: entry.shasum,
  };
}

async function sourceQualification(reader, base, sourceSha, info) {
  const workflows = exactArray(
    await reader.json(`${base}/actions/workflows?per_page=100`),
    "workflows",
  );
  const files = await reader.json(
    `${base}/contents/.github/workflows?ref=${sourceSha}`,
  );
  if (!Array.isArray(files) || !files.length || files.length > 32)
    fail("publication-coverage-incomplete");
  const commit = await reader.json(`${base}/commits/${sourceSha}?per_page=100`);
  if (commit.sha !== sourceSha || !Array.isArray(commit.files))
    fail("publication-coverage-incomplete");
  const changed =
    commit.files.length < 100
      ? commit.files.flatMap((f) => [
          f.filename,
          ...(f.previous_filename ? [f.previous_filename] : []),
        ])
      : null;
  const expected = [];
  for (const file of files) {
    if (!/\.ya?ml$/.test(file.path ?? "")) continue;
    if (
      file.type !== "file" ||
      !/^\.github\/workflows\/[a-zA-Z0-9_.-]+\.ya?ml$/.test(file.path)
    )
      fail("publication-coverage-incomplete");
    const content = await reader.json(
      `${base}/contents/${file.path}?ref=${sourceSha}`,
      128 * 1024,
    );
    if (
      content.encoding !== "base64" ||
      typeof content.content !== "string" ||
      content.content.length > 96 * 1024
    )
      fail("publication-coverage-incomplete");
    const doc = YAML.parse(
      Buffer.from(content.content, "base64").toString("utf8"),
    );
    const push = Array.isArray(doc.on)
      ? doc.on.includes("push")
      : typeof doc.on === "string"
        ? doc.on === "push"
        : doc.on && Object.hasOwn(doc.on, "push");
    if (
      !push ||
      workflowApplies(
        typeof doc.on === "object" ? doc.on.push : {},
        info.default_branch,
        changed,
      ) === false
    )
      continue;
    const matching = workflows.filter(
      (w) => w.path === file.path && w.state === "active",
    );
    if (matching.length !== 1) fail("publication-coverage-incomplete");
    expected.push(matching[0].id);
  }
  const runs = exactArray(
    await reader.json(
      `${base}/actions/runs?head_sha=${sourceSha}&per_page=100`,
    ),
    "workflow_runs",
  );
  const checks = exactArray(
    await reader.json(
      `${base}/commits/${sourceSha}/check-runs?filter=latest&per_page=100`,
    ),
    "check_runs",
  );
  const statuses = await reader.json(
    `${base}/commits/${sourceSha}/statuses?per_page=100`,
  );
  if (!Array.isArray(statuses) || statuses.length >= 100)
    fail("publication-coverage-incomplete");
  // Retire only completed check suites mapped to a fully successful newer
  // SAME-SHA run of the same workflow. Pending/foreign/unmapped checks remain.
  const latest = new Map();
  for (const run of runs)
    if (
      run.head_sha === sourceSha &&
      (!latest.has(run.workflow_id) ||
        run.run_number > latest.get(run.workflow_id).run_number ||
        (run.run_number === latest.get(run.workflow_id).run_number &&
          run.run_attempt > latest.get(run.workflow_id).run_attempt))
    )
      latest.set(run.workflow_id, run);
  const currentChecks = checks.filter((check) => {
    if (check.status !== "completed" || check.app?.slug !== "github-actions")
      return true;
    const old = runs.find(
      (run) =>
        run.head_sha === sourceSha &&
        run.check_suite_id === check.check_suite?.id,
    );
    const newer = old && latest.get(old.workflow_id);
    return (
      !old ||
      !newer ||
      newer.check_suite_id === old.check_suite_id ||
      old.status !== "completed" ||
      newer.status !== "completed" ||
      newer.conclusion !== "success"
    );
  });
  const evidence = {
    sha: sourceSha,
    expected,
    runs,
    checks: currentChecks,
    statuses,
  };
  if (
    checks.some((c) => c.head_sha !== sourceSha) ||
    runs.some((r) => r.head_sha !== sourceSha) ||
    qualification(evidence, sourceSha).state !== "qualified"
  )
    fail("publication-source-ci-unqualified");
  return hash(
    JSON.stringify({
      expected,
      runs: runs.map((r) => [
        r.id,
        r.run_attempt,
        r.head_sha,
        r.status,
        r.conclusion,
      ]),
      checks: checks.map((c) => [c.id, c.status, c.conclusion]),
      statuses: statuses.map((s) => [s.id, s.state]),
    }),
  );
}

export async function verifyPublisherSource(
  reader,
  context,
  policy,
  info,
  metadata,
  owner,
) {
  if (
    !/^(?:[A-Za-z0-9_.-]+\/)*package\.json$/.test(owner.path ?? "") ||
    owner.path.split("/").some((part) => [".", ".."].includes(part)) ||
    !/^[a-f0-9]{40}$/.test(owner.sourceSha ?? "")
  )
    fail("publication-source-path-rejected");
  const base = `https://api.github.com/repos/${info.full_name}`;
  const workflow = await reader.json(
    `${base}/actions/workflows/${policy.workflowId}`,
  );
  if (
    workflow.id !== policy.workflowId ||
    workflow.path !== policy.workflow ||
    workflow.state !== "active"
  )
    fail("publication-publisher-unreviewed");
  const origin = await reader.json(
    `${base}/actions/runs/${context.runId}/attempts/${context.runAttempt}`,
  );
  validRun(origin, context, policy, info);
  const originJobs = await jobs(reader, base, context);
  requireJobs(originJobs, [
    policy.prepareJob,
    policy.qualificationJob,
    policy.publishJob,
  ]);
  const artifact = await releaseArtifact(
    reader,
    base,
    context,
    policy,
    originJobs,
    metadata,
  );
  let verification;
  try {
    if (origin.conclusion !== "success")
      fail("publication-verification-incomplete");
    requireJobs(originJobs, [policy.verifyJob, policy.releaseJob]);
    verification = {
      runId: context.runId,
      runAttempt: context.runAttempt,
      ...artifact,
    };
  } catch {
    const candidates = await reader.json(
      `${base}/actions/workflows/${policy.workflowId}/runs?head_sha=${context.sourceSha}&per_page=10`,
    );
    if (
      !Array.isArray(candidates.workflow_runs) ||
      candidates.workflow_runs.length > 10
    )
      fail("publication-coverage-incomplete");
    for (const run of candidates.workflow_runs
      .filter((r) => r.status === "completed" && r.conclusion === "success")
      .slice(0, 3)) {
      const recovery = {
        ...context,
        runId: run.id,
        runAttempt: run.run_attempt,
      };
      const actual = await reader.json(
        `${base}/actions/runs/${run.id}/attempts/${run.run_attempt}`,
      );
      validRun(actual, recovery, policy, info);
      const recoveredJobs = await jobs(reader, base, recovery);
      requireJobs(recoveredJobs, [
        policy.prepareJob,
        policy.qualificationJob,
        policy.publishJob,
        policy.verifyJob,
        policy.releaseJob,
      ]);
      const recovered = await releaseArtifact(
        reader,
        base,
        recovery,
        policy,
        recoveredJobs,
        metadata,
      );
      if (recovered.tarballSha256 !== artifact.tarballSha256)
        fail("publication-recovery-mismatch");
      verification = {
        runId: recovery.runId,
        runAttempt: recovery.runAttempt,
        ...recovered,
      };
      break;
    }
    if (!verification) fail("publication-verification-incomplete");
  }
  const source = await reader.json(
    `${base}/contents/${owner.path}?ref=${context.sourceSha}`,
    256 * 1024,
  );
  if (
    source.encoding !== "base64" ||
    typeof source.content !== "string" ||
    source.content.length > 128 * 1024
  )
    fail("publication-source-contract-unknown");
  const sourceContractSha256 = contractDigest(
    JSON.parse(Buffer.from(source.content, "base64").toString("utf8")),
  );
  if (sourceContractSha256 !== contractDigest(metadata))
    fail("publication-source-contract-mismatch");
  const ancestry = await reader.json(
    `${base}/compare/${context.sourceSha}...${owner.sourceSha}?per_page=1`,
  );
  if (ancestry.merge_base_commit?.sha !== context.sourceSha)
    fail("publication-source-ancestry-unknown");
  const sourceCiSha256 = await sourceQualification(
    reader,
    base,
    context.sourceSha,
    info,
  );
  return {
    artifact,
    verification,
    sourceContractSha256,
    sourceCiSha256,
    dependencyContractSha256: dependencyContractDigest(metadata),
  };
}
