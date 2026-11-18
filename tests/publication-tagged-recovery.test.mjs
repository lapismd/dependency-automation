import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { observePublications } from "../src/publications.mjs";
import { fixture, api } from "./tagged-workspace-fixtures.mjs";
const base = new URL("./fixtures/agent-ui-recovery/", import.meta.url);
const inputs = JSON.parse(await readFile(new URL("inputs.json", base)));
const index = JSON.parse(await readFile(new URL("responses.json", base)));
const records = new Map(
  await Promise.all(
    Object.entries(index).map(async ([url, file]) => [
      url,
      await readFile(new URL(file, base)),
    ]),
  ),
);
const runId = 44253603892;
const origin = `${api}/actions/runs/${runId}/attempts/1`;
const latest = `${api}/actions/runs/${runId}`;
const recovery = `${api}/actions/runs/${runId}/attempts/2`;
const jobs = (attempt) =>
  `${origin.replace("/attempts/1", `/attempts/${attempt}`)}/jobs?per_page=100`;
const artifacts = `${api}/actions/runs/${runId}/artifacts?per_page=100`;
async function observe(f) {
  const r = await observePublications(
    f.inputs.owners,
    new Map(f.inputs.registry),
    f.inputs.repositories,
    [],
    { fetcher: f.fetcher },
  );
  return [...r.observations.values()];
}
test("actual Agent UI recovered pair authenticates origin1 and same-artifact verification2", async () => {
  const f = fixture(records, inputs);
  for (const e of await observe(f)) {
    assert.equal(e.state, "verified", e.reason);
    assert.equal(e.matchesCurrentContract, true);
    assert.equal(e.proof.runId, runId);
    assert.equal(e.proof.runAttempt, 1);
    assert.equal(e.proof.verification.runId, runId);
    assert.equal(e.proof.verification.runAttempt, 2);
    assert.equal(e.proof.artifact.id, 14405220741);
    assert.equal(
      e.proof.artifact.sha256,
      "5b93baede3bb9b83c8a16d77c5f1acc0b7228b219ebcc4e4e5aed27e5ff4fb01",
    );
  }
  assert(f.requests.every((r) => r.options.method === "GET"));
});
const mutations = [
  [
    "missing original and projected steps",
    (f) => {
      for (const attempt of [1, 2])
        f.change(jobs(attempt), (r) => r.jobs.forEach((j) => delete j.steps));
    },
  ],
  [
    "reused verification identity",
    (f) => {
      const id = f
        .json(jobs(1))
        .jobs.find((j) => j.name.startsWith("Verify registry")).id;
      f.change(
        jobs(2),
        (r) =>
          (r.jobs.find((j) => j.name.startsWith("Verify registry")).id = id),
      );
    },
  ],
  [
    "origin publish proof lost",
    (f) =>
      f.change(
        jobs(1),
        (r) =>
          (r.jobs.find((j) => j.name.startsWith("Publish with")).conclusion =
            "failure"),
      ),
  ],
  [
    "origin prepare lost",
    (f) =>
      f.change(
        jobs(1),
        (r) =>
          (r.jobs.find(
            (j) => j.name === "Validate and pack packages",
          ).conclusion = "failure"),
      ),
  ],
  [
    "origin verification skipped",
    (f) =>
      f.change(
        jobs(1),
        (r) =>
          (r.jobs.find((j) => j.name.startsWith("Verify registry")).conclusion =
            "skipped"),
      ),
  ],
  [
    "origin not failed",
    (f) => f.change(origin, (r) => (r.conclusion = "cancelled")),
  ],
  [
    "missing failed verify",
    (f) =>
      f.change(jobs(1), (r) => {
        r.jobs = r.jobs.filter((j) => !j.name.startsWith("Verify registry"));
        r.total_count = r.jobs.length;
      }),
  ],
  [
    "republish",
    (f) =>
      f.change(
        jobs(2),
        (r) =>
          (r.jobs.find((j) => j.name.startsWith("Publish with")).started_at =
            "2026-11-18T06:53:01Z"),
      ),
  ],
  [
    "repack",
    (f) =>
      f.change(
        jobs(2),
        (r) =>
          (r.jobs.find(
            (j) => j.name === "Validate and pack packages",
          ).completed_at = "2026-11-18T06:53:01Z"),
      ),
  ],
  [
    "changed publication steps",
    (f) =>
      f.change(
        jobs(2),
        (r) =>
          (r.jobs.find((j) => j.name.startsWith("Publish with")).steps = []),
      ),
  ],
  [
    "verification reused",
    (f) =>
      f.change(jobs(2), (r) => {
        const j = r.jobs.find((j) => j.name.startsWith("Verify registry"));
        Object.assign(j, {
          started_at: "2026-11-18T06:00:00Z",
          completed_at: "2026-11-18T06:00:01Z",
        });
      }),
  ],
  [
    "failed recovery",
    (f) => f.change(recovery, (r) => (r.conclusion = "failure")),
  ],
  [
    "incomplete recovery",
    (f) => f.change(latest, (r) => (r.status = "in_progress")),
  ],
  [
    "unsupported later attempt",
    (f) => f.change(latest, (r) => (r.run_attempt = 3)),
  ],
  [
    "different artifact",
    (f) =>
      f.change(
        artifacts,
        (r) =>
          (r.artifacts.find((a) => a.id === 14405220741).digest =
            "sha256:" + "0".repeat(64)),
      ),
  ],
  [
    "artifact outside original prepare",
    (f) =>
      f.change(
        artifacts,
        (r) =>
          (r.artifacts.find((a) => a.id === 14405220741).created_at =
            "2026-11-18T06:53:01Z"),
      ),
  ],
  [
    "extra artifact",
    (f) =>
      f.change(artifacts, (r) => {
        r.artifacts.push({
          ...r.artifacts.find((a) => a.id === 14405220741),
          id: 14405220742,
        });
        r.total_count++;
      }),
  ],
  ["missing recovery", (f) => f.records.delete(latest)],
  ["incomplete job coverage", (f) => f.change(jobs(2), (r) => r.total_count++)],
  [
    "failed recovered verification",
    (f) =>
      f.change(
        jobs(2),
        (r) =>
          (r.jobs.find((j) => j.name.startsWith("Verify registry")).conclusion =
            "failure"),
      ),
  ],
];
for (const endpoint of [origin, latest, recovery])
  for (const [key, value] of Object.entries({
    id: 123,
    head_sha: "0".repeat(40),
    head_branch: "v0.2.8",
    event: "workflow_dispatch",
    path: ".github/workflows/other.yml",
    workflow_id: 123,
    repository: { id: 1 },
    head_repository: { id: 1, full_name: "other/repo", fork: false },
  }))
    mutations.push([
      `${endpoint} changed ${key}`,
      (f) => f.change(endpoint, (r) => (r[key] = value)),
    ]);
for (const [name, mutate] of mutations)
  test(`same-run recovery rejects ${name}`, async () => {
    const f = fixture(records, inputs);
    mutate(f);
    for (const e of await observe(f))
      assert.notEqual(e.state, "verified", name);
  });

for (const kind of ["signature", "certificate", "subject"])
  test(`recovered pair retains genuine ${kind} verification`, async () => {
    const f = fixture(records, inputs);
    for (const url of Object.keys(index).filter((u) =>
      u.includes("/attestations/"),
    ))
      f.change(url, (a) => {
        const b = a.attestations.find(
          (a) => a.predicateType === "https://slsa.dev/provenance/v1",
        ).bundle;
        if (kind === "signature")
          b.dsseEnvelope.signatures[0].sig =
            Buffer.alloc(72).toString("base64");
        if (kind === "certificate")
          b.verificationMaterial.certificate.rawBytes =
            Buffer.alloc(512).toString("base64");
        if (kind === "subject") {
          const p = JSON.parse(Buffer.from(b.dsseEnvelope.payload, "base64"));
          p.subject[0].digest.sha256 = "0".repeat(64);
          b.dsseEnvelope.payload = Buffer.from(JSON.stringify(p)).toString(
            "base64",
          );
        }
      });
    for (const e of await observe(f)) assert.equal(e.state, "unknown");
    assert(!f.requests.some((r) => r.url.endsWith("/zip")));
  });
for (const kind of [
  "incomplete checks",
  "failed CI",
  "registry signature",
  "artifact bytes",
])
  test(`recovered pair rejects ${kind}`, async () => {
    const f = fixture(records, inputs);
    if (kind === "incomplete checks")
      f.change(
        Object.keys(index).find((u) => u.includes("/check-runs?")),
        (r) => r.total_count++,
      );
    if (kind === "failed CI")
      f.change(
        Object.keys(index).find((u) => u.includes("/check-runs?")),
        (r) =>
          (r.check_runs.find((c) => c.name === "Quality").conclusion =
            "failure"),
      );
    if (kind === "registry signature")
      for (const [, m] of f.inputs.registry)
        for (const v of Object.values(m.versions))
          v.dist.signatures.forEach(
            (s) => (s.sig = Buffer.alloc(72).toString("base64")),
          );
    if (kind === "artifact bytes") {
      const u = Object.keys(index).find((u) => u.endsWith("/zip"));
      f.records.get(u)[100] ^= 1;
    }
    for (const e of await observe(f)) assert.equal(e.state, "unknown");
  });
