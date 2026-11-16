import { readFile } from "node:fs/promises";
import { hash } from "../src/publication-tool.mjs";
import { contractFields } from "../src/publication-evidence.mjs";

export const metadata = JSON.parse(
  await readFile(
    new URL("./fixtures/file-explorer-0.2.8-metadata.json", import.meta.url),
  ),
);
export const attestations = JSON.parse(
  await readFile(
    new URL(
      "./fixtures/file-explorer-0.2.8-attestations.json",
      import.meta.url,
    ),
  ),
);
export const tarball = await readFile(
  new URL("./fixtures/file-explorer-0.2.8.tgz", import.meta.url),
);
export const sourceSha = "1080bdb420bc367526995613be9d0f1568fb0f3c",
  currentSha = "a".repeat(40),
  repository = "lapismd/lapis-notes";
const contract = Object.fromEntries(
  contractFields
    .filter((f) => metadata[f] !== undefined)
    .map((f) => [f, metadata[f]]),
);
export const owner = {
  name: metadata.name,
  repository,
  path: "packages/file-explorer/package.json",
  manifest: contract,
};
export const repo = { repository, sourceSha: currentSha, visibility: "public" };
export const entries = [
  { repository, phase: "pilot" },
  { repository: "lapismd/lapis-plugins", phase: "pilot" },
];
export function zip(files, mode = 0x81a4) {
  const locals = [],
    central = [];
  let offset = 0;
  for (const [name, data] of Object.entries(files)) {
    const path = Buffer.from(name),
      bytes = Buffer.from(data),
      local = Buffer.alloc(30),
      entry = Buffer.alloc(46);
    local.writeUInt32LE(0x04034b50);
    local.writeUInt32LE(bytes.length, 18);
    local.writeUInt32LE(bytes.length, 22);
    local.writeUInt16LE(path.length, 26);
    locals.push(local, path, bytes);
    entry.writeUInt32LE(0x02014b50);
    entry.writeUInt32LE(bytes.length, 20);
    entry.writeUInt32LE(bytes.length, 24);
    entry.writeUInt16LE(path.length, 28);
    entry.writeUInt32LE((mode << 16) >>> 0, 38);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, path);
    offset += local.length + path.length + bytes.length;
  }
  const directory = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}
export function publicationFixture() {
  const info = {
    id: 1349575966,
    full_name: repository,
    owner: { id: 311425888 },
    private: false,
    visibility: "public",
    fork: false,
    archived: false,
    default_branch: "main",
  };
  const baseRun = {
    head_sha: sourceSha,
    workflow_id: 344605363,
    path: ".github/workflows/release.yml",
    head_branch: "main",
    event: "workflow_dispatch",
    status: "completed",
    repository: { id: info.id },
    head_repository: { id: info.id, full_name: repository, fork: false },
    run_attempt: 1,
  };
  const origin = {
    ...baseRun,
    id: 43635116316,
    run_number: 2,
    check_suite_id: 17,
    conclusion: "failure",
  };
  const recovery = {
    ...baseRun,
    id: 43637981701,
    run_number: 3,
    check_suite_id: 18,
    conclusion: "success",
  };
  const jobNames = [
    "Validate release candidate / release-artifacts",
    "Validate release candidate / validate",
    "Publish packages",
    "Verify published packages",
    "Create GitHub releases",
  ];
  const originJobs = jobNames.map((name, n) => ({
    name,
    status: "completed",
    conclusion: n === 3 ? "failure" : n === 4 ? "skipped" : "success",
    started_at: "2026-11-14T20:00:00Z",
    completed_at: "2026-11-14T20:10:00Z",
  }));
  const recoveryJobs = structuredClone(originJobs).map((j) => ({
    ...j,
    conclusion: "success",
  }));
  const artifactName = "lapis-notes-release-" + sourceSha;
  const manifest = {
    schemaVersion: 1,
    repository,
    commit: sourceSha,
    artifactName,
    registry: "https://registry.npmjs.org",
    packages: [
      {
        name: metadata.name,
        version: metadata.version,
        tag: "next",
        integrity: metadata.dist.integrity,
        shasum: hash(tarball),
        size: tarball.length,
        tarball: "tarballs/file-explorer.tgz",
      },
    ],
  };
  const archive = zip({
    "release-manifest.json": JSON.stringify(manifest),
    "tarballs/file-explorer.tgz": tarball,
  });
  const artifact = (id, runId) => ({
    id,
    name: artifactName,
    expired: false,
    size_in_bytes: archive.length,
    digest: "sha256:" + hash(archive),
    created_at: "2026-11-14T20:05:00Z",
    workflow_run: {
      id: runId,
      head_sha: sourceSha,
      repository_id: info.id,
      head_repository_id: info.id,
    },
  });
  const checks = [
    {
      id: 1,
      head_sha: sourceSha,
      name: "old failed verify",
      status: "completed",
      conclusion: "failure",
      check_suite: { id: 17 },
      app: { slug: "github-actions" },
    },
    {
      id: 2,
      head_sha: sourceSha,
      name: "current verify",
      status: "completed",
      conclusion: "success",
      check_suite: { id: 18 },
      app: { slug: "github-actions" },
    },
  ];
  const packument = {
    "dist-tags": { latest: "0.1.0", next: metadata.version },
    versions: {
      "0.1.0": {
        name: metadata.name,
        version: "0.1.0",
        dist: { integrity: "old" },
      },
      [metadata.version]: structuredClone(metadata),
    },
  };
  const f = {
    info,
    origin,
    recovery,
    originJobs,
    recoveryJobs,
    archive,
    manifest,
    checks,
    packument,
    attestations: structuredClone(attestations),
    artifact: artifact(1, origin.id),
    recoveryArtifact: artifact(2, recovery.id),
    runs: [origin, recovery],
    statuses: [],
    requests: [],
    mutate: null,
  };
  const list = (field, values) => ({
    total_count: values.length,
    [field]: values,
  });
  f.fetcher = async (input, options) => {
    const url = new URL(input),
      path = url.pathname;
    f.requests.push({ url: input, options });
    f.mutate?.(url);
    let data;
    if (url.hostname === "registry.npmjs.org") {
      if (path.includes("/attestations/")) data = f.attestations;
      else if (path.endsWith(".tgz")) data = tarball;
      else throw Error("Unexpected fixture registry read");
    } else if (path.endsWith("/lapis-notes")) data = f.info;
    else if (path.endsWith("/actions/workflows/344605363"))
      data = {
        id: 344605363,
        path: ".github/workflows/release.yml",
        state: "active",
      };
    else if (path.endsWith(`/actions/runs/${origin.id}/attempts/1`))
      data = f.origin;
    else if (
      path.endsWith(
        `/actions/runs/${f.recovery.id}/attempts/${f.recovery.run_attempt}`,
      )
    )
      data = f.recovery;
    else if (path.endsWith(`/actions/runs/${origin.id}/attempts/1/jobs`))
      data = list("jobs", f.originJobs);
    else if (
      path.endsWith(
        `/actions/runs/${f.recovery.id}/attempts/${f.recovery.run_attempt}/jobs`,
      )
    )
      data = list("jobs", f.recoveryJobs);
    else if (path.endsWith(`/actions/runs/${origin.id}/artifacts`))
      data = list("artifacts", [f.artifact]);
    else if (path.endsWith(`/actions/runs/${recovery.id}/artifacts`))
      data = list("artifacts", [f.recoveryArtifact]);
    else if (/\/actions\/artifacts\/[12]\/zip$/.test(path)) data = f.archive;
    else if (path.endsWith("/actions/workflows/344605363/runs"))
      data = list("workflow_runs", [f.recovery]);
    else if (path.endsWith("/contents/packages/file-explorer/package.json"))
      data = {
        encoding: "base64",
        content: Buffer.from(JSON.stringify(contract)).toString("base64"),
      };
    else if (path.includes("/compare/"))
      data = { merge_base_commit: { sha: sourceSha } };
    else if (path.endsWith("/actions/workflows"))
      data = list("workflows", [
        {
          id: 344605363,
          path: ".github/workflows/release.yml",
          state: "active",
        },
      ]);
    else if (path.endsWith("/contents/.github/workflows"))
      data = [{ path: ".github/workflows/release.yml", type: "file" }];
    else if (path.endsWith("/contents/.github/workflows/release.yml"))
      data = {
        encoding: "base64",
        content: Buffer.from(
          "on:\n  push:\n    branches: [main]\n  workflow_dispatch:\n",
        ).toString("base64"),
      };
    else if (path.endsWith("/commits/" + sourceSha))
      data = { sha: sourceSha, files: [{ filename: "package.json" }] };
    else if (path.endsWith("/actions/runs"))
      data = list("workflow_runs", f.runs);
    else if (path.endsWith("/check-runs")) data = list("check_runs", f.checks);
    else if (path.endsWith("/statuses")) data = f.statuses;
    else throw Error("Unexpected fixture GitHub read");
    return new Response(Buffer.isBuffer(data) ? data : JSON.stringify(data), {
      status: 200,
    });
  };
  return f;
}
