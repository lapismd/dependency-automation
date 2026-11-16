import test from "node:test";
import assert from "node:assert/strict";
test("Plugins static-v1 has a separate exact publisher contract, never a Notes schema relaxation", async () => {
  const { loadPublicationPolicy } = await import("../src/publications.mjs");
  const policy = await loadPublicationPolicy([
    { repository: "lapismd/lapis-notes" },
    { repository: "lapismd/lapis-plugins" },
  ]);
  assert.equal(
    policy.publishers["lapismd/lapis-plugins"]?.kind,
    "plugins-static-v1",
  );
  assert.equal(
    policy.publishers["lapismd/lapis-notes"].environment,
    "npm-production",
  );
});
import { loadPublicationVerifier, hash } from "../src/publication-tool.mjs";
import {
  loadPublicationPolicy,
  observePublications,
} from "../src/publications.mjs";
import { verifyAttestations } from "../src/publication-evidence.mjs";
import {
  staticCandidate,
  staticArtifactLimit,
} from "../src/publication-static.mjs";
import {
  metadata,
  attestations,
  tarball,
  sourceSha,
  owner,
  repo,
  staticFixture,
} from "./static-publication-fixtures.mjs";
const entries = [
  { repository: "lapismd/lapis-notes" },
  { repository: "lapismd/lapis-plugins" },
];
const policy = await loadPublicationPolicy(entries),
  publisher = policy.publishers[repo.repository];
const tool = await loadPublicationVerifier(policy.tool);
const observe = async (f) =>
  (
    await observePublications(
      [owner],
      new Map([
        [
          owner.name,
          {
            "dist-tags": { latest: metadata.version },
            versions: { [metadata.version]: f.metadata },
          },
        ],
      ]),
      [repo],
      entries,
      { fetcher: f.fetcher },
    )
  ).observations.get(owner.name + "@" + metadata.version);
test("real History npm and static Ed25519 signatures bind the exact public source and retained candidate", async () => {
  const f = staticFixture();
  const context = await verifyAttestations(
    attestations,
    metadata,
    publisher,
    f.info,
    tool,
    tarball,
  );
  assert.equal(context.sourceSha, sourceSha);
  assert.equal(context.runId, 43776424438);
  const candidate = staticCandidate(
    f.archive,
    metadata,
    owner,
    publisher,
    context,
  );
  assert.deepEqual(candidate.tarball, tarball);
  const evidence = await observe(f);
  assert.equal(evidence.state, "verified", evidence.reason);
  assert.equal(evidence.proof.artifact.tarballSha256, hash(tarball));
  assert.equal(evidence.proof.verification.runId, 43776424438);
  assert(f.requests.every((r) => r.options.method === "GET"));
});
for (const [name, mutate] of [
  [
    "fork",
    (f) => {
      f.origin.head_repository.fork = true;
    },
  ],
  [
    "wrong attempt",
    (f) => {
      f.origin.run_attempt = 2;
    },
  ],
  [
    "wrong workflow",
    (f) => {
      f.origin.workflow_id = 1;
    },
  ],
  [
    "failed run",
    (f) => {
      f.origin.conclusion = "failure";
    },
  ],
  [
    "unfinished current check",
    (f) => {
      f.checks = [{ head_sha: sourceSha, status: "in_progress" }];
    },
  ],
  [
    "external failed check",
    (f) => {
      f.checks = [
        {
          head_sha: sourceSha,
          status: "completed",
          conclusion: "failure",
          app: { slug: "external" },
        },
      ];
    },
  ],
  [
    "expired artifact",
    (f) => {
      f.artifact.expired = true;
    },
  ],
  [
    "wrong artifact window",
    (f) => {
      f.artifact.created_at = "2026-11-17T00:00:00Z";
    },
  ],
  [
    "wrong digest",
    (f) => {
      f.artifact.digest = "sha256:" + "0".repeat(64);
    },
  ],
  [
    "unbounded artifact",
    (f) => {
      f.artifact.size_in_bytes = staticArtifactLimit + 1;
    },
  ],
  [
    "different source plan",
    (f) => {
      f.plan.generatedFrom = "f".repeat(40);
      f.rebuild();
    },
  ],
  [
    "different package",
    (f) => {
      f.plan.releases[0].packageName = "@lapis-notes/other";
      f.rebuild();
    },
  ],
  [
    "ambiguous selected package",
    (f) => {
      f.plan.releases.push(f.plan.releases[0]);
      f.rebuild();
    },
  ],
  [
    "different-byte skipped candidate",
    (f) => {
      f.tarball[0] ^= 1;
      f.rebuild();
    },
  ],
  [
    "wrong signed archive",
    (f) => {
      f.bundle[0] ^= 1;
      f.rebuild();
    },
  ],
  [
    "failed source gate",
    (f) => {
      f.rows[1].conclusion = "failure";
    },
  ],
  [
    "missing publish step",
    (f) => {
      f.rows[3].steps.pop();
    },
  ],
  [
    "early publication",
    (f) => {
      f.rows[3].steps[2].started_at = "2026-11-15T00:00:00Z";
    },
  ],
])
  test("static proof holds " + name, async () => {
    const f = staticFixture();
    mutate(f);
    const p = await observe(f);
    assert.equal(p.state, "unknown", name);
    assert.equal(p.proof, undefined);
  });
test("Notes artifact cap stays8MiB while static cap is bounded24MiB", async () => {
  const { limits } = await import("../src/publication-transport.mjs");
  assert.equal(limits.artifact, 8 * 1024 * 1024);
  assert.equal(staticArtifactLimit, 24 * 1024 * 1024);
});
