import { resolve } from "node:path";

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
    prBodyNotes: [
      "First-party npm updates only. Runtime and peer manifest changes include release intent. Specification checks are exempt for the trusted dependency bot; functional checks remain required. Compatible updates auto-merge only after CI succeeds and repository merge rules permit it. Major and 0.x minor updates remain draft PRs for manual review. Publication retains existing operator approval.",
    ],
  };
}
