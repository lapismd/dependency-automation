import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import YAML from "yaml";
import { dependencies } from "../../src/policy.mjs";
import {
  immutableProjectionShape,
  projectionHash,
  projectionPath,
} from "../../src/artifact-projection.mjs";
import { projectionCapabilities } from "../../src/artifact-projection-policy.mjs";
import { intakeHash, intakePolicyPath } from "../../src/canonical-intake.mjs";

// Controlled opt-in over genuine historical SDK/lock bytes. CI/transport and
// unrelated registry availability are controls, not live Desktop qualification.
export function scopedSdkFixture() {
  const historical = JSON.parse(
    gunzipSync(
      readFileSync(
        new URL(
          "../fixtures/desktop-seeded-sdk-projection.json.gz",
          import.meta.url,
        ),
      ),
    ),
  ).historical;
  const inputs = structuredClone(historical.before),
    repository = "lapismd/lapis-desktop",
    sdk = "@lapismd/spec-validator",
    sourceSha = "a".repeat(40);
  const manifest = JSON.parse(inputs["package.json"]);
  const frozen = [
    "@lapismd/ai",
    "@lapis-notes/app-profile",
    "@lapis-notes/lapis-plugin-tasks",
  ];
  manifest.dependencies = Object.fromEntries(
    ["@lapismd/design-core", ...frozen].map((n) => [
      n,
      manifest.dependencies[n],
    ]),
  );
  manifest.devDependencies = {
    [sdk]: "0.2.0",
    "@lapis-notes/lapis-plugin-tasks":
      manifest.devDependencies["@lapis-notes/lapis-plugin-tasks"],
  };
  delete manifest.dependencies["@lapis-notes/lapis-plugin-tasks"];
  inputs["package.json"] = JSON.stringify(manifest);
  const workspace = YAML.parse(inputs["pnpm-workspace.yaml"]),
    lock = YAML.parse(inputs["pnpm-lock.yaml"]);
  workspace.overrides[sdk] = "0.2.0";
  lock.overrides[sdk] = "0.2.0";
  lock.importers["."].devDependencies[sdk].specifier = "0.2.0";
  inputs["pnpm-workspace.yaml"] = YAML.stringify(workspace);
  inputs["pnpm-lock.yaml"] = YAML.stringify(lock);
  const descriptor = {
      ...historical.descriptor,
      immutableShapeSha256: immutableProjectionShape(inputs),
    },
    bytes = JSON.stringify(descriptor),
    descriptorSha256 = projectionHash(bytes);
  const policy = {
      schemaVersion: 1,
      kind: "single-development-dependency",
      repository,
      dependency: sdk,
      slot: "validator-development",
      chapters: [
        "spec/src/current/governance.md",
        "spec/src/current/local-dependencies.md",
      ],
    },
    policyBytes = JSON.stringify(policy),
    policySha256 = intakeHash(policyBytes);
  const detail = {
    kind: "unpublished-registry",
    message:
      "package.json:dependencies:@lapismd/ai: unpublished registry dependency",
    path: "package.json",
    type: "dependencies",
    name: "@lapismd/ai",
    range: manifest.dependencies["@lapismd/ai"],
  };
  const repo = {
    repository,
    sourceSha,
    phase: "pilot",
    visibility: "public",
    packageManager: manifest.packageManager,
    paths: [
      "package.json",
      "pnpm-workspace.yaml",
      projectionPath,
      intakePolicyPath,
    ],
    manifests: [{ path: "package.json", manifest }],
    workspace,
    lock,
    nonPortable: [detail.message],
    nonPortableDetails: [detail],
    canonicalIntake: { policy, policyBytes, sha256: policySha256 },
    artifactProjection: { descriptor, bytes, sha256: descriptorSha256, inputs },
    evidence: {
      sha: sourceSha,
      expected: [1],
      runs: [
        {
          head_sha: sourceSha,
          workflow_id: 1,
          event: "push",
          run_number: 1,
          run_attempt: 1,
          status: "completed",
          conclusion: "success",
        },
      ],
      checks: [],
      statuses: [],
      prs: [],
      orphanBranches: [],
    },
  };
  const edges = dependencies(manifest, workspace).map((e) => ({
    ...e,
    repository,
    path: "package.json",
    consumer: manifest.name,
  }));
  const integrity = YAML.parse(historical.merged.outputs["pnpm-lock.yaml"])
    .packages[`${sdk}@0.2.1`].resolution.integrity;
  const core = "@lapismd/design-core";
  const graph = {
    repositories: [repo],
    packages: [],
    edges,
    cycles: [],
    coverage: [],
    unpublished: ["@lapismd/ai"],
    available: { [sdk]: ["0.2.1"], [core]: ["0.13.5"] },
    registry: {
      [sdk]: { "0.2.1": { integrity } },
      [core]: { "0.13.5": { integrity } },
    },
    excludedPackages: [],
  };
  const grant = {
    descriptorSha256,
    canonicalPolicySha256: policySha256,
    immutableShapeSha256: descriptor.immutableShapeSha256,
    frozenPrerequisites: frozen.map((name) => ({
      path: "package.json",
      type:
        name === "@lapis-notes/lapis-plugin-tasks"
          ? "devDependencies"
          : "dependencies",
      name,
    })),
  };
  const scopeBytes = JSON.stringify({
    schemaVersion: 1,
    repositories: { [repository]: grant },
  });
  const artifactCapabilities = projectionCapabilities(
    JSON.stringify({
      schemaVersion: 1,
      repositories: { [repository]: descriptorSha256 },
    }),
  );
  const options = {
    phase: "pilot",
    writes: false,
    policyRevision: "b".repeat(40),
    now: "2026-11-18T04:00:00Z",
    botLogin: "dependency[bot]",
    botAuthor: "Bot <bot@example.com>",
    scopedEligibility: scopeBytes,
    artifactCapabilities,
  };
  return { inputs, repo, graph, grant, options, sdk, frozen };
}
