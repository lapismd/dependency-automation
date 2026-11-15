import { mkdir, writeFile } from "node:fs/promises";
import YAML from "yaml";
import { loadPolicy, requestJson } from "../src/github.mjs";
import {
  monitoringRepositories,
  auditWorkflowAuthentication,
} from "../src/maintenance-policy.mjs";

// GET requests only. Never mint an App token or call a write API.
const report = {
  schemaVersion: 1,
  fetchedAt: new Date().toISOString(),
  scope:
    "Direct gh PR writes and known PR-creation actions in default-branch YAML; script internals and reusable workflow bodies require separate inspection.",
  repositories: [],
};
for (const repository of monitoringRepositories(await loadPolicy())) {
  const result = {
    repository,
    sourceSha: null,
    workflows: [],
    findings: [],
    coverage: "unavailable",
  };
  try {
    const prefix = `https://api.github.com/repos/${repository}`;
    const get = (url) => requestJson(url, { token: process.env.GH_TOKEN });
    const info = await get(prefix);
    const branch = await get(
      `${prefix}/branches/${encodeURIComponent(info.default_branch)}`,
    );
    result.sourceSha = branch.commit.sha;
    const tree = await get(
      `${prefix}/git/trees/${result.sourceSha}?recursive=1`,
    );
    if (tree.truncated) throw Error("Truncated workflow inventory");
    for (const entry of tree.tree.filter(
      (entry) =>
        entry.type === "blob" &&
        /^\.github\/workflows\/[^/]+\.ya?ml$/.test(entry.path),
    )) {
      const blob = await get(`${prefix}/git/blobs/${entry.sha}`);
      const workflow = YAML.parse(
        Buffer.from(blob.content, "base64").toString("utf8"),
      );
      if (!workflow?.jobs) throw Error(`Invalid workflow: ${entry.path}`);
      result.workflows.push(entry.path);
      result.findings.push(
        ...auditWorkflowAuthentication(workflow).map((finding) => ({
          path: entry.path,
          ...finding,
        })),
      );
    }
    result.coverage = "inspected";
  } catch {
    // Never serialize unexpected errors, API bodies or authentication headers.
    result.error =
      "Repository, revision or workflow read failed; check access and retry.";
    process.exitCode = 1;
  }
  report.repositories.push(result);
  console.log(
    `${repository}: ${result.coverage}; ${result.findings.length} PR-creator findings`,
  );
}
await mkdir("reports", { recursive: true });
await writeFile(
  "reports/maintenance-audit.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  "Read-only maintenance audit saved to reports/maintenance-audit.json",
);
