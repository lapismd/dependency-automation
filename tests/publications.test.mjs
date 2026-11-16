import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile, symlink, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  loadPublicationVerifier,
  inspectVerificationTool,
  hash,
} from "../src/publication-tool.mjs";
import {
  verifyAttestations,
  contractDigest,
} from "../src/publication-evidence.mjs";
import {
  observePublications,
  loadPublicationPolicy,
  validatePublicationEvidence,
  verifiedPublication,
} from "../src/publications.mjs";
import {
  publicationReader,
  publicArtifact,
  limits,
} from "../src/publication-transport.mjs";
import { emptyState, validateState } from "../src/waves.mjs";
import {
  metadata,
  attestations,
  tarball,
  sourceSha,
  currentSha,
  repository,
  owner,
  repo,
  entries,
  publicationFixture,
  zip,
} from "./publication-source-fixtures.mjs";
const policy = await loadPublicationPolicy(entries),
  publisher = policy.publishers[repository];
const verifier = await loadPublicationVerifier(policy.tool);
const info = publicationFixture().info;
const observe = async (f) =>
  (
    await observePublications(
      [owner],
      new Map([[metadata.name, f.packument]]),
      [repo],
      entries,
      { fetcher: f.fetcher },
    )
  ).observations.get(`${metadata.name}@${metadata.version}`);

test("reviewed verification-only runtime accepts the real public signatures and exact certificate identity", async () => {
  const facts = await verifyAttestations(
    attestations,
    metadata,
    publisher,
    info,
    verifier,
    tarball,
  );
  assert.equal(facts.sourceSha, sourceSha);
  assert.equal(facts.runId, 43635116316);
  assert.equal(facts.runAttempt, 1);
  assert.equal(facts.repositoryId, info.id);
  assert.equal(facts.subjectSha512.length, 128);
  assert.equal(metadata.gitHead, undefined);
  assert.deepEqual(await inspectVerificationTool(), {
    sha256: policy.tool.sha256,
    trustSeedSha256: policy.tool.trustSeedSha256,
  });
  const changed = structuredClone(policy.tool);
  changed.sha256 = "0".repeat(64);
  await assert.rejects(
    loadPublicationVerifier(changed),
    /verification-tool-unavailable/,
  );
  await assert.rejects(
    loadPublicationVerifier({ ...policy.tool, node: "24.19.0" }),
    /verification-tool-unavailable/,
  );
});

test("unrecognized, mutated, wrong-subject and wrong-certificate claims cannot become publication evidence", async () => {
  for (const mutate of [
    (a) => a.attestations.pop(),
    (a) => a.attestations.push(a.attestations[0]),
    (a) => {
      a.attestations[1].predicateType = "https://example.test/untrusted";
    },
    (a) => {
      const b = a.attestations[1].bundle;
      const p = JSON.parse(Buffer.from(b.dsseEnvelope.payload, "base64"));
      p.subject[0].name = "pkg:npm/%40lapis-notes/other@0.2.8";
      b.dsseEnvelope.payload = Buffer.from(JSON.stringify(p)).toString(
        "base64",
      );
    },
    (a) => {
      const b = a.attestations[1].bundle;
      const p = JSON.parse(Buffer.from(b.dsseEnvelope.payload, "base64"));
      p.predicate.runDetails.metadata.invocationId += "/other";
      b.dsseEnvelope.payload = Buffer.from(JSON.stringify(p)).toString(
        "base64",
      );
    },
    (a) => {
      a.attestations[1].bundle.dsseEnvelope.signatures[0].sig =
        Buffer.alloc(72).toString("base64");
    },
    (a) => {
      a.attestations[1].bundle.verificationMaterial.certificate.rawBytes =
        Buffer.alloc(512).toString("base64");
    },
  ]) {
    const a = structuredClone(attestations);
    mutate(a);
    await assert.rejects(
      verifyAttestations(a, metadata, publisher, info, verifier, tarball),
    );
  }
  await assert.rejects(
    verifyAttestations(
      attestations,
      { ...metadata, name: "@lapis-notes/other" },
      publisher,
      info,
      verifier,
      tarball,
    ),
  );
  await assert.rejects(
    verifyAttestations(
      attestations,
      metadata,
      { ...publisher, environment: "other" },
      info,
      verifier,
      tarball,
    ),
  );
  await assert.rejects(
    verifyAttestations(
      attestations,
      metadata,
      { ...publisher, workflow: ".github/workflows/releaseXyml" },
      info,
      verifier,
      tarball,
    ),
  );
  await assert.rejects(
    verifyAttestations(
      attestations,
      metadata,
      publisher,
      { ...info, id: 1 },
      verifier,
      tarball,
    ),
  );
});

test("failed initial publication verification is recovered only by successful exact-source identical bytes", async () => {
  const f = publicationFixture(),
    evidence = await observe(f);
  assert.equal(evidence.state, "verified", evidence.reason);
  assert.equal(evidence.proof.runId, f.origin.id);
  assert.equal(evidence.proof.verification.runId, f.recovery.id);
  assert.equal(evidence.proof.artifact.tarballSha256, hash(tarball));
  assert.equal(evidence.matchesCurrentContract, true);
  assert.equal(evidence.channel.admitted, false);
  assert.equal(evidence.channel.latest, "0.1.0");
  assert.deepEqual(evidence.channel.tags, ["next"]);
  assert(f.requests.every((r) => r.options.method === "GET"));
  const normalized = {
    ...metadata,
    integrity: metadata.dist.integrity,
    publication: evidence,
  };
  assert(verifiedPublication(normalized, repo, owner.manifest));
  normalized.dependencies = {
    ...normalized.dependencies,
    "@lapis-notes/api": "^9.0.0",
  };
  assert(!verifiedPublication(normalized, repo, owner.manifest));
  const state = emptyState();
  state.publications.fixture = {
    name: metadata.name,
    version: metadata.version,
    integrity: metadata.dist.integrity,
    evidence,
  };
  assert.doesNotThrow(() => validateState(state));
  const bad = structuredClone(evidence);
  bad.proof.privateKey = "forbidden";
  assert.throws(() => validatePublicationEvidence(bad));
  assert(!JSON.stringify(evidence).includes("dsseEnvelope"));
  assert(!JSON.stringify(evidence).includes("rawBytes"));
});

test("same workflow run attempt two reuses successful retained candidate jobs and artifact", async () => {
  const f = publicationFixture();
  f.recovery = {
    ...f.recovery,
    id: f.origin.id,
    run_number: f.origin.run_number,
    run_attempt: 2,
    check_suite_id: f.origin.check_suite_id,
  };
  f.recoveryArtifact = f.artifact;
  f.runs = [f.recovery];
  f.checks = f.checks
    .slice(1)
    .map((c) => ({ ...c, check_suite: { id: f.origin.check_suite_id } }));
  const evidence = await observe(f);
  assert.equal(evidence.state, "verified", evidence.reason);
  assert.equal(evidence.proof.runAttempt, 1);
  assert.equal(evidence.proof.verification.runAttempt, 2);
  assert.equal(evidence.proof.artifact.id, evidence.proof.verification.id);
});

for (const [name, mutate] of [
  [
    "private source",
    (f) => {
      f.info.private = true;
      f.info.visibility = "private";
    },
  ],
  [
    "fork origin",
    (f) => {
      f.origin.head_repository.fork = true;
    },
  ],
  [
    "wrong source attempt",
    (f) => {
      f.origin.run_attempt = 2;
    },
  ],
  [
    "wrong source workflow",
    (f) => {
      f.origin.path = ".github/workflows/other.yml";
    },
  ],
  [
    "failed source qualification job",
    (f) => {
      f.originJobs[1].conclusion = "failure";
    },
  ],
  [
    "early recovery aggregate",
    (f) => {
      f.recoveryJobs[1].status = "in_progress";
      f.recoveryJobs[1].conclusion = null;
    },
  ],
  [
    "failed recovery verification",
    (f) => {
      f.recoveryJobs[3].conclusion = "failure";
    },
  ],
  [
    "artifact digest mutation",
    (f) => {
      f.artifact.digest = "sha256:" + "0".repeat(64);
    },
  ],
  [
    "recovery digest mutation",
    (f) => {
      f.recoveryArtifact.digest = "sha256:" + "0".repeat(64);
    },
  ],
  [
    "wrong artifact attempt window",
    (f) => {
      f.artifact.created_at = "2026-11-15T00:00:00Z";
    },
  ],
  [
    "expired artifact",
    (f) => {
      f.artifact.expired = true;
    },
  ],
  [
    "foreign artifact source",
    (f) => {
      f.artifact.workflow_run.repository_id = 2;
    },
  ],
  [
    "changed registry contract",
    (f) => {
      f.packument.versions[metadata.version].dependencies["@lapis-notes/api"] =
        "^9.0.0";
    },
  ],
  [
    "unknown historical check suite",
    (f) => {
      f.checks.push({
        id: 3,
        status: "completed",
        conclusion: "failure",
        head_sha: sourceSha,
        check_suite: { id: 999 },
        app: { slug: "github-actions" },
      });
    },
  ],
  [
    "external failed check",
    (f) => {
      f.checks.push({
        id: 3,
        status: "completed",
        conclusion: "failure",
        head_sha: sourceSha,
        check_suite: { id: 999 },
        app: { slug: "external" },
      });
    },
  ],
  [
    "older running source workflow",
    (f) => {
      f.runs = [
        { ...f.origin, status: "in_progress", conclusion: null },
        f.recovery,
      ];
    },
  ],
  [
    "pending older source check",
    (f) => {
      f.checks[0].status = "in_progress";
      f.checks[0].conclusion = null;
    },
  ],
  [
    "foreign SHA workflow cannot retire historical failure",
    (f) => {
      f.recovery.head_sha = "f".repeat(40);
    },
  ],
  [
    "foreign SHA current check",
    (f) => {
      f.checks[1].head_sha = "f".repeat(40);
    },
  ],
  [
    "missing current source workflow",
    (f) => {
      f.runs = [];
    },
  ],
])
  test(`publication remains held for ${name}`, async () => {
    const f = publicationFixture();
    mutate(f);
    const evidence = await observe(f);
    assert.equal(evidence.state, "unknown");
    assert.equal(evidence.proof, undefined);
    assert.equal(evidence.channel.admitted, false);
    if (name === "private source")
      assert(!f.requests.some((r) => r.url.endsWith("/zip")));
  });

test("unknown provenance and old source contracts are explicit without admitting next", async () => {
  const f = publicationFixture();
  delete f.packument.versions[metadata.version].dist.attestations;
  const unknown = await observe(f);
  assert.equal(unknown.reason, "provenance-unknown");
  assert.equal(f.requests.length, 0);
  const other = { ...owner, manifest: { ...owner.manifest, version: "0.2.9" } };
  const good = publicationFixture();
  const result = await observePublications(
    [other],
    new Map([[metadata.name, good.packument]]),
    [repo],
    entries,
    { fetcher: good.fetcher },
  );
  assert.equal(
    result.observations.get(`${metadata.name}@0.2.9`).state,
    "unpublished",
  );
  const older = result.observations.get(`${metadata.name}@0.2.8`);
  assert.equal(older.state, "verified");
  assert.equal(older.matchesCurrentContract, false);
  assert.equal(older.channel.admitted, false);
});

test("bounded reader rejects oversized responses, credential redirects and request storms", async () => {
  await assert.rejects(
    publicationReader({
      fetcher: async () => new Response(Buffer.alloc(5)),
    }).bytes("https://registry.npmjs.org/x", 4),
    /byte-limit/,
  );
  await assert.rejects(
    publicationReader({
      fetcher: async () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://evil.example/x" },
        }),
    }).bytes("https://api.github.com/x", 4, true),
    /redirect-rejected/,
  );
  const seen = [];
  await publicationReader({
    token: "fixture-token",
    fetcher: async (url, options) => {
      seen.push(options.headers);
      return seen.length === 1
        ? new Response(null, {
            status: 302,
            headers: {
              location:
                "https://public.blob.core.windows.net/artifact?fixture=1",
            },
          })
        : new Response("x");
    },
  }).bytes("https://api.github.com/x", 4, true);
  assert.equal(seen[0].Authorization, "Bearer fixture-token");
  assert.equal(seen[1].Authorization, undefined);
  const reader = publicationReader({ fetcher: async () => new Response("x") });
  for (let n = 0; n < limits.requests; n++)
    await reader.bytes(`https://registry.npmjs.org/${n}`);
  await assert.rejects(
    reader.bytes("https://registry.npmjs.org/extra"),
    /request-limit/,
  );
});

test("missing authenticated public artifact access stays an explicit hold", async () => {
  const reader = publicationReader({
    fetcher: async () => new Response("{}", { status: 401 }),
  });
  await assert.rejects(
    reader.bytes(
      "https://api.github.com/repos/lapismd/lapis-notes/actions/artifacts/1/zip",
      limits.artifact,
      true,
    ),
    /publication-artifact-read-unavailable/,
  );
});

test("metadata-only ZIP reader bounds paths, symlinks, offsets and inflation", () => {
  assert.equal(
    publicArtifact(zip({ "release-manifest.json": "{}" }))(
      "release-manifest.json",
    ).toString(),
    "{}",
  );
  for (const name of [
    "../secret",
    "/secret",
    "credentials\\config",
    "a/../b",
    "a//b",
  ])
    assert.throws(() => publicArtifact(zip({ [name]: "x" })), /archive/);
  assert.throws(
    () => publicArtifact(zip({ manifest: "x" }, 0xa1ff)),
    /archive/,
  );
  assert.throws(
    () =>
      publicArtifact(
        zip({ "credentials/config": "secret" }),
        (n) => n === "release-manifest.json",
      ),
    /archive/,
  );
  const corrupt = zip({ manifest: "x" });
  corrupt.writeUInt32LE(0x7fffffff, 18);
  assert.throws(() => publicArtifact(corrupt), /archive/);
  const huge = zip({ manifest: "x" });
  const directory = 30 + "manifest".length + 1;
  huge.writeUInt32LE(limits.inflated + 1, directory + 24);
  assert.throws(() => publicArtifact(huge), /archive/);
  assert.throws(
    () => publicArtifact(zip({ manifest: "hello" }))("manifest", 2),
    /entry-unavailable/,
  );
});

test("verification binary rejects symlinks, mutations and unsupported versions before execution", async () => {
  const root = await mkdtemp(join(tmpdir(), "publication-tool-"));
  try {
    const file = join(root, "gh"),
      link = join(root, "linked-gh");
    await writeFile(file, "never execute");
    await symlink(file, link);
    await assert.rejects(inspectVerificationTool(link), /verification-tool/);
    assert.notEqual(
      (await inspectVerificationTool(file)).sha256,
      policy.tool.sha256,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("pinned CLI rejects DSSE encoding mutation and unauthenticated integrated-time-only proof", async () => {
  const bundle = attestations.attestations.find(
    (a) => a.predicateType === "https://slsa.dev/provenance/v1",
  ).bundle;
  const request = {
    repository,
    workflow: publisher.workflow,
    ref: publisher.ref,
    sourceSha,
  };
  const changed = structuredClone(bundle);
  changed.dsseEnvelope.payloadType = "application/vnd.in-toto+jso\u016e";
  await assert.rejects(
    verifier.verify(changed, request, tarball),
    (error) => error.code === 1,
  );
  const unsigned = structuredClone(bundle);
  unsigned.mediaType = "application/vnd.dev.sigstore.bundle+json;version=0.2";
  unsigned.verificationMaterial.x509CertificateChain = {
    certificates: [unsigned.verificationMaterial.certificate],
  };
  delete unsigned.verificationMaterial.certificate;
  delete unsigned.verificationMaterial.timestampVerificationData;
  for (const entry of unsigned.verificationMaterial.tlogEntries)
    delete entry.inclusionPromise;
  await assert.rejects(
    verifier.verify(unsigned, request, tarball),
    (error) => error.code === 1,
  );
});

test("publication-only read credential is isolated from registry bytes and verifier process", async () => {
  const f = publicationFixture();
  const result = await observePublications(
    [owner],
    new Map([[metadata.name, f.packument]]),
    [repo],
    entries,
    {
      fetcher: f.fetcher,
      token: "coordinator-fixture",
      publicationToken: "publication-fixture",
    },
  );
  assert.equal(
    result.observations.get(`${metadata.name}@${metadata.version}`).state,
    "verified",
  );
  for (const r of f.requests)
    assert.equal(
      r.options.headers.Authorization,
      r.url.startsWith("https://api.github.com/")
        ? "Bearer publication-fixture"
        : undefined,
    );
});
