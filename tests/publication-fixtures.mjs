import {
  contractDigest,
  dependencyContractDigest,
} from "../src/publication-evidence.mjs";

// Synthetic normalized receipts model the trusted observer output for pure
// planner tests. Real cryptographic acceptance is tested with public fixtures.
export function observedPublication(
  repo,
  metadata,
  manifest = repo.manifests[0].manifest,
) {
  metadata.integrity = "sha512-" + Buffer.alloc(64, 1).toString("base64");
  metadata.publication = {
    schemaVersion: 1,
    state: "verified",
    reason: "verified-publication",
    channel: {
      policy: "latest",
      admitted: true,
      latest: manifest.version,
      tags: ["latest"],
    },
    currentSourceSha: repo.sourceSha,
    currentContractSha256: contractDigest(manifest),
    matchesCurrentContract: true,
    proof: {
      repository: repo.repository,
      repositoryId: 1,
      sourceSha: repo.sourceSha,
      workflow: ".github/workflows/release.yml",
      ref: "refs/heads/main",
      runId: 1,
      runAttempt: 1,
      attestationSha256: "c".repeat(64),
      subjectSha512: Buffer.alloc(64, 1).toString("hex"),
      toolSha256: "c".repeat(64),
      sourceContractSha256: contractDigest(manifest),
      dependencyContractSha256: dependencyContractDigest(metadata),
      sourceCiSha256: "c".repeat(64),
      artifact: {
        id: 1,
        sha256: "c".repeat(64),
        manifestSha256: "c".repeat(64),
        tarballSha256: "c".repeat(64),
      },
      verification: {
        runId: 2,
        runAttempt: 1,
        id: 2,
        sha256: "c".repeat(64),
        manifestSha256: "c".repeat(64),
        tarballSha256: "c".repeat(64),
      },
    },
  };
  return metadata;
}
