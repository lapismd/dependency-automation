import { mkdir, readFile, writeFile } from "node:fs/promises";
import YAML from "yaml";
import { loadPolicy, requestJson } from "../src/github.mjs";
import {
  monitoringRepositories,
  auditWorkflowAuthentication,
} from "../src/maintenance-policy.mjs";
import {
  activationCoverage,
  auditOperationalSource,
  exclusionCoverage,
  requiredCheckCoverage,
  updateOwnership,
  validateOperationsPolicy,
} from "../src/operational-drift.mjs";

const policy = await loadPolicy();
const operations = validateOperationsPolicy(
  JSON.parse(await readFile("config/operations.json", "utf8")),
);

// GET requests only. Never mint an App token or call a write API.
const report = {
  schemaVersion: 1,
  fetchedAt: new Date().toISOString(),
  scope:
    "Direct gh PR writes and known PR-creation actions in default-branch YAML; script internals and reusable workflow bodies require separate inspection.",
  repositories: [],
  exclusions: exclusionCoverage(policy, operations),
  activation: { state: "unavailable" },
};
for (const repository of monitoringRepositories(policy)) {
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
    if (info.private !== false && info.visibility !== "public")
      throw Error("Source visibility unavailable");
    const branch = await get(
      `${prefix}/branches/${encodeURIComponent(info.default_branch)}`,
    );
    result.sourceSha = branch.commit.sha;
    const tree = await get(
      `${prefix}/git/trees/${result.sourceSha}?recursive=1`,
    );
    if (tree.truncated) throw Error("Truncated workflow inventory");
    const documents = [];
    const cache = new Map();
    async function readDocument(path) {
      const entry = tree.tree.find(
        (entry) => entry.type === "blob" && entry.path === path,
      );
      if (!entry) return null;
      if (!cache.has(path)) {
        const blob = await get(`${prefix}/git/blobs/${entry.sha}`);
        cache.set(
          path,
          YAML.parse(Buffer.from(blob.content, "base64").toString("utf8")),
        );
      }
      return cache.get(path);
    }
    result.operational = { workflows: [] };
    for (const entry of tree.tree.filter(
      (entry) =>
        entry.type === "blob" &&
        /^\.github\/workflows\/[^/]+\.ya?ml$/.test(entry.path),
    )) {
      const workflow = await readDocument(entry.path);
      if (!workflow?.jobs) throw Error(`Invalid workflow: ${entry.path}`);
      result.workflows.push(entry.path);
      documents.push({ path: entry.path, workflow });
      result.operational.workflows.push({
        path: entry.path,
        ...(await auditOperationalSource(workflow, readDocument, operations)),
      });
      result.findings.push(
        ...auditWorkflowAuthentication(workflow).map((finding) => ({
          path: entry.path,
          ...finding,
        })),
      );
    }
    const optional = async (url) => {
      try {
        return await get(url);
      } catch {
        return null;
      }
    };
    const [protection, rules] = await Promise.all([
      optional(
        `${prefix}/branches/${encodeURIComponent(info.default_branch)}/protection`,
      ),
      optional(
        `${prefix}/rules/branches/${encodeURIComponent(info.default_branch)}`,
      ),
    ]);
    result.operational.requiredChecks = requiredCheckCoverage(
      documents,
      protection,
      rules,
    );
    result.operational.updateOwnership = updateOwnership(
      (await readDocument(".github/dependabot.yml")) ??
        (await readDocument(".github/dependabot.yaml")),
    );
    const security =
      info.security_and_analysis?.dependabot_security_updates?.status;
    result.operational.updateOwnership.security =
      security === "enabled"
        ? "enabled"
        : security === "disabled"
          ? "disabled"
          : "unavailable";
    if (repository === "lapismd/dependency-automation")
      report.activation = activationCoverage(
        await optional(`${prefix}/actions/variables?per_page=100`),
        operations,
      );
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
