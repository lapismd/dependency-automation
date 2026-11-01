import semver from "semver";
import { minimatch } from "minimatch";

export const firstParty = (name) => /^@(?:lapismd|lapis-notes)\//.test(name);
export const excluded = (file) =>
  /(^|\/)(?:node_modules|dist|build|target|storybook-static|fixtures?|__fixtures__|examples?|tests?|\.local|\.git|\.jj)(\/|$)/.test(
    file,
  );

export function activeManifests(paths, root, workspace = {}) {
  const patterns =
    workspace.packages ?? root.workspaces?.packages ?? root.workspaces ?? [];
  const includes = patterns.filter((p) => !p.startsWith("!"));
  const excludes = patterns
    .filter((p) => p.startsWith("!"))
    .map((p) => p.slice(1));
  return paths
    .filter((file) => {
      if (excluded(file)) return false;
      if (file === "package.json") return true;
      const dir = file.replace(/\/package\.json$/, "");
      return (
        file.endsWith("/package.json") &&
        includes.some((p) => minimatch(dir, p)) &&
        !excludes.some((p) => minimatch(dir, p))
      );
    })
    .sort();
}

export function dependencies(manifest, workspace = {}) {
  return [
    "dependencies",
    "optionalDependencies",
    "peerDependencies",
    "devDependencies",
  ].flatMap((type) =>
    Object.entries(manifest[type] ?? {})
      .map(([name, value]) => {
        const catalog =
          typeof value === "string" && value.startsWith("catalog:")
            ? value.slice(8)
            : null;
        const range =
          catalog === null
            ? value
            : catalog
              ? workspace.catalogs?.[catalog]?.[name]
              : workspace.catalog?.[name];
        return { name, range, type };
      })
      .filter(
        ({ name, range }) =>
          firstParty(name) &&
          typeof range === "string" &&
          semver.validRange(range),
      ),
  );
}

export function runtimeCycles(packages) {
  const graph = new Map(
    packages.map((p) => [
      p.name,
      dependencies(p.manifest)
        .filter(
          (d) => d.type === "dependencies" || d.type === "optionalDependencies",
        )
        .map((d) => d.name),
    ]),
  );
  // Workspace protocol dependencies also participate in runtime cycles.
  for (const p of packages)
    for (const section of ["dependencies", "optionalDependencies"]) {
      for (const name of Object.keys(p.manifest[section] ?? {}))
        if (graph.has(name) && !graph.get(p.name).includes(name))
          graph.get(p.name).push(name);
    }
  let index = 0;
  const indices = new Map(),
    low = new Map(),
    stack = [],
    onStack = new Set(),
    cycles = [];
  function visit(name) {
    indices.set(name, index);
    low.set(name, index++);
    stack.push(name);
    onStack.add(name);
    for (const next of graph.get(name) ?? []) {
      if (!graph.has(next)) continue;
      if (!indices.has(next)) {
        visit(next);
        low.set(name, Math.min(low.get(name), low.get(next)));
      } else if (onStack.has(next))
        low.set(name, Math.min(low.get(name), indices.get(next)));
    }
    if (low.get(name) !== indices.get(name)) return;
    const component = [];
    let member;
    do {
      member = stack.pop();
      onStack.delete(member);
      component.push(member);
    } while (member !== name);
    if (component.length > 1 || graph.get(name)?.includes(name))
      cycles.push(component.sort());
  }
  for (const name of graph.keys()) if (!indices.has(name)) visit(name);
  return cycles;
}

export function stableVersions(metadata) {
  const latest = metadata["dist-tags"]?.latest;
  if (!semver.valid(latest) || semver.prerelease(latest)) return [];
  return Object.keys(metadata.versions ?? {})
    .filter(
      (v) =>
        semver.valid(v) &&
        !semver.prerelease(v) &&
        semver.lte(v, latest) &&
        !metadata.versions[v].deprecated,
    )
    .sort(semver.compare);
}

export function availableVersions(registry) {
  const available = new Map(
    [...registry].map(([name, data]) => [name, stableVersions(data)]),
  );
  // Remove candidates with missing first-party prerequisites until convergence.
  let changed;
  do {
    changed = false;
    for (const [name, versions] of available) {
      const kept = versions.filter((version) => {
        const m = registry.get(name).versions[version];
        return ["dependencies", "peerDependencies"].every((section) =>
          Object.entries(m[section] ?? {}).every(([dep, range]) => {
            if (
              !firstParty(dep) ||
              (m.peerDependenciesMeta?.[dep]?.optional &&
                section === "peerDependencies")
            )
              return true;
            if (!semver.validRange(range)) return false;
            return (available.get(dep) ?? []).some((v) =>
              semver.satisfies(v, range),
            );
          }),
        );
      });
      if (kept.length !== versions.length) {
        available.set(name, kept);
        changed = true;
      }
    }
  } while (changed);
  return Object.fromEntries(available);
}

export function validateNotification(payload, repositories) {
  if (!repositories.some((r) => r.repository === payload.repository))
    throw new Error("Notification source is not allowlisted");
  if (!/^[a-f0-9]{40}$/.test(payload.sourceSha ?? ""))
    throw new Error("Invalid notification source revision");
  if (!Array.isArray(payload.packages) || !payload.packages.length)
    throw new Error("Notification requires published packages");
  for (const p of payload.packages)
    if (
      !firstParty(p.name) ||
      !semver.valid(p.version) ||
      semver.prerelease(p.version)
    )
      throw new Error(
        "Notification requires stable first-party package versions",
      );
  return payload;
}
