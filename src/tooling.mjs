import { readFile } from "node:fs/promises";
import semver from "semver";
import {
  validateCohortEvidence,
  assessCohortEvidence,
} from "./tooling-evidence.mjs";

const tools = new Set([
  "@changesets/cli",
  "@lapismd/spec-validator",
  "@playwright/test",
  "playwright",
  "storybook",
  "@storybook/addon-vitest",
  "vite",
  "vitest",
  "@vitest/browser-playwright",
]);
const keys = (value, names) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).every((key) => names.includes(key));
const sha = (value) => /^[a-f0-9]{40}$/.test(value ?? "");

export function validateToolingPolicy(policy) {
  if (
    !keys(policy, ["schemaVersion", "node", "versioning", "repositories"]) ||
    policy.schemaVersion !== 1 ||
    !semver.valid(policy.node) ||
    semver.major(policy.node) !== 24 ||
    !keys(policy.versioning, Object.keys(policy.versioning ?? {})) ||
    !keys(policy.repositories, Object.keys(policy.repositories ?? {})) ||
    !policy.versioning["2.31.1"] ||
    !policy.versioning["3.0.3"]
  )
    throw Error("Invalid tooling policy");
  for (const [version, contract] of Object.entries(policy.versioning)) {
    if (
      !semver.valid(version) ||
      !keys(contract, [
        "runtime",
        "bin",
        "binSha256",
        "engines",
        "integrity",
        "sourceSha",
      ]) ||
      contract.runtime !== "node" ||
      contract.bin !== "bin.js" ||
      !/^[a-f0-9]{64}$/.test(contract.binSha256 ?? "") ||
      !/^sha512-[A-Za-z0-9+/]{86}==$/.test(contract.integrity ?? "") ||
      !sha(contract.sourceSha) ||
      (contract.engines !== null &&
        (!semver.validRange(contract.engines) ||
          !semver.satisfies(policy.node, contract.engines)))
    )
      throw Error("Invalid tooling policy versioning contract");
  }
  for (const [repository, cohort] of Object.entries(policy.repositories)) {
    if (
      !/^(lapismd|stevejuma)\/[\w.-]+$/.test(repository) ||
      !keys(cohort, ["sourceSha", "pnpm", "tools", "evidence"]) ||
      !sha(cohort.sourceSha) ||
      !semver.valid(cohort.pnpm) ||
      !keys(cohort.tools, [...tools]) ||
      Object.values(cohort.tools).some(
        (range) => typeof range !== "string" || !semver.validRange(range),
      )
    )
      throw Error("Invalid tooling policy cohort");
    if (cohort.evidence) validateCohortEvidence(cohort.evidence, cohort);
  }
  return policy;
}

export async function loadToolingPolicy() {
  return validateToolingPolicy(
    JSON.parse(
      await readFile(
        new URL("../config/tooling.json", import.meta.url),
        "utf8",
      ),
    ),
  );
}

function rootManifest(snapshot) {
  return (
    snapshot.manifests?.find((p) => p.path === "package.json")?.manifest ?? {}
  );
}

export function toolingVersions(snapshot) {
  const manifest = rootManifest(snapshot);
  const result = {};
  for (const name of tools) {
    const declared =
      manifest.devDependencies?.[name] ?? manifest.dependencies?.[name];
    if (!declared) continue;
    const importer = snapshot.lock?.importers?.["."] ?? snapshot.lock;
    const resolved =
      importer?.devDependencies?.[name] ?? importer?.dependencies?.[name];
    const version = typeof resolved === "object" ? resolved?.version : resolved;
    const clean = typeof version === "string" ? version.split("(")[0] : null;
    const exact = semver.valid(clean) ?? null;
    result[name] = {
      declared: semver.validRange(declared) ? declared : "non-semver",
      version: exact,
      integrity: exact
        ? (snapshot.lock?.packages?.[`${name}@${exact}`]?.resolution
            ?.integrity ?? null)
        : null,
    };
  }
  return result;
}

export function assessTooling(snapshot, policy) {
  const observed = toolingVersions(snapshot);
  const cli = observed["@changesets/cli"];
  const contract = cli && policy.versioning[cli.version];
  const cohort = policy.repositories[snapshot.repository];
  const findings = [];
  const manifest = rootManifest(snapshot);
  const manager =
    /^pnpm@(\d+\.\d+\.\d+)(?:\+sha\d+\.[a-f0-9]+)?$/.exec(
      manifest.packageManager ?? "",
    )?.[1] ?? null;
  if (cohort) {
    if (manager !== cohort.pnpm)
      findings.push({
        tool: "pnpm",
        reason: manifest.packageManager
          ? "cohort drift"
          : "undeclared source-owned package manager",
      });
    if (
      manifest.engines?.node &&
      !semver.satisfies(policy.node, manifest.engines.node)
    )
      findings.push({ tool: "node", reason: "Node 24 unsupported" });
    for (const [name, range] of Object.entries(cohort.tools)) {
      const value = observed[name];
      if (!value?.version || !semver.satisfies(value.version, range))
        findings.push({
          tool: name,
          reason: value?.version
            ? "cohort drift"
            : "missing resolved lock evidence",
        });
    }
  }
  for (const [a, b] of [
    ["playwright", "@playwright/test"],
    ["vitest", "@vitest/browser-playwright"],
  ])
    if (
      observed[a]?.version &&
      observed[b]?.version &&
      observed[a].version !== observed[b].version
    )
      findings.push({
        tool: `${a}/${b}`,
        names: [a, b],
        reason: "paired tool versions differ",
      });
  const storybook = observed.storybook?.version,
    addon = observed["@storybook/addon-vitest"]?.version;
  if (
    storybook &&
    addon &&
    (semver.major(storybook) !== semver.major(addon) ||
      semver.minor(storybook) !== semver.minor(addon))
  )
    findings.push({
      tool: "storybook/@storybook/addon-vitest",
      names: ["storybook", "@storybook/addon-vitest"],
      reason: "paired tool families differ",
    });
  return {
    sourceSha: snapshot.sourceSha,
    cohort: cohort ? "recorded-source" : "unconfigured",
    cohortSourceSha: cohort?.sourceSha ?? null,
    evidence: assessCohortEvidence(snapshot, cohort),
    node: {
      versioningRuntime: policy.node,
      sourceEngines: semver.validRange(manifest.engines?.node)
        ? manifest.engines.node
        : null,
    },
    pnpm: { observed: manager, expected: cohort?.pnpm ?? null },
    versioning: {
      state: !cli
        ? "not-declared"
        : contract && cli.integrity === contract.integrity
          ? "reviewed-node-cli"
          : "unqualified",
      version: cli?.version ?? null,
    },
    observed,
    project: {
      state:
        snapshot.toolingInputs === undefined
          ? "uninspected"
          : snapshot.toolingInputs.length
            ? "source-qualification-required"
            : "no-root-deno-input",
      inputs: snapshot.toolingInputs ?? null,
    },
    findings,
  };
}

/** Protect new adoption without silently rewriting existing fleet tooling. */
export function guardToolingChange(before, after, policy) {
  if (
    (after.toolingInputs ?? []).some(
      (path) => !(before.toolingInputs ?? []).includes(path),
    )
  )
    throw Error(
      "New Deno formatter input requires owning-source qualification",
    );
  const previous = toolingVersions(before),
    next = toolingVersions(after);
  const cli = "@changesets/cli";
  const changed = (name) =>
    JSON.stringify(previous[name]) !== JSON.stringify(next[name]);
  if (changed(cli) && next[cli]) {
    if (assessTooling(after, policy).versioning.state !== "reviewed-node-cli")
      throw Error(
        "Candidate introduces unqualified versioning runtime or registry bytes",
      );
    if (
      previous[cli]?.version &&
      semver.major(previous[cli].version) !== semver.major(next[cli].version)
    )
      throw Error("Tooling major change requires owning-source qualification");
  }
  const oldRoot = rootManifest(before),
    newRoot = rootManifest(after);
  if (
    oldRoot.engines?.node !== newRoot.engines?.node &&
    newRoot.engines?.node &&
    !semver.satisfies(policy.node, newRoot.engines.node)
  )
    throw Error("Candidate tooling does not support Node 24");
  const assessment = assessTooling(after, policy);
  for (const finding of assessment.findings) {
    const relevant =
      finding.tool === "pnpm"
        ? oldRoot.packageManager !== newRoot.packageManager
        : (finding.names ?? [finding.tool]).some(changed);
    if (relevant)
      throw Error(`Candidate tooling cohort drift: ${finding.tool}`);
  }
  return assessment;
}
