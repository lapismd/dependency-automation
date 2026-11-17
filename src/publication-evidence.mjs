import { hash } from "./publication-tool.mjs";

export const contractFields = [
  "name",
  "version",
  "type",
  "main",
  "module",
  "types",
  "exports",
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
  "peerDependenciesMeta",
  "engines",
];
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k])]),
    );
  return value;
}
export function contractDigest(manifest) {
  return hash(
    JSON.stringify(
      canonical(
        Object.fromEntries(
          contractFields
            .filter((k) => manifest[k] !== undefined)
            .map((k) => [k, manifest[k]]),
        ),
      ),
    ),
  );
}
export function dependencyContractDigest(manifest) {
  return hash(
    JSON.stringify(
      canonical(
        Object.fromEntries(
          [
            "dependencies",
            "optionalDependencies",
            "peerDependencies",
            "peerDependenciesMeta",
          ]
            .filter((k) => manifest[k] !== undefined)
            .map((k) => [k, manifest[k]]),
        ),
      ),
    ),
  );
}
const fail = (reason) => {
  throw Error(reason);
};
const sha = (v) => /^[a-f0-9]{40}$/.test(v ?? "");
const positive = (v) => Number.isSafeInteger(v) && v > 0;
const predicate = "https://slsa.dev/provenance/v1";
const publishPredicate =
  "https://github.com/npm/attestation/tree/main/specs/publish/v0.1";
const escape = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function integrityDigest(integrity) {
  if (!/^sha512-[A-Za-z0-9+/]{86}==$/.test(integrity ?? ""))
    fail("provenance-unknown");
  const data = Buffer.from(integrity.slice(7), "base64");
  if (data.length !== 64 || "sha512-" + data.toString("base64") !== integrity)
    fail("provenance-unknown");
  return data.toString("hex");
}

// These untrusted claims may reject a download, but never qualify publication.
export function inspectAttestationClaims(body, metadata, policy, info) {
  if (Buffer.byteLength(JSON.stringify(body)) > 256 * 1024)
    fail("provenance-unknown");
  if (!Array.isArray(body.attestations) || body.attestations.length !== 2)
    fail("provenance-unknown");
  const provenance = body.attestations.find(
    (a) => a.predicateType === predicate,
  );
  const publish = body.attestations.find(
    (a) => a.predicateType === publishPredicate,
  );
  if (!provenance || !publish) fail("provenance-unknown");
  function statement(attestation) {
    const envelope = attestation.bundle?.dsseEnvelope;
    if (
      !Array.isArray(envelope?.signatures) ||
      envelope.signatures.length !== 1 ||
      !Array.isArray(attestation.bundle.verificationMaterial?.tlogEntries) ||
      attestation.bundle.verificationMaterial.tlogEntries.length !== 1
    )
      fail("provenance-unknown");
    const encoded = envelope.payload;
    if (
      typeof encoded !== "string" ||
      encoded.length > 256 * 1024 ||
      attestation.bundle.dsseEnvelope.payloadType !==
        "application/vnd.in-toto+json"
    )
      fail("provenance-unknown");
    const value = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    const subject = value.subject;
    if (
      value.predicateType !== attestation.predicateType ||
      !Array.isArray(subject) ||
      subject.length !== 1 ||
      subject[0].name !==
        `pkg:npm/${metadata.name.replace("@", "%40")}@${metadata.version}` ||
      subject[0].digest?.sha512 !== integrityDigest(metadata.dist.integrity) ||
      Object.keys(subject[0].digest).length !== 1
    )
      fail("publication-subject-mismatch");
    return value;
  }
  const prov = statement(provenance),
    pub = statement(publish);
  if (
    prov._type !== "https://in-toto.io/Statement/v1" ||
    pub._type !== "https://in-toto.io/Statement/v0.1" ||
    pub.predicate?.name !== metadata.name ||
    pub.predicate?.version !== metadata.version ||
    pub.predicate?.registry !== "https://registry.npmjs.org"
  )
    fail("publication-subject-mismatch");
  const definition = prov.predicate?.buildDefinition,
    run = prov.predicate?.runDetails;
  const source = definition?.resolvedDependencies;
  const repositoryUrl = `https://github.com/${info.full_name}`;
  const workflow = `${repositoryUrl}/${policy.workflow}@${policy.ref}`;
  const invocation = run?.metadata?.invocationId;
  const match = new RegExp(
    `^${escape(repositoryUrl)}/actions/runs/([1-9][0-9]{0,15})/attempts/([1-9][0-9]{0,3})$`,
  ).exec(invocation ?? "");
  if (
    definition?.buildType !==
      "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1" ||
    run?.builder?.id !== "https://github.com/actions/runner/github-hosted" ||
    JSON.stringify(definition.externalParameters?.workflow) !==
      JSON.stringify({
        ref: policy.ref,
        repository: repositoryUrl,
        path: policy.workflow,
      }) ||
    definition.internalParameters?.github?.event_name !== policy.event ||
    definition.internalParameters.github.repository_id !== String(info.id) ||
    definition.internalParameters.github.repository_owner_id !==
      String(info.owner.id) ||
    source?.length !== 1 ||
    source[0].uri !== `git+${repositoryUrl}@${policy.ref}` ||
    !sha(source[0].digest?.gitCommit) ||
    !match ||
    !positive(Number(match[1])) ||
    !positive(Number(match[2]))
  )
    fail("publication-source-mismatch");
  const sourceSha = source[0].digest.gitCommit;
  return {
    provenance,
    sourceSha,
    repositoryUrl,
    workflow,
    invocation,
    runId: Number(match[1]),
    runAttempt: Number(match[2]),
  };
}

export async function verifyAttestations(
  body,
  metadata,
  policy,
  info,
  verifier,
  artifact,
) {
  const {
    provenance,
    sourceSha,
    repositoryUrl,
    workflow,
    invocation,
    runId,
    runAttempt,
  } = inspectAttestationClaims(body, metadata, policy, info);
  // Authenticate before using certificate claims as source evidence.
  const certificate = await verifier.verify(
    provenance.bundle,
    {
      repository: info.full_name,
      workflow: policy.workflow,
      ref: policy.ref,
      sourceSha,
      ...(policy.kind === "plugins-static-v1" ? { profile: policy.kind } : {}),
    },
    artifact,
  );
  verifier.registrySignature(metadata);
  // The npm publish statement is a consistency input; registry ECDSA supplies
  // authorized registry name/version/integrity authentication independently.
  const fields = {
    9: "buildSignerURI",
    10: "buildSignerDigest",
    11: "runnerEnvironment",
    12: "sourceRepositoryURI",
    13: "sourceRepositoryDigest",
    14: "sourceRepositoryRef",
    15: "sourceRepositoryIdentifier",
    17: "sourceRepositoryOwnerIdentifier",
    18: "buildConfigURI",
    19: "buildConfigDigest",
    20: "buildTrigger",
    21: "runInvocationURI",
    22: "sourceRepositoryVisibilityAtSigning",
    23: "deploymentEnvironment",
  };
  for (const [oid, expected] of [
    [9, workflow],
    [10, sourceSha],
    [11, "github-hosted"],
    [12, repositoryUrl],
    [13, sourceSha],
    [14, policy.ref],
    [15, String(info.id)],
    [17, String(info.owner.id)],
    [18, workflow],
    [19, sourceSha],
    [20, policy.event],
    [21, invocation],
    [22, "public"],
    [23, policy.environment],
  ])
    if (certificate[fields[oid]] !== expected)
      fail("publication-certificate-mismatch");
  return {
    sourceSha,
    repositoryId: info.id,
    runId,
    runAttempt,
    attestationSha256: hash(JSON.stringify(body)),
    subjectSha512: integrityDigest(metadata.dist.integrity),
  };
}
