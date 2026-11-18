import assert from "node:assert/strict";
import test from "node:test";
import { loadPublicationPolicy } from "../src/publications.mjs";
import {
  observePublications,
  validatePublicationEvidence,
} from "../src/publications.mjs";
import {
  taggedWorkspaceContract,
  validateTaggedWorkspacePublisher,
  resolveTaggedWorkspacePublisher,
} from "../src/publication-tagged-workspace.mjs";
import { publicArtifact, limits } from "../src/publication-transport.mjs";
import { hash } from "../src/publication-tool.mjs";
import { loadPublicationVerifier } from "../src/publication-tool.mjs";
import { verifyAttestations } from "../src/publication-evidence.mjs";
import { zip } from "./publication-source-fixtures.mjs";
import {
  taggedFixture,
  api,
  artifactUrl,
  sourceSha,
} from "./tagged-workspace-fixtures.mjs";

const jobsUrl = `${api}/actions/runs/43786568782/attempts/1/jobs?per_page=100`;
const artifactsUrl = `${api}/actions/runs/43786568782/artifacts?per_page=100`;
const sourceFile = (directory) =>
  `${api}/contents/packages/${directory}/package.json?ref=${sourceSha}`;
const attestationsUrl =
  "https://registry.npmjs.org/-/npm/v1/attestations/@lapismd%2fagent-ui@0.2.8";
async function observe(f, index = 0) {
  const owner = f.inputs.owners[index];
  const result = await observePublications(
    [owner],
    new Map(f.inputs.registry),
    f.inputs.repositories,
    [],
    { fetcher: f.fetcher },
  );
  return result.observations.get(`${owner.name}@${owner.manifest.version}`);
}
function sourceChange(f, directory, mutate) {
  f.change(sourceFile(directory), (file) => {
    const manifest = JSON.parse(Buffer.from(file.content, "base64"));
    mutate(manifest);
    file.content = Buffer.from(JSON.stringify(manifest)).toString("base64");
  });
}
function archiveChange(f, mutate) {
  const read = publicArtifact(f.records.get(artifactUrl));
  const files = Object.fromEntries(
    read.paths.map((name) => [name, read(name, limits.tarball)]),
  );
  mutate(files);
  const bytes = zip(files);
  f.records.set(artifactUrl, bytes);
  f.change(artifactsUrl, (r) => {
    const artifact = r.artifacts.find((a) => a.id === 14190407906);
    artifact.digest = "sha256:" + hash(bytes);
    artifact.size_in_bytes = bytes.length;
  });
}

test("Agent UI has a distinct reviewed tagged-workspace publisher contract", async () => {
  const policy = await loadPublicationPolicy();
  assert.equal(
    policy.publishers["lapismd/agent-ui"]?.kind,
    "agent-ui-tagged-workspace-v1",
  );
  assert.equal(
    policy.publishers["lapismd/lapis-notes"].workflow,
    ".github/workflows/release.yml",
  );
  assert.equal(
    policy.publishers["lapismd/lapis-plugins"].kind,
    "plugins-static-v1",
  );
});

test("both original cohort packages authenticate through the real pinned standard verifier", async () => {
  for (const index of [0, 1]) {
    const f = taggedFixture(),
      evidence = await observe(f, index);
    assert.equal(evidence.state, "verified", evidence.reason);
    assert.equal(evidence.matchesCurrentContract, true);
    assert.equal(evidence.proof.sourceSha, sourceSha);
    assert.equal(evidence.proof.runId, 43786568782);
    assert.equal(evidence.proof.ref, "refs/tags/v0.2.8");
    assert.equal(
      evidence.proof.artifact.sha256,
      "66a1a750b9790bcd3e4e8383571b64958d6b7c56a2d0e046f17a472da30d2af3",
    );
    assert(f.requests.every((r) => r.options.method === "GET"));
    const foreign = structuredClone(evidence);
    foreign.proof.repository = "lapismd/other";
    assert.throws(() => validatePublicationEvidence(foreign));
  }
});

test("policy scope and every reviewed contract field reject unknown values", () => {
  const entries = [{ repository: "lapismd/agent-ui" }];
  validateTaggedWorkspacePublisher(
    "lapismd/agent-ui",
    taggedWorkspaceContract,
    entries,
  );
  for (const key of Object.keys(taggedWorkspaceContract)) {
    const changed = { ...taggedWorkspaceContract, [key]: "unreviewed" };
    assert.throws(() =>
      validateTaggedWorkspacePublisher("lapismd/agent-ui", changed, entries),
    );
  }
  assert.throws(() =>
    validateTaggedWorkspacePublisher(
      "lapismd/other",
      taggedWorkspaceContract,
      entries,
    ),
  );
  assert.throws(() =>
    validateTaggedWorkspacePublisher(
      "lapismd/agent-ui",
      taggedWorkspaceContract,
      [],
    ),
  );
  assert.throws(() =>
    validateTaggedWorkspacePublisher(
      "lapismd/agent-ui",
      { ...taggedWorkspaceContract, extra: true },
      entries,
    ),
  );
});

test("untrusted candidate refs never allow branches, arbitrary tags or prereleases", () => {
  for (const ref of [
    "refs/heads/main",
    "refs/tags/latest",
    "refs/tags/v01.2.3",
    "refs/tags/v1.2.3-beta.1",
    "refs/tags/v1.2.3/other",
    "refs/tags/v1.2.3+build",
  ]) {
    const body = taggedFixture().json(attestationsUrl);
    const envelope = body.attestations.find(
      (a) => a.predicateType === "https://slsa.dev/provenance/v1",
    ).bundle.dsseEnvelope;
    const statement = JSON.parse(Buffer.from(envelope.payload, "base64"));
    statement.predicate.buildDefinition.externalParameters.workflow.ref = ref;
    envelope.payload = Buffer.from(JSON.stringify(statement)).toString(
      "base64",
    );
    assert.throws(() =>
      resolveTaggedWorkspacePublisher(taggedWorkspaceContract, body),
    );
  }
});

const cases = [
  [
    "counterpart source public contract",
    (f) =>
      sourceChange(f, "repository-ui", (p) => {
        p.dependencies["@lapismd/design-core"] = "^0.13.5";
      }),
  ],
  [
    "counterpart registry public contract",
    (f) =>
      f.change(
        "https://registry.npmjs.org/%40lapismd%2Frepository-ui/0.2.6",
        (p) => {
          p.exports["./unreviewed"] = "./other.js";
        },
      ),
  ],
  [
    "foreign source repository",
    (f) =>
      f.change(api, (r) => {
        r.full_name = "lapismd/other";
      }),
  ],
  [
    "private source",
    (f) =>
      f.change(api, (r) => {
        r.private = true;
      }),
  ],
  [
    "unreviewed publisher bytes",
    (f) =>
      f.change(
        `${api}/contents/.github/workflows/npm-publish.yml?ref=${sourceSha}`,
        (r) => {
          r.content = Buffer.from("changed publisher").toString("base64");
        },
      ),
  ],
  [
    "source package file identity",
    (f) =>
      f.change(sourceFile("agent-ui"), (r) => {
        r.path = "other/package.json";
      }),
  ],
  [
    "source cohort tag mismatch",
    (f) =>
      sourceChange(f, "agent-ui", (p) => {
        p.version = "0.2.9";
      }),
  ],
  [
    "counterpart wrong package",
    (f) =>
      sourceChange(f, "repository-ui", (p) => {
        p.name = "@lapismd/other";
      }),
  ],
  [
    "counterpart private",
    (f) =>
      sourceChange(f, "repository-ui", (p) => {
        p.private = true;
      }),
  ],
  [
    "counterpart unreviewed version",
    (f) =>
      sourceChange(f, "repository-ui", (p) => {
        p.version = "0.2.7";
      }),
  ],
  [
    "owner outside exact cohort",
    (f) => {
      f.inputs.owners[0].path = "packages/other/package.json";
    },
  ],
  [
    "workflow ID mismatch",
    (f) =>
      f.change(`${api}/actions/workflows/400453743`, (r) => {
        r.id++;
      }),
  ],
  [
    "publisher dispatch instead of tag push",
    (f) =>
      f.change(`${api}/actions/runs/43786568782/attempts/1`, (r) => {
        r.event = "workflow_dispatch";
      }),
  ],
  [
    "publisher main branch instead of exact tag",
    (f) =>
      f.change(`${api}/actions/runs/43786568782/attempts/1`, (r) => {
        r.head_branch = "main";
      }),
  ],
  [
    "wrong run source",
    (f) =>
      f.change(`${api}/actions/runs/43786568782/attempts/1`, (r) => {
        r.head_sha = "a".repeat(40);
      }),
  ],
  [
    "wrong run attempt",
    (f) =>
      f.change(`${api}/actions/runs/43786568782/attempts/1`, (r) => {
        r.run_attempt++;
      }),
  ],
  [
    "failed publishing run",
    (f) =>
      f.change(`${api}/actions/runs/43786568782/attempts/1`, (r) => {
        r.conclusion = "failure";
      }),
  ],
  [
    "missing matrix counterpart",
    (f) =>
      f.change(jobsUrl, (r) => {
        r.jobs = r.jobs.filter((j) => !j.name.includes("repository-ui,"));
        r.total_count = r.jobs.length;
      }),
  ],
  [
    "failed registry verification",
    (f) =>
      f.change(jobsUrl, (r) => {
        r.jobs.find(
          (j) => j.name === "Verify registry artifacts and provenance",
        ).conclusion = "failure";
      }),
  ],
  [
    "duplicate prepare job",
    (f) =>
      f.change(jobsUrl, (r) => {
        r.jobs.push(
          r.jobs.find((j) => j.name === "Validate and pack packages"),
        );
        r.total_count++;
      }),
  ],
  [
    "incomplete job page",
    (f) =>
      f.change(jobsUrl, (r) => {
        r.total_count++;
      }),
  ],
  [
    "expired artifact",
    (f) =>
      f.change(artifactsUrl, (r) => {
        r.artifacts[0].expired = true;
      }),
  ],
  [
    "duplicate artifact",
    (f) =>
      f.change(artifactsUrl, (r) => {
        r.artifacts.push(r.artifacts[0]);
        r.total_count++;
      }),
  ],
  [
    "artifact digest mismatch",
    (f) =>
      f.change(artifactsUrl, (r) => {
        r.artifacts[0].digest = "sha256:" + "0".repeat(64);
      }),
  ],
  [
    "artifact source mismatch",
    (f) =>
      f.change(artifactsUrl, (r) => {
        r.artifacts[0].workflow_run.head_sha = "a".repeat(40);
      }),
  ],
  [
    "artifact outside prepare timing",
    (f) =>
      f.change(artifactsUrl, (r) => {
        r.artifacts[0].created_at = "2020-01-01T00:00:00Z";
      }),
  ],
  [
    "artifact cap unchanged",
    (f) =>
      f.change(artifactsUrl, (r) => {
        r.artifacts[0].size_in_bytes = limits.artifact + 1;
      }),
  ],
  [
    "extra archive path",
    (f) =>
      archiveChange(f, (files) => {
        files["extra.txt"] = Buffer.from("not admitted");
      }),
  ],
  [
    "missing cohort tarball",
    (f) =>
      archiveChange(f, (files) => {
        delete files["lapismd-repository-ui-0.2.6.tgz"];
      }),
  ],
  [
    "different counterpart tarball",
    (f) =>
      archiveChange(f, (files) => {
        files["lapismd-repository-ui-0.2.6.tgz"][0] ^= 1;
      }),
  ],
  [
    "duplicate manifest package",
    (f) =>
      archiveChange(f, (files) => {
        const m = JSON.parse(files["manifest.json"]);
        m.packages[1] = m.packages[0];
        files["manifest.json"] = Buffer.from(JSON.stringify(m));
      }),
  ],
  [
    "extra manifest field",
    (f) =>
      archiveChange(f, (files) => {
        const m = JSON.parse(files["manifest.json"]);
        m.unreviewed = true;
        files["manifest.json"] = Buffer.from(JSON.stringify(m));
      }),
  ],
  [
    "manifest source mismatch",
    (f) =>
      archiveChange(f, (files) => {
        const m = JSON.parse(files["manifest.json"]);
        m.source = "a".repeat(40);
        files["manifest.json"] = Buffer.from(JSON.stringify(m));
      }),
  ],
  [
    "counterpart registry metadata identity",
    (f) =>
      f.change(
        "https://registry.npmjs.org/%40lapismd%2Frepository-ui/0.2.6",
        (r) => {
          r.version = "0.2.7";
        },
      ),
  ],
  [
    "different registry counterpart bytes",
    (f) => {
      f.records.get(
        "https://registry.npmjs.org/@lapismd/repository-ui/-/repository-ui-0.2.6.tgz",
      )[0] ^= 1;
    },
  ],
  [
    "unrelated source ancestry",
    (f) =>
      f.change(
        `${api}/compare/${sourceSha}...92778247fe369da6455a00909039b818503fab3e?per_page=1`,
        (r) => {
          r.merge_base_commit.sha = "a".repeat(40);
        },
      ),
  ],
  [
    "unqualified source status",
    (f) =>
      f.change(`${api}/commits/${sourceSha}/statuses?per_page=100`, (r) => {
        r.push({ state: "pending" });
      }),
  ],
];
for (const [name, mutate] of cases)
  test(`tagged publisher rejects ${name}`, async () => {
    const f = taggedFixture();
    mutate(f);
    const evidence = await observe(f);
    assert.equal(evidence.state, "unknown", name);
    assert.equal(evidence.proof, undefined, name);
    assert.equal(evidence.matchesCurrentContract, false, name);
  });

for (const [name, mutate] of [
  [
    "signature",
    (bundle) => {
      bundle.dsseEnvelope.signatures[0].sig =
        Buffer.alloc(72).toString("base64");
    },
  ],
  [
    "certificate",
    (bundle) => {
      bundle.verificationMaterial.certificate.rawBytes =
        Buffer.alloc(512).toString("base64");
    },
  ],
  [
    "authenticated tag",
    (bundle) => {
      const p = JSON.parse(Buffer.from(bundle.dsseEnvelope.payload, "base64"));
      p.predicate.buildDefinition.externalParameters.workflow.ref =
        "refs/tags/v0.2.9";
      bundle.dsseEnvelope.payload = Buffer.from(JSON.stringify(p)).toString(
        "base64",
      );
    },
  ],
])
  test(`tagged source cannot bypass genuine crypto after ${name} mutation`, async () => {
    const f = taggedFixture();
    f.change(attestationsUrl, (a) =>
      mutate(
        a.attestations.find(
          (r) => r.predicateType === "https://slsa.dev/provenance/v1",
        ).bundle,
      ),
    );
    assert.equal((await observe(f)).state, "unknown");
    assert(!f.requests.some((r) => r.url === artifactUrl));
  });

test("real certificate, registry and subject checks cannot be weakened by the tagged profile", async () => {
  const f = taggedFixture(),
    policy = await loadPublicationPolicy();
  const verifier = await loadPublicationVerifier(policy.tool);
  const body = f.json(attestationsUrl),
    info = f.json(api);
  const publisher = resolveTaggedWorkspacePublisher(
    taggedWorkspaceContract,
    body,
  );
  const metadata = f.inputs.registry[0][1].versions["0.2.8"];
  const tarball = f.records.get(metadata.dist.tarball);
  for (const change of [
    { environment: "other" },
    { workflow: ".github/workflows/other.yml" },
    { event: "workflow_dispatch" },
    { ref: "refs/tags/v0.2.9" },
  ])
    await assert.rejects(
      verifyAttestations(
        body,
        metadata,
        { ...publisher, ...change },
        info,
        verifier,
        tarball,
      ),
    );
  const wrongSubject = structuredClone(metadata);
  wrongSubject.dist.integrity = "sha512-" + Buffer.alloc(64).toString("base64");
  await assert.rejects(
    verifyAttestations(body, wrongSubject, publisher, info, verifier, tarball),
  );
  const wrongSignature = structuredClone(metadata);
  wrongSignature.dist.signatures = [];
  await assert.rejects(
    verifyAttestations(
      body,
      wrongSignature,
      publisher,
      info,
      verifier,
      tarball,
    ),
  );
  await assert.rejects(
    verifyAttestations(
      body,
      metadata,
      publisher,
      { ...info, id: info.id + 1 },
      verifier,
      tarball,
    ),
  );
});
