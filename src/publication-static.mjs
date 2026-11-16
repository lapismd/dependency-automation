import { createHash, createPublicKey, verify } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { hash } from "./publication-tool.mjs";
import {
  publicArtifact,
  staticPublicationLimits,
} from "./publication-transport.mjs";
import {
  validRun,
  jobs,
  requireJobs,
  verifySourceContract,
  publishedTarballUrl,
} from "./publication-source.mjs";
const fail = (reason = "publication-static-mismatch") => {
  throw Error(reason);
};
const exact = (v, keys) =>
  v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  isDeepStrictEqual(Object.keys(v).sort(), [...keys].sort());
export const staticArtifactLimit = staticPublicationLimits.artifact;
export function validateStaticPublisher(repository, p, entries) {
  if (
    repository !== "lapismd/lapis-plugins" ||
    !entries.some((e) => e.repository === repository) ||
    !exact(p, [
      "kind",
      "workflowId",
      "workflow",
      "ref",
      "event",
      "environment",
      "artifactPrefix",
      "qualificationJob",
      "publishJob",
      "keyId",
      "publicKey",
    ]) ||
    p.kind !== "plugins-static-v1" ||
    p.workflowId !== 344819974 ||
    p.workflow !== ".github/workflows/release.yml" ||
    p.ref !== "refs/heads/main" ||
    p.event !== "workflow_dispatch" ||
    p.environment !== "first-publication" ||
    p.artifactPrefix !== "signed-static-candidate-" ||
    p.qualificationJob !== "validate / validate" ||
    p.publishJob !== "static-publish" ||
    p.keyId !== "lapis-plugin-release-2026-06" ||
    p.publicKey !== "bMPnlO7b+Xtthfk5wGUQAWWUV7NuIAhED4kX2EGzJqc="
  )
    fail("Invalid static publisher policy");
  return p;
}
const canonical = (v) =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, canonical(v[k])]),
        )
      : v;
export function staticBundle(bytes, entry, policy, context) {
  const read = publicArtifact(bytes),
    env = JSON.parse(read("release.signed.json", 256 * 1024)),
    signed = env.signed,
    sig = env.signatures;
  if (
    sig?.length !== 1 ||
    sig[0].alg !== "ed25519" ||
    sig[0].keyId !== policy.keyId ||
    signed?.type !== "lapis.plugin.release" ||
    signed.schemaVersion !== 1 ||
    signed.pluginId !== entry.pluginId ||
    signed.version !== entry.version ||
    signed.source?.commit !== context.sourceSha ||
    signed.source?.package !== entry.packageName ||
    signed.channel !== "official"
  )
    fail();
  const key = createPublicKey({
    key: Buffer.concat([
      Buffer.from("302a300506032b6570032100", "hex"),
      Buffer.from(policy.publicKey, "base64"),
    ]),
    format: "der",
    type: "spki",
  });
  if (
    !verify(
      null,
      Buffer.from(JSON.stringify(canonical(signed))),
      key,
      Buffer.from(sig[0].sig, "base64"),
    )
  )
    fail("publication-plugin-signature-mismatch");
  if (
    !Array.isArray(signed.files) ||
    signed.files.length > 512 ||
    !isDeepStrictEqual(read.paths, [
      "release.signed.json",
      ...signed.files.map((f) => f.path),
    ]) ||
    !isDeepStrictEqual(
      signed.files.map((f) => f.path),
      signed.files.map((f) => f.path).sort((a, b) => a.localeCompare(b)),
    )
  )
    fail();
  for (const file of signed.files) {
    const raw = read(file.path, staticPublicationLimits.file);
    if (raw.length !== file.size || hash(raw) !== file.sha256) fail();
  }
  const manifest = JSON.parse(read("manifest.json"));
  if (
    manifest.id !== entry.pluginId ||
    manifest.version !== entry.version ||
    signed.runtime?.entries?.workspace?.path !== "main.mjs" ||
    !read.paths.includes("main.mjs") ||
    !read.paths.includes("styles.css")
  )
    fail();
}
export function staticCandidate(bytes, metadata, owner, policy, context) {
  const read = publicArtifact(
    bytes,
    (n) =>
      n === "release-plan.json" ||
      n === "npm/manifest.json" ||
      /^npm\/[A-Za-z0-9._-]+\.tgz(?:\.sha256)?$/.test(n) ||
      /^plugins\/[a-z0-9.-]+\/[a-z0-9.-]+\.lapis-plugin(?:\.sha256)?$/.test(n),
    staticArtifactLimit,
    "plugins-static-v1",
  );
  const planBytes = read("release-plan.json"),
    plan = JSON.parse(planBytes),
    manifestBytes = read("npm/manifest.json"),
    manifest = JSON.parse(manifestBytes);
  if (
    !exact(plan, [
      "schemaVersion",
      "production",
      "generatedFrom",
      "releases",
    ]) ||
    plan.schemaVersion !== 1 ||
    plan.production !== true ||
    plan.generatedFrom !== context.sourceSha ||
    !Array.isArray(plan.releases) ||
    !plan.releases.length ||
    plan.releases.length > 17 ||
    !Array.isArray(manifest) ||
    manifest.length > 17
  )
    fail();
  const selected = plan.releases.filter(
      (p) => p.packageName === metadata.name && p.version === metadata.version,
    ),
    packed = manifest.filter(
      (p) => p.packageName === metadata.name && p.version === metadata.version,
    );
  if (selected.length !== 1 || packed.length !== 1) fail();
  const entry = selected[0],
    npm = packed[0],
    dir = /^packages\/([a-z0-9-]+)\/package\.json$/.exec(owner.path ?? "")?.[1],
    pluginId = owner.pluginId;
  const tarball = `.release/npm/${metadata.name.replace("@", "").replace("/", "-")}-${metadata.version}.tgz`,
    bundle = `.release/plugins/${pluginId}-${metadata.version}/${pluginId}-${metadata.version}.lapis-plugin`;
  if (
    !dir ||
    !/^[a-z0-9][a-z0-9.-]{0,127}$/.test(pluginId ?? "") ||
    entry.repository !== "lapismd/lapis-plugins" ||
    entry.sourceCommit !== context.sourceSha ||
    entry.trust !== "static-ed25519" ||
    entry.signingKeyId !== policy.keyId ||
    entry.pluginId !== pluginId ||
    entry.releaseTag !== `${dir}@${metadata.version}` ||
    entry.assetName !== `${pluginId}-${metadata.version}.lapis-plugin` ||
    entry.npm?.path !== tarball ||
    npm.tarball !== tarball ||
    npm.pluginId !== pluginId ||
    entry.npm.sha256 !== npm.sha256 ||
    entry.bundle?.path !== bundle ||
    entry.bundle.checksumPath !== bundle + ".sha256"
  )
    fail();
  const raw = read(
    tarball.slice(".release/".length),
    staticPublicationLimits.tarball,
  );
  if (
    raw.length !== entry.npm.size ||
    hash(raw) !== entry.npm.sha256 ||
    "sha512-" + createHash("sha512").update(raw).digest("base64") !==
      metadata.dist.integrity
  )
    fail("publication-tarball-mismatch");
  const plugin = read(
    bundle.slice(".release/".length),
    staticPublicationLimits.bundle,
  );
  if (
    plugin.length !== entry.bundle.size ||
    hash(plugin) !== entry.bundle.sha256
  )
    fail();
  staticBundle(plugin, entry, policy, context);
  return {
    tarball: raw,
    manifestSha256: hash(Buffer.concat([planBytes, manifestBytes])),
    tarballSha256: hash(raw),
  };
}
export async function verifyStaticPublisherSource(
  reader,
  context,
  policy,
  info,
  metadata,
  owner,
) {
  if (
    info.full_name !== "lapismd/lapis-plugins" ||
    !/^packages\/[a-z0-9-]+\/package\.json$/.test(owner.path ?? "")
  )
    fail();
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
  if (origin.conclusion !== "success")
    fail("publication-verification-incomplete");
  const rows = await jobs(reader, base, context);
  requireJobs(rows, [
    "selection",
    policy.qualificationJob,
    "validate / release-artifacts",
    policy.publishJob,
  ]);
  const publish = rows.find((r) => r.name === policy.publishJob),
    steps = publish.steps;
  const requireStep = (name) => {
    const selected = steps?.filter((s) => s.name === name);
    if (
      selected?.length !== 1 ||
      selected[0].status !== "completed" ||
      selected[0].conclusion !== "success"
    )
      fail("publication-verification-incomplete");
    return selected[0];
  };
  const qualify = requireStep(
      "Validate selected source and every shared release gate",
    ),
    prepare = requireStep("Prepare signed static candidates"),
    write = requireStep(
      "Skip published npm versions and create missing GitHub releases",
    );
  if (
    !(
      Date.parse(qualify.completed_at) <= Date.parse(prepare.started_at) &&
      Date.parse(prepare.completed_at) <= Date.parse(write.started_at)
    )
  )
    fail();
  const result = await reader.json(
    `${base}/actions/runs/${context.runId}/artifacts?per_page=100`,
  );
  if (
    !Array.isArray(result.artifacts) ||
    result.artifacts.length !== result.total_count ||
    result.artifacts.length > 100
  )
    fail("publication-coverage-incomplete");
  const candidates = result.artifacts.filter(
    (a) =>
      a.name ===
        policy.artifactPrefix + context.runId + "-" + context.runAttempt &&
      a.expired === false,
  );
  if (candidates.length !== 1) fail("publication-artifact-unknown");
  const a = candidates[0],
    created = Date.parse(a.created_at);
  if (
    !Number.isSafeInteger(a.size_in_bytes) ||
    a.size_in_bytes <= 0 ||
    a.size_in_bytes > staticArtifactLimit
  )
    fail("publication-artifact-size-limit");
  if (
    !Number.isSafeInteger(a.id) ||
    a.id <= 0 ||
    !/^sha256:[a-f0-9]{64}$/.test(a.digest ?? "") ||
    a.workflow_run?.id !== context.runId ||
    a.workflow_run.head_sha !== context.sourceSha ||
    a.workflow_run.repository_id !== context.repositoryId ||
    a.workflow_run.head_repository_id !== context.repositoryId ||
    !(
      created >= Date.parse(prepare.started_at) &&
      created <= Date.parse(write.started_at)
    )
  )
    fail("publication-artifact-mismatch");
  const bytes = await reader.bytes(
    `${base}/actions/artifacts/${a.id}/zip`,
    staticArtifactLimit,
    true,
  );
  if (bytes.length !== a.size_in_bytes || "sha256:" + hash(bytes) !== a.digest)
    fail("publication-artifact-mismatch");
  const manifestPath = owner.path.replace(/package\.json$/, "manifest.json"),
    sourceManifest = await reader.json(
      `${base}/contents/${manifestPath}?ref=${context.sourceSha}`,
      256 * 1024,
    );
  if (
    sourceManifest.type !== "file" ||
    sourceManifest.path !== manifestPath ||
    sourceManifest.encoding !== "base64" ||
    typeof sourceManifest.content !== "string" ||
    sourceManifest.content.length > 128 * 1024
  )
    fail("publication-plugin-source-unknown");
  const runtime = JSON.parse(
    Buffer.from(sourceManifest.content, "base64").toString("utf8"),
  );
  if (
    !/^[a-z0-9][a-z0-9.-]{0,127}$/.test(runtime.id ?? "") ||
    runtime.version !== metadata.version
  )
    fail("publication-plugin-source-mismatch");
  const candidate = staticCandidate(
      bytes,
      metadata,
      { ...owner, pluginId: runtime.id },
      policy,
      context,
    ),
    published = await reader.bytes(
      publishedTarballUrl(metadata),
      staticPublicationLimits.tarball,
    );
  if (!published.equals(candidate.tarball))
    fail("publication-tarball-mismatch");
  const artifact = {
    id: a.id,
    sha256: hash(bytes),
    manifestSha256: candidate.manifestSha256,
    tarballSha256: candidate.tarballSha256,
  };
  return {
    artifact,
    verification: {
      ...artifact,
      runId: context.runId,
      runAttempt: context.runAttempt,
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
