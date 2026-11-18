import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import YAML from "yaml";
import {
  projectionRepository,
  projectionDependency,
  projectionPath,
  projectionHash,
  parseProjectionDescriptor,
} from "./artifact-projection.mjs";

export function projectionCapabilities(
  bytes = readFileSync(
    new URL("../config/artifact-projections.json", import.meta.url),
    "utf8",
  ),
) {
  if (typeof bytes !== "string" || Buffer.byteLength(bytes) > 8192)
    throw Error("Invalid trusted artifact projection capabilities");
  if (YAML.parseDocument(bytes).errors.length)
    throw Error("Invalid trusted artifact projection capabilities");
  const policy = JSON.parse(bytes);
  if (
    Buffer.byteLength(bytes) > 8192 ||
    !isDeepStrictEqual(Object.keys(policy).sort(), [
      "repositories",
      "schemaVersion",
    ]) ||
    policy.schemaVersion !== 1 ||
    !policy.repositories ||
    Array.isArray(policy.repositories) ||
    typeof policy.repositories !== "object" ||
    Object.entries(policy.repositories).some(
      ([repo, hash]) =>
        repo !== projectionRepository || !/^[a-f0-9]{64}$/.test(hash),
    )
  )
    throw Error("Invalid trusted artifact projection capabilities");
  return { policy, sha256: projectionHash(bytes) };
}

export function configuredProjection(
  repo,
  capabilities = projectionCapabilities(),
) {
  const expected = capabilities.policy.repositories[repo.repository];
  if (!expected) return null;
  const source = repo.artifactProjection;
  if (
    repo.repository !== projectionRepository ||
    !repo.paths?.includes(projectionPath) ||
    !source ||
    source.sha256 !== expected ||
    projectionHash(source.bytes) !== expected ||
    !isDeepStrictEqual(JSON.parse(source.bytes), source.descriptor)
  )
    throw Error("Artifact projection held: missing or stale source opt-in");
  parseProjectionDescriptor(source.bytes, source.inputs);
  return { descriptorSha256: expected, capabilitySha256: capabilities.sha256 };
}

export function projectionRegexManager() {
  return {
    customType: "regex",
    managerFilePatterns: ["/^package\\.json$/"],
    matchStringsStrategy: "recursive",
    matchStrings: [
      '"devDependencies"\\s*:\\s*\\{[^}]*\\}',
      '"@lapismd/spec-validator"\\s*:\\s*"(?<currentValue>[0-9]+\\.[0-9]+\\.[0-9]+)"',
    ],
    depNameTemplate: projectionDependency,
    packageNameTemplate: projectionDependency,
    datasourceTemplate: "npm",
    depTypeTemplate: "devDependencies",
    versioningTemplate: "semver",
    registryUrlTemplate: "https://registry.npmjs.org",
  };
}
