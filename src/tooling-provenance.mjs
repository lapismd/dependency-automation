import { createHash } from "node:crypto";
import YAML from "yaml";
import semver from "semver";
const digest = (value) => /^[a-f0-9]{64}$/.test(value ?? "");
export function validatePackageManagerEvidence(value, evidence, cohort) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !semver.valid(value.version) ||
    value.version !== cohort.pnpm ||
    !digest(value.sha256)
  )
    throw Error("Invalid package-manager provenance");
  const fields =
    value.source === "manifest"
      ? ["source", "version", "path", "sha256"]
      : ["source", "version", "path", "sha256", "job", "step"];
  if (Object.keys(value).some((key) => !fields.includes(key)))
    throw Error("Invalid package-manager provenance fields");
  if (value.source === "manifest") {
    if (
      value.path !== "package.json" ||
      value.sha256 !== evidence.manifestSha256
    )
      throw Error("Invalid manifest package-manager binding");
  } else if (
    value.source !== "workflow-pin" ||
    !/^\.github\/workflows\/[\w.-]+\.ya?ml$/.test(value.path) ||
    !/^[\w-]+$/.test(value.job ?? "") ||
    typeof value.step !== "string" ||
    !value.step.length ||
    value.step.length > 200
  )
    throw Error("Invalid workflow package-manager binding");
  return value;
}
export function manifestPackageManager(manifest, sha256) {
  const version = /^pnpm@(\d+\.\d+\.\d+)(?:\+.*)?$/.exec(
    manifest.packageManager ?? "",
  )?.[1];
  return version
    ? { source: "manifest", version, path: "package.json", sha256 }
    : null;
}
export function workflowPackageManager(source, reference) {
  if (reference?.source !== "workflow-pin")
    throw Error("Missing reviewed workflow package-manager source");
  const steps = YAML.parse(source)?.jobs?.[reference.job]?.steps;
  const selected = Array.isArray(steps)
    ? steps.filter((step) => step.name === reference.step)
    : [];
  const version =
    selected.length === 1 &&
    /^corepack enable\r?\ncorepack prepare pnpm@(\d+\.\d+\.\d+) --activate\r?\n?$/.exec(
      selected[0].run ?? "",
    )?.[1];
  if (!version || version !== reference.version)
    throw Error("Changed or unavailable workflow package-manager command");
  return {
    ...reference,
    sha256: createHash("sha256").update(source).digest("hex"),
  };
}
