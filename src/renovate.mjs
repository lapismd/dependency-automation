import { resolve } from "node:path";
import semver from "semver";
import { dependencies } from "./policy.mjs";
import { lockVersion } from "./wave-evidence.mjs";
import { dependencyNotes } from "./pr-messages.mjs";

export function repositoryConfig(repo, graph, automationRoot) {
  const own = graph.packages
    .filter((p) => p.repository === repo.repository)
    .map((p) => p.name);
  const quotedPath =
    "'" +
    resolve(automationRoot, "scripts/prepare-pr.mjs").replaceAll("'", "'\\''") +
    "'";
  const command = `node ${quotedPath}`;
  const packageRules = [
    { matchPackageNames: ["*"], enabled: false },
    {
      matchDatasources: ["npm"],
      matchPackageNames: ["@lapismd/**", "@lapis-notes/**"],
      enabled: true,
      rangeStrategy: "bump",
      groupName: "Lapis first-party dependencies",
      groupSlug: "lapis-first-party",
      separateMajorMinor: false,
      separateMinorPatch: false,
    },
    { matchDepTypes: ["peerDependencies"], rangeStrategy: "widen" },
    {
      matchPackageNames: ["@lapismd/**", "@lapis-notes/**"],
      matchUpdateTypes: ["major"],
      groupName: null,
      groupSlug: null,
      draftPR: true,
      automerge: false,
    },
    {
      matchPackageNames: ["@lapismd/**", "@lapis-notes/**"],
      matchCurrentVersion: "<1.0.0",
      matchUpdateTypes: ["minor"],
      groupName: null,
      groupSlug: null,
      draftPR: true,
      automerge: false,
    },
  ];
  for (const [name, versions] of Object.entries(graph.available)) {
    packageRules.push(
      versions.length
        ? {
            matchPackageNames: [name],
            allowedVersions: `/^(?:${versions.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})$/`,
          }
        : { matchPackageNames: [name], enabled: false },
    );
  }
  for (const name of graph.unpublished)
    packageRules.push({ matchPackageNames: [name], enabled: false });
  const families = new Map();
  for (const p of graph.packages) {
    if (!families.has(p.repository)) families.set(p.repository, []);
    families.get(p.repository).push(p.name);
  }
  for (const [source, names] of families) {
    const family = source.split("/")[1];
    const rule = {
      matchPackageNames: names,
      groupName: `Lapis ${family} compatibility`,
      groupSlug: `lapis-${family}-compatibility`,
      draftPR: true,
      automerge: false,
    };
    packageRules.push({ ...rule, matchUpdateTypes: ["major"] });
    packageRules.push({
      ...rule,
      matchCurrentVersion: "<1.0.0",
      matchUpdateTypes: ["minor"],
    });
  }
  for (const cycle of graph.cycles)
    for (const p of repo.manifests.filter((m) =>
      cycle.includes(m.manifest.name),
    )) {
      packageRules.push({
        matchFileNames: [p.path],
        matchPackageNames: cycle,
        matchDepTypes: ["dependencies", "optionalDependencies"],
        rangeStrategy: "update-lockfile",
      });
    }
  const admission = graph.waveAdmission?.nodes.find(
    (n) => n.repository === repo.repository,
  );
  if (graph.waveAdmission) {
    const qualifiedRolling = (pr) =>
      pr.head?.ref === "lapis-dependencies/lapis-first-party" &&
      pr.qualification?.state === "qualified" &&
      pr.basedOnCurrentSource &&
      pr.candidate?.visibility === "public" &&
      admission?.admittedUpdates.every((u) => {
        const manifest = pr.candidate.manifests.find(
          (p) => p.path === u.path,
        )?.manifest;
        const range =
          manifest &&
          dependencies(manifest, pr.candidate.workspace).find(
            (e) => e.name === u.name && e.type === u.type,
          )?.range;
        if (u.type === "peerDependencies")
          return (
            semver.validRange(range) &&
            semver.satisfies(u.target, range) &&
            semver.subset(u.range, range)
          );
        const resolved = lockVersion(pr.candidate, u).version;
        return (
          resolved && semver.gte(resolved, u.target) && range === u.targetRange
        );
      });
    // Existing PRs may merge only with complete current-head qualification.
    // A regenerated/new head must acquire fresh CI on a later reconciliation.
    packageRules.push({
      matchPackageNames: ["@lapismd/**", "@lapis-notes/**"],
      automerge: false,
    });
    for (const pr of repo.evidence?.prs ?? [])
      if (qualifiedRolling(pr))
        packageRules.push({
          matchPackageNames: ["@lapismd/**", "@lapis-notes/**"],
          matchUpdateTypes: ["patch", "minor"],
          matchCurrentVersion: ">=1.0.0",
          automerge: true,
        });
    for (const pr of repo.evidence?.prs ?? [])
      if (qualifiedRolling(pr))
        packageRules.push({
          matchPackageNames: ["@lapismd/**", "@lapis-notes/**"],
          matchUpdateTypes: ["patch"],
          matchCurrentVersion: "<1.0.0",
          automerge: true,
        });
    if (
      admission?.status !== "admitted" ||
      admission.sourceSha !== repo.sourceSha
    )
      throw Error("Wave target is not admitted at this source revision");
    // Last matching rules restrict even otherwise eligible registry versions.
    packageRules.push({
      matchPackageNames: ["@lapismd/**", "@lapis-notes/**"],
      enabled: false,
    });
    for (const edge of graph.edges.filter(
      (e) => e.repository === repo.repository,
    )) {
      const targets = [
        ...new Set(
          admission.admittedUpdates
            .filter(
              (u) =>
                u.name === edge.name &&
                u.path === edge.path &&
                u.type === edge.type,
            )
            .map((u) => u.target),
        ),
      ];
      const match = {
        matchPackageNames: [edge.name],
        matchFileNames: [edge.path],
        matchDepTypes: [edge.type],
      };
      packageRules.push(
        targets.length
          ? {
              ...match,
              enabled: true,
              ...(admission.admittedUpdates.some(
                (u) =>
                  u.name === edge.name &&
                  u.path === edge.path &&
                  u.type === edge.type &&
                  u.type !== "peerDependencies" &&
                  u.targetRange === u.range,
              )
                ? { rangeStrategy: "update-lockfile" }
                : {}),
              allowedVersions: `/^(?:${targets.map((v) => v.replaceAll(".", "\\.")).join("|")})$/`,
            }
          : { ...match, enabled: false },
      );
    }
    const catalogNames = new Set(
      admission.admittedUpdates
        .filter((u) =>
          repo.manifests
            .find((p) => p.path === u.path)
            ?.manifest[u.type]?.[u.name]?.startsWith("catalog:"),
        )
        .map((u) => u.name),
    );
    for (const name of catalogNames) {
      const targets = [
        ...new Set(
          admission.admittedUpdates
            .filter((u) => u.name === name)
            .map((u) => u.target),
        ),
      ];
      packageRules.push({
        matchPackageNames: [name],
        matchFileNames: ["pnpm-workspace.yaml"],
        enabled: true,
        allowedVersions: `/^(?:${targets.map((v) => v.replaceAll(".", "\\.")).join("|")})$/`,
      });
    }
  }
  return {
    repository: repo.repository,
    enabledManagers: ["npm"],
    includePaths: repo.paths,
    ignoreDeps: [...own, ...(graph.excludedPackages ?? [])],
    dependencyDashboard: false,
    dependencyDashboardTitle: "Lapis first-party dependency updates",
    branchPrefix: "lapis-dependencies/",
    pruneStaleBranches: false,
    onboarding: false,
    requireConfig: "ignored",
    automerge: true,
    automergeType: "pr",
    platformAutomerge: false,
    ignoreTests: false,
    rebaseWhen: "behind-base-branch",
    ignoreUnstable: true,
    respectLatest: true,
    minimumReleaseAge: "0 days",
    ignoreScripts: true,
    // Dependabot retains security coverage. This runner handles version PRs
    // for the first-party allowlist and does not request alert permissions.
    vulnerabilityAlerts: { enabled: false },
    lockFileMaintenance: { enabled: false },
    prCreation: "immediate",
    prHourlyLimit: 0,
    branchConcurrentLimit: 0,
    labels: ["dependencies"],
    packageRules,
    postUpgradeTasks: {
      commands: [command],
      executionMode: "branch",
      dataFileTemplate: '{"branchName":"{{{branchName}}}"}',
      fileFilters: [".changeset/lapis-dependencies-*.md"],
    },
    prBodyNotes: [dependencyNotes(repo, graph)],
  };
}
