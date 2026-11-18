import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import semver from "semver";
import YAML from "yaml";

export const projectionPath =
  ".github/dependency-automation/artifact-projection.json";
export const projectionInputs = [
  "package.json",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
  "scripts/ci-sources.json",
  ".github/ci-docs/package.json",
];
export const projectionDependency = "@lapismd/spec-validator";
export const projectionRepository = "lapismd/lapis-desktop";
export const projectionHash = (s) =>
  createHash("sha256").update(s).digest("hex");
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
const fail = (reason) => {
  throw Error(`SDK artifact projection held: ${reason}`);
};
const equal = (a, b) => isDeepStrictEqual(a, b);
const exact = (v, keys) =>
  v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  equal(Object.keys(v).sort(), [...keys].sort());

export function projectionState(inputs) {
  for (const path of projectionInputs)
    if (
      typeof inputs[path] !== "string" ||
      Buffer.byteLength(inputs[path]) > 2 * 1024 * 1024
    )
      fail("missing or oversized immutable input");
  document(inputs["package.json"]);
  const manifest = JSON.parse(inputs["package.json"]),
    workspace = YAML.parse(inputs["pnpm-workspace.yaml"]) ?? {},
    lock = YAML.parse(inputs["pnpm-lock.yaml"]);
  const row = lock.importers?.["."]?.devDependencies?.[projectionDependency],
    version = row?.version;
  if (
    manifest.name !== "@lapismd/lapis-desktop" ||
    manifest.private !== true ||
    manifest.packageManager !== "pnpm@10.34.5" ||
    !semver.valid(version) ||
    !exact(row, ["specifier", "version"]) ||
    row.specifier !== manifest.devDependencies?.[projectionDependency] ||
    !semver.satisfies(version, row.specifier) ||
    ["dependencies", "optionalDependencies", "peerDependencies"].some((s) =>
      Object.hasOwn(manifest[s] ?? {}, projectionDependency),
    ) ||
    manifest.pnpm
  )
    fail("unsupported root SDK identity or scope");
  const key = `${projectionDependency}@${version}`,
    definition = lock.packages?.[key],
    snapshot = lock.snapshots?.[key];
  if (
    !definition ||
    !exact(definition.resolution, ["integrity"]) ||
    !/^sha512-[A-Za-z0-9+/]{86}==$/.test(definition.resolution.integrity) ||
    !exact(snapshot, ["dependencies"]) ||
    !exact(snapshot.dependencies, ["jiti", "typescript"])
  )
    fail("unsupported SDK closure");
  const keys = [
    key,
    ...Object.entries(snapshot.dependencies).map(([name, v]) => {
      if (!semver.valid(v)) fail("unsupported SDK dependency context");
      return `${name}@${v}`;
    }),
  ];
  for (const k of keys.slice(1))
    if (
      !lock.packages?.[k] ||
      !exact(lock.snapshots?.[k], []) ||
      !exact(lock.packages[k].resolution, ["integrity"])
    )
      fail("incomplete seeded SDK closure");
  if (
    Object.keys(lock.packages).filter((k) =>
      k.startsWith(projectionDependency + "@"),
    ).length !== 1 ||
    Object.entries(lock.importers).some(
      ([p, i]) =>
        p !== "." &&
        ["dependencies", "devDependencies", "optionalDependencies"].some(
          (s) => i[s]?.[projectionDependency],
        ),
    )
  )
    fail("shared SDK identity");
  if (
    !equal(
      workspace.overrides?.[projectionDependency],
      lock.overrides?.[projectionDependency],
    ) ||
    (workspace.overrides?.[projectionDependency] &&
      workspace.overrides[projectionDependency] !== version)
  )
    fail("inconsistent SDK override");
  if (
    Object.keys(workspace).some(
      (k) =>
        !["overrides", "patchedDependencies", "onlyBuiltDependencies"].includes(
          k,
        ),
    )
  )
    fail("unsupported workspace resolution policy");
  for (const selector of Object.keys(workspace.overrides ?? {}))
    if (
      ([projectionDependency, "jiti", "typescript"].some((n) =>
        selector.includes(n),
      ) &&
        ![projectionDependency, "jiti", "typescript"].includes(selector)) ||
      /[*?]/.test(selector)
    )
      fail("ambiguous closure override");
  for (const name of ["jiti", "typescript"]) {
    const range = workspace.overrides?.[name];
    if (
      range !== undefined &&
      (!semver.validRange(range) ||
        !semver.satisfies(snapshot.dependencies[name], range))
    )
      fail("non-public or inconsistent closure override");
  }
  if (
    Object.keys(workspace.patchedDependencies ?? {}).some((k) =>
      keys.includes(k),
    )
  )
    fail("patched SDK closure unsupported");
  return {
    manifest,
    workspace,
    lock,
    row,
    version,
    key,
    keys,
    definition,
    snapshot,
  };
}

/** Freeze all private/unselected metadata and rows; no generic peer-label masking. */
export function immutableProjectionShape(inputs) {
  const s = structuredClone(projectionState(inputs)),
    name = projectionDependency;
  s.manifest.devDependencies[name] = "<selected>";
  if (s.workspace.overrides?.[name]) s.workspace.overrides[name] = "<selected>";
  if (s.lock.overrides?.[name]) s.lock.overrides[name] = "<selected>";
  s.lock.importers["."].devDependencies[name] = {
    specifier: "<selected>",
    version: "<selected>",
  };
  const key = `${name}@<selected>`;
  s.lock.packages[key] = s.lock.packages[s.key];
  delete s.lock.packages[s.key];
  s.lock.packages[key].resolution.integrity = "<selected>";
  s.lock.snapshots[key] = s.lock.snapshots[s.key];
  delete s.lock.snapshots[s.key];
  return projectionHash(
    JSON.stringify(
      canonical({
        manifest: s.manifest,
        workspace: s.workspace,
        lock: s.lock,
        privateInventorySha256: projectionHash(
          inputs["scripts/ci-sources.json"],
        ),
        ciDocsManifestSha256: projectionHash(
          inputs[".github/ci-docs/package.json"],
        ),
      }),
    ),
  );
}

export function validateProjectionDescriptor(d, inputs) {
  if (
    !exact(d, [
      "schemaVersion",
      "kind",
      "repository",
      "dependency",
      "immutableShapeSha256",
    ]) ||
    d.schemaVersion !== 1 ||
    d.kind !== "seeded-sdk-development-lock" ||
    d.repository !== projectionRepository ||
    d.dependency !== projectionDependency ||
    !/^[a-f0-9]{64}$/.test(d.immutableShapeSha256)
  )
    fail("unsupported source descriptor");
  if (inputs && immutableProjectionShape(inputs) !== d.immutableShapeSha256)
    fail("immutable private input shape changed");
  return d;
}

export function parseProjectionDescriptor(bytes, inputs) {
  if (typeof bytes !== "string" || Buffer.byteLength(bytes) > 8192)
    fail("missing or oversized descriptor");
  document(bytes);
  return validateProjectionDescriptor(JSON.parse(bytes), inputs);
}

export function seedProjection(inputs) {
  const s = projectionState(inputs),
    overrides = Object.fromEntries(
      Object.entries(s.workspace.overrides ?? {}).filter(([k]) =>
        [projectionDependency, "jiti", "typescript"].includes(k),
      ),
    );
  return {
    "package.json":
      JSON.stringify(
        {
          name: "lapis-sdk-artifact-projection",
          private: true,
          packageManager: "pnpm@10.34.5",
          devDependencies: { [projectionDependency]: s.row.specifier },
        },
        null,
        2,
      ) + "\n",
    "pnpm-workspace.yaml": YAML.stringify(
      Object.keys(overrides).length ? { overrides } : {},
    ),
    "pnpm-lock.yaml": YAML.stringify({
      lockfileVersion: s.lock.lockfileVersion,
      settings: s.lock.settings,
      ...(Object.keys(overrides).length ? { overrides } : {}),
      importers: {
        ".": { devDependencies: { [projectionDependency]: s.row } },
      },
      packages: Object.fromEntries(s.keys.map((k) => [k, s.lock.packages[k]])),
      snapshots: Object.fromEntries(
        s.keys.map((k) => [k, s.lock.snapshots[k]]),
      ),
    }),
  };
}

function pair(document, path) {
  let node = document.contents,
    result;
  for (const key of path) {
    result = node?.items?.find((p) => p.key?.value === key);
    if (!result) fail("missing mechanical YAML path");
    node = result.value;
  }
  return result;
}
function document(bytes) {
  const d = YAML.parseDocument(bytes);
  if (d.errors.length) fail("invalid YAML input");
  return d;
}
function splice(bytes, edits) {
  let last = bytes.length;
  for (const e of edits.sort((a, b) => b.start - a.start)) {
    if (e.end > last || e.start >= e.end) fail("overlapping copyback");
    bytes = bytes.slice(0, e.start) + e.bytes + bytes.slice(e.end);
    last = e.start;
  }
  return bytes;
}

/** Copy only native pnpm SDK blocks and one existing override scalar. */
export function mergeProjection({
  before,
  candidateManifest,
  projected,
  target,
  targetRange,
  integrity,
  descriptor,
}) {
  validateProjectionDescriptor(descriptor, before);
  document(candidateManifest);
  const old = projectionState(before),
    candidate = JSON.parse(candidateManifest),
    name = projectionDependency;
  if (
    !semver.valid(target) ||
    semver.prerelease(target) ||
    ![null, "patch"].includes(semver.diff(old.version, target)) ||
    semver.lt(target, old.version) ||
    !semver.satisfies(target, targetRange) ||
    candidate.devDependencies?.[name] !== targetRange ||
    !/^sha512-[A-Za-z0-9+/]{86}==$/.test(integrity ?? "")
  )
    fail("unsupported selected transition");
  const strip = (m) => {
    m = structuredClone(m);
    delete m.devDependencies[name];
    return m;
  };
  if (
    !equal(strip(candidate), strip(old.manifest)) ||
    (target === old.version && targetRange !== old.row.specifier)
  )
    fail("unrelated candidate metadata or no-op range change");
  const lock = YAML.parse(projected["pnpm-lock.yaml"]),
    key = `${name}@${target}`;
  const keys = [key, ...old.keys.slice(1)];
  if (
    !equal(Object.keys(lock.importers ?? {}), ["."]) ||
    !exact(lock.importers["."], ["devDependencies"]) ||
    !exact(lock.importers["."].devDependencies, [name]) ||
    !equal(lock.importers["."].devDependencies[name], {
      specifier: targetRange,
      version: target,
    }) ||
    !equal(Object.keys(lock.packages ?? {}).sort(), [...keys].sort()) ||
    !equal(Object.keys(lock.snapshots ?? {}).sort(), [...keys].sort()) ||
    lock.packages[key]?.resolution?.integrity !== integrity
  )
    fail("unproved native SDK graph");
  const metadata = (d) => {
    d = structuredClone(d);
    if (d?.resolution) d.resolution.integrity = "<selected>";
    return d;
  };
  if (
    !equal(metadata(old.definition), metadata(lock.packages[key])) ||
    !equal(old.snapshot, lock.snapshots[key]) ||
    old.keys
      .slice(1)
      .some(
        (k) =>
          !equal(old.lock.packages[k], lock.packages[k]) ||
          !equal(old.lock.snapshots[k], lock.snapshots[k]),
      )
  )
    fail("shared or incompatible closure changed");
  const source = before["pnpm-lock.yaml"],
    sourceDoc = document(source),
    output = projected["pnpm-lock.yaml"],
    outputDoc = document(output),
    edits = [];
  for (const [a, b] of [
    [
      ["importers", ".", "devDependencies", name],
      ["importers", ".", "devDependencies", name],
    ],
    [
      ["packages", old.key],
      ["packages", key],
    ],
    [
      ["snapshots", old.key],
      ["snapshots", key],
    ],
  ]) {
    const p = pair(sourceDoc, a),
      q = pair(outputDoc, b);
    edits.push({
      start: p.key.range[0],
      end: p.value.range[2],
      bytes: output.slice(q.key.range[0], q.value.range[2]),
    });
  }
  if (old.lock.overrides?.[name]) {
    const p = pair(sourceDoc, ["overrides", name]);
    edits.push({
      start: p.value.range[0],
      end: p.value.range[1],
      bytes: target,
    });
  }
  let workspace = before["pnpm-workspace.yaml"];
  if (old.workspace.overrides?.[name]) {
    const p = pair(document(workspace), ["overrides", name]);
    workspace = splice(workspace, [
      { start: p.value.range[0], end: p.value.range[1], bytes: target },
    ]);
  }
  const outputs = {
    ...before,
    "package.json": candidateManifest,
    "pnpm-workspace.yaml": workspace,
    "pnpm-lock.yaml": splice(source, edits),
  };
  validateProjectionDescriptor(descriptor, outputs);
  if (target === old.version) {
    if (
      integrity !== old.definition.resolution.integrity ||
      !equal(projectionState(outputs).lock, old.lock)
    )
      fail("no-op graph drift");
    return { outputs: { ...before }, changed: false, closure: old.keys };
  }
  return { outputs, changed: true, closure: keys };
}
