import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import semver from "semver";
import YAML from "yaml";
import { validateWorkspaceIntakePolicy } from "./canonical-workspace-policy.mjs";

export const intakePolicyPath =
  ".github/dependency-automation/canonical-intake.json";
export const intakeInputs = [
  "package.json",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
];
export const intakeHash = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
const fail = (reason) => {
  throw Error(`Canonical intake held: ${reason}`);
};
const exact = (v, keys) =>
  v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).length === keys.length &&
  Object.keys(v).every((k) => keys.includes(k));
const canonical = (v) =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, canonical(v[k])]),
        )
      : v;
export function validateIntakePolicy(policy, repository) {
  if (policy?.schemaVersion === 2)
    return validateWorkspaceIntakePolicy(policy, repository);
  if (
    !exact(policy, [
      "schemaVersion",
      "kind",
      "repository",
      "dependency",
      "slot",
      "chapters",
    ]) ||
    policy.schemaVersion !== 1 ||
    policy.kind !== "single-development-dependency" ||
    policy.repository !== repository ||
    !/^(?:lapismd|stevejuma)\/[\w.-]+$/.test(repository) ||
    !/^@(?:lapismd|lapis-notes)\/[a-z0-9._-]+$/.test(policy.dependency) ||
    !/^[a-z][a-z0-9-]{0,63}$/.test(policy.slot) ||
    !Array.isArray(policy.chapters) ||
    policy.chapters.length !== 2 ||
    new Set(policy.chapters).size !== 2 ||
    policy.chapters.some(
      (p) =>
        !/^spec\/src\/(?!SUMMARY\.md$|verification\.md$)[a-zA-Z0-9_/-]+\.md$/.test(
          p,
        ) || p.includes(".."),
    )
  )
    fail("unsupported source policy");
  return policy;
}
function parse(bytes) {
  if (
    intakeInputs.some(
      (p) =>
        typeof bytes[p] !== "string" ||
        Buffer.byteLength(bytes[p]) > 2 * 1024 * 1024,
    )
  )
    fail("missing or oversized input");
  return {
    manifest: JSON.parse(bytes["package.json"]),
    workspace: YAML.parse(bytes["pnpm-workspace.yaml"]),
    lock: YAML.parse(bytes["pnpm-lock.yaml"]),
  };
}
export function developmentIntakeFacts(name, { manifest, workspace, lock }) {
  const version = manifest.devDependencies?.[name];
  const integrity =
    lock.packages?.[`${name}@${version}`]?.resolution?.integrity;
  const importers = Object.fromEntries(
    Object.entries(lock.importers ?? {})
      .filter(([, p]) => p.devDependencies?.[name])
      .map(([path, p]) => [path, p.devDependencies[name]]),
  );
  if (
    !semver.valid(version) ||
    workspace.overrides?.[name] !== version ||
    lock.overrides?.[name] !== version ||
    !/^sha512-[A-Za-z0-9+/]{86}==$/.test(integrity ?? "") ||
    !importers["."] ||
    Object.values(importers).some(
      (v) => v.specifier !== version || v.version?.split("(")[0] !== version,
    )
  )
    fail("inconsistent development dependency, override or lock");
  const peer = manifest.peerDependencies?.[name] ?? null;
  if (
    peer !== null &&
    (!semver.validRange(peer) || !semver.satisfies(version, peer))
  )
    fail("unsupported public peer contract");
  return {
    schemaVersion: 1,
    kind: "development-dependency-intake",
    dependency: name,
    version,
    peer,
    integrity,
    importers: canonical(importers),
  };
}
export function intakeFacts(policy, policyBytes, bytes) {
  return {
    ...developmentIntakeFacts(policy.dependency, parse(bytes)),
    policySha256: intakeHash(policyBytes),
  };
}
export function intakeSlot(policy, facts) {
  return `<!-- dependency-intake:${policy.slot}:start -->\n\n\`\`\`json\n${JSON.stringify(facts, null, 2)}\n\`\`\`\n\n<!-- dependency-intake:${policy.slot}:end -->`;
}
export function slotBounds(text, policy) {
  const start = `<!-- dependency-intake:${policy.slot}:start -->`,
    end = `<!-- dependency-intake:${policy.slot}:end -->`;
  if (
    typeof text !== "string" ||
    Buffer.byteLength(text) > 256 * 1024 ||
    text.split(start).length !== 2 ||
    text.split(end).length !== 2 ||
    text.indexOf(end) < text.indexOf(start)
  )
    fail("missing or ambiguous canonical slot");
  return [text.indexOf(start), text.indexOf(end) + end.length];
}
// Normalize only version/integrity for the selected package and pnpm's hashed
// peer-context labels. Other package versions, metadata, edges and settings stay
// structurally distinct; a normalized-key collision fails closed.
export function lockShape(lock, name, version) {
  const literal = `${name}@${version}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const selectedIdentity = new RegExp(`(^|\\()${literal}(?=$|[()])`, "g");
  const replace = (s) =>
    s
      .replace(
        selectedIdentity,
        (_match, prefix) => `${prefix}${name}@<intake>`,
      )
      .replace(/\([a-f0-9]{32}\)/g, "(<peer-context>)");
  function walk(v, parent = "", selected = false) {
    if (typeof v === "string")
      return replace(
        selected && (v === version || v.startsWith(version + "("))
          ? "<intake>" + v.slice(version.length)
          : v,
      );
    if (Array.isArray(v)) return v.map((x) => walk(x, parent, selected));
    if (!v || typeof v !== "object") return v;
    const out = Object.create(null);
    for (const [key, value] of Object.entries(v)) {
      const next = replace(key);
      let item = walk(
        value,
        key,
        key === name || (selected && ["specifier", "version"].includes(key)),
      );
      if (key === `${name}@${version}` && parent === "packages")
        item = {
          ...item,
          resolution: { ...item.resolution, integrity: "<intake>" },
        };
      if (Object.hasOwn(out, next)) fail("ambiguous lock peer closure");
      out[next] = item;
    }
    return out;
  }
  return walk(lock);
}
export function prepareCanonicalIntake({
  repository,
  sourceSha,
  headSha,
  policyBytes,
  currentPolicyBytes,
  before,
  after,
  baseChapters,
  currentChapters,
  changedFiles,
}) {
  if (!/^[a-f0-9]{40}$/.test(sourceSha ?? "") || sourceSha !== headSha)
    fail("stale admitted source");
  if (
    typeof policyBytes !== "string" ||
    Buffer.byteLength(policyBytes) > 8192 ||
    policyBytes !== currentPolicyBytes
  )
    fail("missing or changed source policy");
  const policy = validateIntakePolicy(JSON.parse(policyBytes), repository);
  const allowed = new Set([...intakeInputs, ...policy.chapters]);
  if (changedFiles.some((p) => !allowed.has(p)))
    fail("unexpected candidate scope");
  const previous = parse(before),
    candidate = parse(after),
    name = policy.dependency;
  const oldFacts = intakeFacts(policy, policyBytes, before),
    facts = intakeFacts(policy, policyBytes, after);
  if (
    facts.version !== oldFacts.version &&
    (semver.diff(oldFacts.version, facts.version) !== "patch" ||
      !semver.gt(facts.version, oldFacts.version))
  )
    fail("development intake requires a forward patch");
  if (
    facts.version === oldFacts.version &&
    (facts.integrity !== oldFacts.integrity ||
      changedFiles.some((p) => intakeInputs.includes(p)))
  )
    fail("input changes require a forward Core development patch");
  const strip = (m, section) => {
    const copy = structuredClone(m);
    delete copy[section][name];
    return copy;
  };
  if (
    !isDeepStrictEqual(
      strip(previous.manifest, "devDependencies"),
      strip(candidate.manifest, "devDependencies"),
    ) ||
    !isDeepStrictEqual(
      strip(previous.workspace, "overrides"),
      strip(candidate.workspace, "overrides"),
    ) ||
    !isDeepStrictEqual(
      lockShape(previous.lock, name, oldFacts.version),
      lockShape(candidate.lock, name, facts.version),
    )
  )
    fail("unsupported manifest, workspace or lock closure");
  const outputs = {};
  for (const path of policy.chapters) {
    const base = baseChapters[path],
      current = currentChapters[path];
    const [a, b] = slotBounds(base, policy),
      expected = intakeSlot(policy, oldFacts),
      next = intakeSlot(policy, facts);
    if (base.slice(a, b) !== expected)
      fail("base canonical facts were manually changed or stale");
    const prepared = base.slice(0, a) + next + base.slice(b);
    if (current !== base && current !== prepared)
      fail("manual canonical edits must be preserved");
    if (prepared.split("\n").length > 400)
      fail("canonical chapter exceeds reviewed size bound");
    outputs[path] = prepared;
  }
  return { policy, facts, outputs };
}
