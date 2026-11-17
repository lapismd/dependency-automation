import { readFile } from "node:fs/promises";
import semver from "semver";
import {
  verifyStaticPublisherSource,
  validateStaticPublisher,
} from "./publication-static.mjs";
import { stableVersions } from "./policy.mjs";
import { loadPublicationVerifier, hash } from "./publication-tool.mjs";
import {
  publicationReader,
  limits,
  staticPublicationLimits,
} from "./publication-transport.mjs";
import {
  contractDigest,
  dependencyContractDigest,
  verifyAttestations,
  inspectAttestationClaims,
} from "./publication-evidence.mjs";
import {
  verifyPublisherSource,
  publishedTarballUrl,
} from "./publication-source.mjs";

const digest = (v) => /^[a-f0-9]{64}$/.test(v ?? "");
const sha = (v) => /^[a-f0-9]{40}$/.test(v ?? "");
const positive = (v) => Number.isSafeInteger(v) && v > 0;
const keys = (v, allowed) =>
  v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).every((k) => allowed.includes(k));
const fail = () => {
  throw Error("Invalid publication evidence");
};

export async function loadPublicationPolicy(entries = undefined) {
  entries ??= JSON.parse(
    await readFile(
      new URL("../config/repositories.json", import.meta.url),
      "utf8",
    ),
  ).repositories;
  const p = JSON.parse(
    await readFile(
      new URL("../config/publications.json", import.meta.url),
      "utf8",
    ),
  );
  if (
    !keys(p, ["schemaVersion", "tool", "publishers"]) ||
    p.schemaVersion !== 1 ||
    !keys(p.tool, ["node", "gh", "sha256", "trustSeedSha256", "setupRef"]) ||
    p.tool.node !== "24.15.0" ||
    p.tool.gh !== "2.102.0" ||
    !digest(p.tool.sha256) ||
    !digest(p.tool.trustSeedSha256) ||
    !sha(p.tool.setupRef)
  )
    fail();
  for (const [repository, policy] of Object.entries(p.publishers ?? {})) {
    if (policy.kind === "plugins-static-v1") {
      validateStaticPublisher(repository, policy, entries);
      continue;
    }
    if (
      !entries.some((e) => e.repository === repository) ||
      !keys(policy, [
        "workflowId",
        "workflow",
        "ref",
        "event",
        "environment",
        "artifactPrefix",
        "manifest",
        "prepareJob",
        "qualificationJob",
        "publishJob",
        "verifyJob",
        "releaseJob",
      ]) ||
      !positive(policy.workflowId) ||
      policy.workflow !== ".github/workflows/release.yml" ||
      policy.ref !== "refs/heads/main" ||
      policy.event !== "workflow_dispatch" ||
      policy.environment !== "npm-production" ||
      !/^[a-z0-9-]+-$/.test(policy.artifactPrefix ?? "") ||
      policy.manifest !== "release-manifest.json" ||
      [
        "prepareJob",
        "qualificationJob",
        "publishJob",
        "verifyJob",
        "releaseJob",
      ].some(
        (k) =>
          typeof policy[k] !== "string" || !policy[k] || policy[k].length > 128,
      )
    )
      fail();
  }
  return p;
}

export function publicationChannel(version, metadata) {
  return {
    policy: "latest",
    admitted: stableVersions(metadata).includes(version),
    latest: semver.valid(metadata["dist-tags"]?.latest) ?? null,
    tags: ["latest", "next"].filter(
      (tag) => metadata["dist-tags"]?.[tag] === version,
    ),
  };
}

export function validatePublicationEvidence(p) {
  if (
    !keys(p, [
      "schemaVersion",
      "state",
      "reason",
      "channel",
      "currentSourceSha",
      "currentContractSha256",
      "matchesCurrentContract",
      "proof",
    ]) ||
    p.schemaVersion !== 1 ||
    !["verified", "unknown", "unpublished"].includes(p.state) ||
    !/^[a-z-]+$/.test(p.reason ?? "") ||
    !keys(p.channel, ["policy", "admitted", "latest", "tags"]) ||
    p.channel.policy !== "latest" ||
    typeof p.channel.admitted !== "boolean" ||
    !(p.channel.latest === null || semver.valid(p.channel.latest)) ||
    !Array.isArray(p.channel.tags) ||
    p.channel.tags.length > 2 ||
    p.channel.tags.some((t) => !["latest", "next"].includes(t)) ||
    !sha(p.currentSourceSha) ||
    !digest(p.currentContractSha256) ||
    typeof p.matchesCurrentContract !== "boolean"
  )
    fail();
  if (p.state !== "verified") {
    if (p.proof !== undefined || p.matchesCurrentContract) fail();
    return p;
  }
  const proof = p.proof;
  if (
    !keys(proof, [
      "repository",
      "sourceSha",
      "repositoryId",
      "workflow",
      "ref",
      "runId",
      "runAttempt",
      "attestationSha256",
      "subjectSha512",
      "toolSha256",
      "artifact",
      "verification",
      "sourceContractSha256",
      "sourceCiSha256",
      "dependencyContractSha256",
    ]) ||
    !/^(?:lapismd|stevejuma)\/[\w.-]+$/.test(proof.repository ?? "") ||
    !sha(proof.sourceSha) ||
    !positive(proof.repositoryId) ||
    proof.workflow !== ".github/workflows/release.yml" ||
    proof.ref !== "refs/heads/main" ||
    !positive(proof.runId) ||
    !positive(proof.runAttempt) ||
    !/^[a-f0-9]{128}$/.test(proof.subjectSha512 ?? "") ||
    [
      "attestationSha256",
      "toolSha256",
      "sourceContractSha256",
      "sourceCiSha256",
      "dependencyContractSha256",
    ].some((k) => !digest(proof[k])) ||
    p.matchesCurrentContract !==
      (p.currentContractSha256 === proof.sourceContractSha256)
  )
    fail();
  for (const [name, receipt] of [
    ["artifact", proof.artifact],
    ["verification", proof.verification],
  ])
    if (
      !keys(
        receipt,
        name === "artifact"
          ? ["id", "sha256", "manifestSha256", "tarballSha256"]
          : [
              "id",
              "sha256",
              "manifestSha256",
              "tarballSha256",
              "runId",
              "runAttempt",
            ],
      ) ||
      !positive(receipt.id) ||
      ["sha256", "manifestSha256", "tarballSha256"].some(
        (k) => !digest(receipt[k]),
      ) ||
      (name === "verification" &&
        (!positive(receipt.runId) || !positive(receipt.runAttempt)))
    )
      fail();
  if (proof.artifact.tarballSha256 !== proof.verification.tarballSha256) fail();
  return p;
}

export function verifiedPublication(metadata, repo, manifest) {
  try {
    const p = validatePublicationEvidence(metadata?.publication);
    return (
      p.state === "verified" &&
      p.proof.repository === repo.repository &&
      p.currentSourceSha === repo.sourceSha &&
      p.currentContractSha256 === contractDigest(manifest) &&
      p.matchesCurrentContract &&
      p.proof.dependencyContractSha256 === dependencyContractDigest(metadata) &&
      Buffer.from(p.proof.subjectSha512, "hex").toString("base64") ===
        metadata.integrity?.slice(7)
    );
  } catch {
    return false;
  }
}

export async function observePublications(
  packages,
  registry,
  repositories,
  entries,
  options = {},
) {
  const policy = await loadPublicationPolicy(),
    reader = publicationReader({
      ...options,
      token: options.publicationToken || options.token,
    });
  let tool;
  const verifier = () => (tool ??= loadPublicationVerifier(policy.tool));
  const observations = new Map();
  let versions = 0;
  const current = [],
    remaining = [];
  for (const owner of packages) {
    if (options.excludedPackages?.includes(owner.name)) continue;
    const repo = repositories.find((r) => r.repository === owner.repository);
    if (repo.visibility !== "public") continue;
    const metadata = registry.get(owner.name) ?? { versions: {} };
    const seen = new Set(
      [
        owner.manifest.version,
        metadata["dist-tags"]?.latest,
        metadata["dist-tags"]?.next,
        ...(options.publicationVersions?.[owner.name] ?? []).slice(0, 16),
      ].filter((v) => semver.valid(v)),
    );
    for (const version of seen) {
      (version === owner.manifest.version ? current : remaining).push({
        owner,
        repo,
        metadata,
        version,
      });
    }
  }
  for (const { owner, repo, metadata, version } of [...current, ...remaining]) {
    const evidence = {
      schemaVersion: 1,
      state: "unknown",
      reason: "provenance-unknown",
      channel: publicationChannel(version, metadata),
      currentSourceSha: repo.sourceSha,
      currentContractSha256: contractDigest(owner.manifest),
      matchesCurrentContract: false,
    };
    const record = metadata.versions?.[version];
    try {
      if (++versions > 128) throw Error("publication-version-limit");
      if (!record) {
        evidence.state = "unpublished";
        throw Error("registry-version-unpublished");
      }
      const publisher = policy.publishers[owner.repository];
      if (!publisher) throw Error("publisher-contract-unreviewed");
      if (
        record.name !== owner.name ||
        record.version !== version ||
        !record.dist?.attestations?.url ||
        record.dist.attestations.provenance?.predicateType !==
          "https://slsa.dev/provenance/v1"
      )
        throw Error("provenance-unknown");
      const url = new URL(record.dist.attestations.url);
      if (
        url.origin !== "https://registry.npmjs.org" ||
        decodeURIComponent(url.pathname) !==
          `/-/npm/v1/attestations/${owner.name}@${version}` ||
        url.search ||
        url.hash ||
        url.username ||
        url.password
      )
        throw Error("publication-url-rejected");
      const info = await reader.json(
        `https://api.github.com/repos/${owner.repository}`,
      );
      if (
        info.full_name !== owner.repository ||
        !positive(info.id) ||
        !positive(info.owner?.id) ||
        info.private !== false ||
        info.visibility !== "public" ||
        info.archived !== false ||
        info.fork !== false ||
        info.default_branch !== "main"
      )
        throw Error("publication-source-not-public");
      const body = await reader.json(url.href, 256 * 1024);
      inspectAttestationClaims(body, record, publisher, info);
      const artifactBytes = await reader.bytes(
        publishedTarballUrl(record),
        publisher.kind === "plugins-static-v1"
          ? staticPublicationLimits.tarball
          : limits.tarball,
      );
      const context = await verifyAttestations(
        body,
        record,
        publisher,
        info,
        await verifier(),
        artifactBytes,
      );
      const source = await (
        publisher.kind === "plugins-static-v1"
          ? verifyStaticPublisherSource
          : verifyPublisherSource
      )(reader, context, publisher, info, record, {
        ...owner,
        sourceSha: repo.sourceSha,
      });
      evidence.state = "verified";
      evidence.reason = "verified-publication";
      evidence.matchesCurrentContract =
        evidence.currentContractSha256 === source.sourceContractSha256;
      evidence.proof = {
        repository: owner.repository,
        ...context,
        workflow: publisher.workflow,
        ref: publisher.ref,
        toolSha256: hash(JSON.stringify(policy.tool)),
        ...source,
      };
    } catch (error) {
      evidence.reason = /^[a-z-]+$/.test(error.message ?? "")
        ? error.message
        : "provenance-unknown";
    }
    observations.set(
      `${owner.name}@${version}`,
      validatePublicationEvidence(evidence),
    );
  }
  return { observations, counts: reader.counts() };
}
