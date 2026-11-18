import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { hash } from "./publication-tool.mjs";
import { limits, publicArtifact } from "./publication-transport.mjs";
import { contractDigest } from "./publication-evidence.mjs";
import {
  jobs,
  requireJobs,
  publishedTarballUrl,
  verifySourceContract,
} from "./publication-source.mjs";

export const taggedWorkspaceContract = Object.freeze({
  kind: "agent-ui-tagged-workspace-v1",
  workflowSha256:
    "2be4a9256ce520f4a241a9af42fdbdb038039152e3686ee617d4c35f53ec59d3",
  workflowId: 400453743,
  workflow: ".github/workflows/npm-publish.yml",
  event: "push",
  environment: "npm-production",
  artifactPrefix: "agent-ui-release-",
  manifest: "manifest.json",
  prepareJob: "Validate and pack packages",
  publishJob: "Publish with npm trusted publishing",
  verifyJob: "Verify registry artifacts and provenance",
});
const repository = "lapismd/agent-ui";
const directories = ["agent-ui", "repository-ui"];
const stable = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/;
const reject = (reason = "publication-tagged-workspace-mismatch") => {
  throw Error(reason);
};
const exact = (value, fields) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  isDeepStrictEqual(Object.keys(value).sort(), [...fields].sort());
const list = (value, field) => {
  if (
    !Array.isArray(value[field]) ||
    value.total_count !== value[field].length ||
    value[field].length > 100
  )
    reject("publication-coverage-incomplete");
  return value[field];
};
export function validateTaggedWorkspacePublisher(name, policy, entries) {
  if (
    name !== repository ||
    !entries.some((e) => e.repository === repository) ||
    !isDeepStrictEqual(policy, taggedWorkspaceContract)
  )
    reject("Invalid tagged workspace publisher policy");
}

// This untrusted ref is only a candidate: existing crypto authenticates it and
// the source manifest below MUST independently bind the exact cohort tag.
export function resolveTaggedWorkspacePublisher(policy, body) {
  if (!isDeepStrictEqual(policy, taggedWorkspaceContract)) reject();
  const provenance = body.attestations?.find(
    (a) => a.predicateType === "https://slsa.dev/provenance/v1",
  );
  const payload = provenance?.bundle?.dsseEnvelope?.payload;
  if (typeof payload !== "string" || payload.length > 256 * 1024) reject();
  const statement = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
  const ref =
    statement.predicate?.buildDefinition?.externalParameters?.workflow?.ref;
  if (
    typeof ref !== "string" ||
    ref.length > 128 ||
    !ref.startsWith("refs/tags/v") ||
    !stable.test(ref.slice(11))
  )
    reject();
  return { ...policy, ref };
}

export async function verifyTaggedWorkspaceSource(
  reader,
  context,
  policy,
  info,
  metadata,
  owner,
) {
  const { ref, ...contract } = policy;
  validateTaggedWorkspacePublisher(info.full_name, contract, [{ repository }]);
  const base = `https://api.github.com/repos/${repository}`;
  const publisherFile = await reader.json(
    `${base}/contents/${policy.workflow}?ref=${context.sourceSha}`,
    128 * 1024,
  );
  if (
    owner.repository !== repository ||
    publisherFile.type !== "file" ||
    publisherFile.path !== policy.workflow ||
    publisherFile.encoding !== "base64" ||
    typeof publisherFile.content !== "string" ||
    publisherFile.content.length > 96 * 1024 ||
    hash(Buffer.from(publisherFile.content, "base64")) !== policy.workflowSha256
  )
    reject("publication-publisher-unreviewed");
  const cohort = [];
  for (const directory of directories) {
    const path = `packages/${directory}/package.json`;
    const file = await reader.json(
      `${base}/contents/${path}?ref=${context.sourceSha}`,
      128 * 1024,
    );
    if (
      file.type !== "file" ||
      file.path !== path ||
      file.encoding !== "base64" ||
      typeof file.content !== "string" ||
      file.content.length > 96 * 1024
    )
      reject();
    const manifest = JSON.parse(
      Buffer.from(file.content, "base64").toString("utf8"),
    );
    if (
      manifest.name !== `@lapismd/${directory}` ||
      !stable.test(manifest.version ?? "") ||
      manifest.private ||
      manifest.publishConfig?.access !== "public"
    )
      reject();
    cohort.push({
      directory,
      path,
      name: manifest.name,
      version: manifest.version,
      contractSha256: contractDigest(manifest),
    });
  }
  if (
    ref !== `refs/tags/v${cohort[0].version}` ||
    !cohort.some(
      (p) =>
        p.name === metadata.name &&
        p.version === metadata.version &&
        p.path === owner.path,
    )
  )
    reject();
  const workflow = await reader.json(
    `${base}/actions/workflows/${policy.workflowId}`,
  );
  if (
    workflow.id !== policy.workflowId ||
    workflow.path !== policy.workflow ||
    workflow.state !== "active"
  )
    reject("publication-publisher-unreviewed");
  const validRun = (run, attempt) => {
    if (
      run.id !== context.runId ||
      run.run_attempt !== attempt ||
      run.head_sha !== context.sourceSha ||
      run.path !== policy.workflow ||
      run.workflow_id !== policy.workflowId ||
      run.event !== policy.event ||
      run.head_branch !== ref.slice(10) ||
      run.repository?.id !== info.id ||
      run.head_repository?.id !== info.id ||
      run.head_repository?.full_name !== repository ||
      run.head_repository?.fork !== false ||
      run.status !== "completed"
    )
      reject("publication-run-mismatch");
  };
  const run = await reader.json(
    `${base}/actions/runs/${context.runId}/attempts/${context.runAttempt}`,
  );
  validRun(run, context.runAttempt);
  const rows = await jobs(reader, base, context);
  const publicationNames = [
    policy.prepareJob,
    ...cohort.map((p) => `${policy.publishJob} (${p.directory}, ${p.version})`),
  ];
  requireJobs(rows, publicationNames);
  let verificationAttempt = context.runAttempt;
  if (run.conclusion === "success") {
    requireJobs(rows, [policy.verifyJob]);
  } else {
    // Only the immediately following same-run verification retry is supported.
    // Original successful publication jobs are authority, never their projected IDs.
    const originalVerify = rows.filter((r) => r.name === policy.verifyJob);
    const times = (r) => [Date.parse(r.started_at), Date.parse(r.completed_at)];
    const validJob = (r, attempt) =>
      Number.isSafeInteger(r.id) &&
      r.id > 0 &&
      r.run_id === context.runId &&
      r.run_attempt === attempt &&
      r.head_sha === context.sourceSha &&
      r.head_branch === ref.slice(10) &&
      Array.isArray(r.steps) &&
      r.steps.length > 0 &&
      r.steps.length <= 100 &&
      times(r).every(Number.isFinite) &&
      times(r)[0] <= times(r)[1];
    if (
      run.conclusion !== "failure" ||
      originalVerify.length !== 1 ||
      originalVerify[0].status !== "completed" ||
      originalVerify[0].conclusion !== "failure" ||
      !validJob(originalVerify[0], context.runAttempt) ||
      publicationNames.some((name) => {
        const r = rows.find((r) => r.name === name);
        return (
          !validJob(r, context.runAttempt) ||
          times(r)[1] > times(originalVerify[0])[0]
        );
      })
    )
      reject("publication-recovery-mismatch");
    const recovered = await reader.json(
      `${base}/actions/runs/${context.runId}`,
    );
    verificationAttempt = context.runAttempt + 1;
    validRun(recovered, verificationAttempt);
    if (recovered.conclusion !== "success")
      reject("publication-verification-incomplete");
    const recovery = { ...context, runAttempt: verificationAttempt };
    const actual = await reader.json(
      `${base}/actions/runs/${context.runId}/attempts/${verificationAttempt}`,
    );
    validRun(actual, verificationAttempt);
    if (actual.conclusion !== "success")
      reject("publication-verification-incomplete");
    const recoveredJobs = await jobs(reader, base, recovery);
    requireJobs(recoveredJobs, [...publicationNames, policy.verifyJob]);
    for (const name of publicationNames) {
      const original = rows.find((r) => r.name === name);
      const projected = recoveredJobs.find((r) => r.name === name);
      if (
        !validJob(projected, verificationAttempt) ||
        projected.started_at !== original.started_at ||
        projected.completed_at !== original.completed_at ||
        !isDeepStrictEqual(projected.steps, original.steps)
      )
        reject("publication-recovery-mismatch");
    }
    const verified = recoveredJobs.find((r) => r.name === policy.verifyJob);
    if (
      !validJob(verified, verificationAttempt) ||
      verified.id === originalVerify[0].id ||
      times(verified)[0] <= times(originalVerify[0])[1]
    )
      reject("publication-recovery-mismatch");
  }
  const artifacts = list(
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
  if (matches.length !== 1) reject("publication-artifact-unknown");
  const artifact = matches[0],
    prepare = rows.find((r) => r.name === policy.prepareJob);
  const created = Date.parse(artifact.created_at);
  if (
    !Number.isSafeInteger(artifact.id) ||
    artifact.id <= 0 ||
    !/^sha256:[a-f0-9]{64}$/.test(artifact.digest ?? "") ||
    artifact.size_in_bytes <= 0 ||
    artifact.size_in_bytes > limits.artifact ||
    artifact.workflow_run?.id !== context.runId ||
    artifact.workflow_run.head_sha !== context.sourceSha ||
    artifact.workflow_run.repository_id !== info.id ||
    artifact.workflow_run.head_repository_id !== info.id ||
    !Number.isFinite(created) ||
    !(
      created >= Date.parse(prepare.started_at) &&
      created <= Date.parse(prepare.completed_at)
    )
  )
    reject("publication-artifact-mismatch");
  const archive = await reader.bytes(
    `${base}/actions/artifacts/${artifact.id}/zip`,
    limits.artifact,
    true,
  );
  if (
    archive.length !== artifact.size_in_bytes ||
    "sha256:" + hash(archive) !== artifact.digest
  )
    reject("publication-artifact-mismatch");
  const paths = [
    policy.manifest,
    ...cohort.map((p) => `lapismd-${p.directory}-${p.version}.tgz`),
  ];
  const read = publicArtifact(archive, (name) => paths.includes(name));
  if (!isDeepStrictEqual([...read.paths].sort(), [...paths].sort())) reject();
  const manifestBytes = read(policy.manifest),
    manifest = JSON.parse(manifestBytes);
  if (
    !exact(manifest, ["source", "packages"]) ||
    manifest.source !== context.sourceSha ||
    !Array.isArray(manifest.packages) ||
    manifest.packages.length !== 2
  )
    reject("publication-manifest-mismatch");
  let selected;
  for (const [index, p] of cohort.entries()) {
    const entry = manifest.packages[index],
      tarball = paths[index + 1];
    if (
      !exact(entry, ["name", "version", "tarball", "integrity"]) ||
      entry.name !== p.name ||
      entry.version !== p.version ||
      entry.tarball !== tarball
    )
      reject("publication-manifest-mismatch");
    const published =
      p.name === metadata.name
        ? metadata
        : await reader.json(
            `https://registry.npmjs.org/${encodeURIComponent(p.name)}/${p.version}`,
          );
    const bytes = read(tarball, limits.tarball);
    if (
      published.name !== p.name ||
      published.version !== p.version ||
      contractDigest(published) !== p.contractSha256 ||
      entry.integrity !== published.dist?.integrity ||
      "sha512-" + createHash("sha512").update(bytes).digest("base64") !==
        entry.integrity ||
      !(
        await reader.bytes(publishedTarballUrl(published), limits.tarball)
      ).equals(bytes)
    )
      reject("publication-tarball-mismatch");
    if (p.name === metadata.name)
      selected = {
        id: artifact.id,
        sha256: hash(archive),
        manifestSha256: hash(manifestBytes),
        tarballSha256: hash(bytes),
      };
  }
  return {
    artifact: selected,
    verification: {
      runId: context.runId,
      runAttempt: verificationAttempt,
      ...selected,
    },
    ...(await verifySourceContract(
      reader,
      base,
      context,
      info,
      metadata,
      owner,
    )),
  };
}
