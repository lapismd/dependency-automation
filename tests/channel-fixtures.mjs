import { loadChannelPolicy, channelPolicyDigest } from "../src/channels.mjs";
import { dependencies } from "../src/policy.mjs";
import { observedPublication } from "./publication-fixtures.mjs";
export const sha = "a".repeat(40),
  revision = "b".repeat(40);
export const options = {
  policyRevision: revision,
  botLogin: "dependency[bot]",
  botAuthor: "Bot <bot@example.com>",
  phase: "pilot",
  writes: false,
  now: "2026-11-16T12:00:00Z",
};
const evidence = () => ({
  sha,
  expected: [1],
  runs: [
    {
      head_sha: sha,
      workflow_id: 1,
      run_number: 1,
      run_attempt: 1,
      event: "push",
      status: "completed",
      conclusion: "success",
    },
  ],
  checks: [],
  statuses: [],
  prs: [],
  orphanBranches: [],
});
export function channelFixture() {
  const policy = loadChannelPolicy();
  const notes = {
    repository: "lapismd/lapis-notes",
    visibility: "public",
    sourceSha: sha,
    phase: "pilot",
    workspace: {},
    nonPortable: [],
    manifests: [],
    lock: { importers: {} },
    paths: [],
    evidence: evidence(),
  };
  const registry = {
    "@lapismd/design-core": { "0.13.4": { integrity: "stable" } },
  };
  const available = { "@lapismd/design-core": ["0.13.4"] };
  const stableCandidates = structuredClone(available);
  for (const pin of policy.cohort.packages) {
    const dir = pin.name.split("/")[1];
    const manifest = {
      name: pin.name,
      version: pin.version,
      dependencies: { "@lapismd/design-core": "^0.13.4" },
    };
    notes.manifests.push({ path: `packages/${dir}/package.json`, manifest });
    notes.paths.push(`packages/${dir}/package.json`);
    notes.lock.importers[`packages/${dir}`] = {
      dependencies: { "@lapismd/design-core": { version: "0.13.4" } },
    };
    const m = observedPublication(
      notes,
      { dependencies: manifest.dependencies },
      manifest,
    );
    m.integrity = pin.integrity;
    m.publication.proof.subjectSha512 = Buffer.from(
      pin.integrity.slice(7),
      "base64",
    ).toString("hex");
    m.publication.proof.sourceSha = pin.sourceSha;
    m.publication.channel = {
      policy: "latest",
      admitted: false,
      latest: "0.1.0",
      tags: ["next"],
    };
    registry[pin.name] = { "0.1.0": { integrity: "old" }, [pin.version]: m };
    available[pin.name] = ["0.1.0"];
    stableCandidates[pin.name] = ["0.1.0"];
  }
  const plugin = {
    repository: "lapismd/lapis-plugins",
    visibility: "public",
    sourceSha: sha,
    phase: "pilot",
    workspace: {},
    nonPortable: [],
    paths: ["package.json"],
    manifests: [
      {
        path: "package.json",
        manifest: {
          name: "plugins-test",
          private: true,
          devDependencies: Object.fromEntries(
            policy.cohort.packages.map((p) => [p.name, "0.1.0"]),
          ),
        },
      },
    ],
    lock: {
      importers: {
        ".": {
          devDependencies: Object.fromEntries(
            policy.cohort.packages.map((p) => [p.name, { version: "0.1.0" }]),
          ),
        },
      },
    },
    evidence: evidence(),
  };
  const repositories = [notes, plugin];
  const packages = notes.manifests.map((p) => ({
    name: p.manifest.name,
    manifest: p.manifest,
    repository: notes.repository,
    path: p.path,
  }));
  const edges = repositories.flatMap((r) =>
    r.manifests.flatMap((p) =>
      dependencies(p.manifest).map((e) => ({
        ...e,
        repository: r.repository,
        path: p.path,
        consumer: p.manifest.name,
      })),
    ),
  );
  return {
    schemaVersion: 1,
    coverage: [],
    excludedPackages: [],
    unpublished: [],
    cycles: [],
    repositories,
    packages,
    edges,
    registry,
    available,
    stableCandidates,
    channelPolicySha256: channelPolicyDigest(),
  };
}
