import { readFile } from "node:fs/promises";
import { hash } from "../src/publication-tool.mjs";
import { contractFields } from "../src/publication-evidence.mjs";
import { zip } from "./publication-source-fixtures.mjs";
const file = (n) =>
  readFile(new URL("./fixtures/history-0.5.1" + n, import.meta.url));
export const metadata = JSON.parse(await file("-metadata.json"));
export const attestations = JSON.parse(await file("-attestations.json"));
export const tarball = await file(".tgz"),
  bundle = await file(".lapis-plugin");
export const sourceSha = "75c7190341d34210d62b20552c324b9bd12ef6f9",
  currentSha = "a".repeat(40),
  repository = "lapismd/lapis-plugins";
export const owner = {
  name: metadata.name,
  repository,
  path: "packages/history/package.json",
  manifest: Object.fromEntries(
    contractFields
      .filter((k) => metadata[k] !== undefined)
      .map((k) => [k, metadata[k]]),
  ),
};
export const repo = { repository, sourceSha: currentSha, visibility: "public" };
const originalPlan = JSON.parse(await file("-plan.json")),
  originalPack = JSON.parse(await file("-pack.json"));
export function staticFixture() {
  const info = {
    id: 1349665130,
    full_name: repository,
    owner: { id: 311425888 },
    private: false,
    visibility: "public",
    fork: false,
    archived: false,
    default_branch: "main",
  };
  const origin = {
    id: 43776424438,
    run_attempt: 1,
    head_sha: sourceSha,
    workflow_id: 344819974,
    path: ".github/workflows/release.yml",
    head_branch: "main",
    event: "workflow_dispatch",
    status: "completed",
    conclusion: "success",
    repository: { id: info.id },
    head_repository: { id: info.id, full_name: repository, fork: false },
    run_number: 1,
    check_suite_id: 17,
  };
  const step = (name) => ({
    name,
    status: "completed",
    conclusion: "success",
    started_at: "2026-11-16T00:00:00Z",
    completed_at: "2026-11-16T00:00:00Z",
  });
  const rows = [
    "selection",
    "validate / validate",
    "validate / release-artifacts",
    "static-publish",
  ].map((name) => ({
    ...step(name),
    steps: [
      "Validate selected source and every shared release gate",
      "Prepare signed static candidates",
      "Skip published npm versions and create missing GitHub releases",
    ].map(step),
  }));
  const f = {
    info,
    origin,
    rows,
    plan: structuredClone(originalPlan),
    pack: structuredClone(originalPack),
    tarball: Buffer.from(tarball),
    bundle: Buffer.from(bundle),
    attestations: structuredClone(attestations),
    checks: [],
    statuses: [],
    requests: [],
    metadata: structuredClone(metadata),
    artifact: null,
    archive: null,
  };
  f.rebuild = () => {
    f.archive = zip({
      "release-plan.json": JSON.stringify(f.plan),
      "npm/manifest.json": JSON.stringify(f.pack),
      "npm/lapis-notes-history-0.5.1.tgz": f.tarball,
      "plugins/history-0.5.1/history-0.5.1.lapis-plugin": f.bundle,
    });
    f.artifact = {
      id: 14188020939,
      name: "signed-static-candidate-43776424438-1",
      expired: false,
      size_in_bytes: f.archive.length,
      digest: "sha256:" + hash(f.archive),
      created_at: "2026-11-16T00:00:00Z",
      workflow_run: {
        id: f.origin.id,
        head_sha: sourceSha,
        repository_id: info.id,
        head_repository_id: info.id,
      },
    };
  };
  f.rebuild();
  const list = (field, rows) => ({ total_count: rows.length, [field]: rows });
  f.fetcher = async (url, options) => {
    f.requests.push({ url, options });
    const u = new URL(url),
      p = u.pathname;
    let data;
    if (u.hostname === "registry.npmjs.org") {
      if (p.includes("/attestations/")) data = f.attestations;
      else if (p.endsWith(".tgz")) data = tarball;
      else throw Error("Unexpected registry request");
    } else if (p.endsWith("/lapis-plugins")) data = f.info;
    else if (p.endsWith("/actions/workflows/344819974"))
      data = {
        id: 344819974,
        path: ".github/workflows/release.yml",
        state: "active",
      };
    else if (p.endsWith("/actions/runs/43776424438/attempts/1"))
      data = f.origin;
    else if (p.endsWith("/actions/runs/43776424438/attempts/1/jobs"))
      data = list("jobs", f.rows);
    else if (p.endsWith("/actions/runs/43776424438/artifacts"))
      data = list("artifacts", [f.artifact]);
    else if (p.endsWith("/actions/artifacts/14188020939/zip")) data = f.archive;
    else if (p.includes("/contents/packages/history/package.json"))
      data = {
        encoding: "base64",
        content: Buffer.from(JSON.stringify(owner.manifest)).toString("base64"),
      };
    else if (p.includes("/compare/"))
      data = { merge_base_commit: { sha: sourceSha } };
    else if (p.endsWith("/actions/workflows"))
      data = list("workflows", [
        { id: 1, path: ".github/workflows/ci.yml", state: "active" },
      ]);
    else if (p.endsWith("/contents/.github/workflows"))
      data = [{ path: ".github/workflows/ci.yml", type: "file" }];
    else if (p.endsWith("/contents/.github/workflows/ci.yml"))
      data = {
        encoding: "base64",
        content: Buffer.from("on: {push: {branches: [main]}}").toString(
          "base64",
        ),
      };
    else if (p.endsWith("/commits/" + sourceSha))
      data = {
        sha: sourceSha,
        files: [{ filename: "packages/history/package.json" }],
      };
    else if (p.endsWith("/actions/runs"))
      data = list("workflow_runs", [
        { ...f.origin, workflow_id: 1, event: "push" },
      ]);
    else if (p.endsWith("/check-runs")) data = list("check_runs", f.checks);
    else if (p.endsWith("/statuses")) data = f.statuses;
    else throw Error("Unexpected fixture request " + p);
    return data instanceof Buffer ? new Response(data) : Response.json(data);
  };
  return f;
}
