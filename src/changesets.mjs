import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import YAML from "yaml";
import { firstParty } from "./policy.mjs";

const sections = ["dependencies", "optionalDependencies", "peerDependencies"];
export function runtimeDependencyChanged(
  before,
  after,
  { workspaceBefore = {}, workspaceAfter = {} } = {},
) {
  if (!after.name) return false;
  const resolve = (values, workspace) =>
    Object.fromEntries(
      Object.entries(values ?? {}).map(([name, range]) => {
        if (typeof range !== "string" || !range.startsWith("catalog:"))
          return [name, range];
        const catalog = range.slice(8);
        return [
          name,
          catalog
            ? workspace.catalogs?.[catalog]?.[name]
            : workspace.catalog?.[name],
        ];
      }),
    );
  return sections.some((section) => {
    const a = resolve(before[section], workspaceBefore),
      b = resolve(after[section], workspaceAfter);
    return new Set([...Object.keys(a), ...Object.keys(b)])
      .values()
      .some((name) => firstParty(name) && a[name] !== b[name]);
  });
}

export function releaseIntent(
  before,
  after,
  { versionPrivate = false, workspaceBefore = {}, workspaceAfter = {} } = {},
) {
  if (!after.name || (after.private && !versionPrivate)) return null;
  return runtimeDependencyChanged(before, after, {
    workspaceBefore,
    workspaceAfter,
  })
    ? after.name
    : null;
}

export function changesetPath(scope = "lapis-first-party") {
  const key = createHash("sha256").update(scope).digest("hex").slice(0, 12);
  return `.changeset/lapis-dependencies-${key}.md`;
}

// A canonical development-only retry may inspect this metadata, never generate
// or rewrite the note. Body bytes and existing product intent remain owned by
// the Changesets writer and its separate release-target policy.
export function assertEmptyChangeset(bytes) {
  const fail = () => {
    throw Error(
      "Managed maintenance Changeset requires bounded empty release metadata",
    );
  };
  if (
    typeof bytes !== "string" ||
    !bytes.isWellFormed() ||
    Buffer.byteLength(bytes) > 8192
  )
    fail();
  const front = /^---\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m.exec(bytes);
  if (!front || front.index !== 0) fail();
  const metadata = front[1].trim() ? YAML.parse(front[1]) : {};
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(metadata)) ||
    Object.keys(metadata).length
  )
    fail();
  return true;
}

export async function writeChangeset(
  root,
  changes,
  { empty = false, scope = "lapis-first-party" } = {},
) {
  const file = join(root, changesetPath(scope));
  const packages = [...new Set(changes.filter(Boolean))].sort();
  if (!packages.length && !empty) {
    return null;
  }
  let config;
  try {
    config = JSON.parse(
      await readFile(join(root, ".changeset/config.json"), "utf8"),
    );
  } catch (error) {
    if (error.code === "ENOENT")
      throw new Error(
        "Runtime dependency updates require Changesets onboarding before writes",
      );
    throw error;
  }
  if (!config.baseBranch)
    throw new Error("Changeset configuration must name its base branch");
  let bumps = {};
  let body =
    "Refresh first-party Lapis dependencies to the published versions recorded in this pull request.";
  try {
    const previous = await readFile(file, "utf8");
    const match = /^---\r?\n([\s\S]*?)^---[ \t]*\r?\n?/m.exec(previous);
    if (!match)
      throw Error("Existing dependency Changeset has invalid frontmatter");
    bumps = YAML.parse(match[1]) ?? {};
    if (
      typeof bumps !== "object" ||
      Array.isArray(bumps) ||
      Object.values(bumps).some((v) => !["patch", "minor", "major"].includes(v))
    )
      throw Error("Existing dependency Changeset has invalid bump types");
    body = previous.slice(match[0].length).trim() || body;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  // Empty-note repositories explicitly own no package release intent. A retry
  // must remove stale generated bump metadata from this deterministic bot note
  // while preserving its review body.
  if (empty && !packages.length) bumps = {};
  for (const name of packages) bumps[name] ??= "patch";
  const frontmatter = Object.keys(bumps)
    .sort()
    .map((name) => `${JSON.stringify(name)}: ${bumps[name]}`)
    .join("\n");
  const text = `---\n${frontmatter}${frontmatter ? "\n" : ""}---\n\n${body}\n`;
  await mkdir(join(root, ".changeset"), { recursive: true });
  await writeFile(file, text);
  return text;
}
