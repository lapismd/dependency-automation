import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import YAML from "yaml";
import { firstParty } from "./policy.mjs";

const sections = ["dependencies", "optionalDependencies", "peerDependencies"];
export function releaseIntent(before, after, { versionPrivate = false } = {}) {
  if (!after.name || (after.private && !versionPrivate)) return null;
  const changed = sections.some((section) => {
    const a = before[section] ?? {},
      b = after[section] ?? {};
    return new Set([...Object.keys(a), ...Object.keys(b)])
      .values()
      .some((name) => firstParty(name) && a[name] !== b[name]);
  });
  return changed ? after.name : null;
}

export function changesetPath(scope = "lapis-first-party") {
  const key = createHash("sha256").update(scope).digest("hex").slice(0, 12);
  return `.changeset/lapis-dependencies-${key}.md`;
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
