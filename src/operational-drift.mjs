const firstParty = ["@lapismd/*", "@lapis-notes/*"];
const versionTypes = [
  "version-update:semver-major",
  "version-update:semver-minor",
  "version-update:semver-patch",
];
const activationNames = [
  "LAPIS_DEPENDENCY_WRITES",
  "LAPIS_DEPENDENCY_PHASE",
  "LAPIS_DEPENDENCY_WAVES",
  "LAPIS_DEPENDENCY_SCHEDULE",
  "LAPIS_DEPENDENCY_WAVE_STATE_WRITES",
];

export function validateOperationsPolicy(policy) {
  const fields = [
    "schemaVersion",
    "nodeVersion",
    "actionPins",
    "requiredMonitoringExclusions",
    "requiredExcludedPackages",
    "updateOwners",
    "activation",
  ];
  if (
    !policy ||
    Object.keys(policy).some((key) => !fields.includes(key)) ||
    policy?.schemaVersion !== 1 ||
    !/^24\.\d+\.\d+$/.test(policy.nodeVersion) ||
    !policy.actionPins ||
    Object.entries(policy.actionPins).some(
      ([name, pins]) =>
        !/^[\w.-]+\/[\w.-]+$/.test(name) ||
        !Array.isArray(pins) ||
        !pins.length ||
        pins.some((pin) => !/^[a-f0-9]{40}$/.test(pin)),
    )
  )
    throw Error("Invalid operational pin policy");
  if (
    JSON.stringify(policy.updateOwners) !==
    JSON.stringify({
      firstPartyVersions: "coordinator",
      thirdPartyVersions: "dependabot",
      security: "dependabot",
    })
  )
    throw Error("Invalid update ownership policy");
  if (
    !Array.isArray(policy.requiredMonitoringExclusions) ||
    !Array.isArray(policy.requiredExcludedPackages) ||
    policy.requiredMonitoringExclusions.some(
      (value) => !/^(?:lapismd|stevejuma)\/[\w.-]+$/.test(value),
    ) ||
    policy.requiredExcludedPackages.some(
      (value) => !/^@[\w.-]+\/[\w.-]+$/.test(value),
    ) ||
    new Set(policy.requiredMonitoringExclusions).size !==
      policy.requiredMonitoringExclusions.length ||
    new Set(policy.requiredExcludedPackages).size !==
      policy.requiredExcludedPackages.length ||
    Object.keys(policy.activation ?? {}).some(
      (name) => !activationNames.includes(name),
    ) ||
    activationNames.some(
      (name) =>
        !Object.hasOwn(policy.activation ?? {}, name) ||
        !(
          name.endsWith("PHASE") ? ["pilot", "full"] : ["true", "false"]
        ).includes(policy.activation[name]),
    )
  )
    throw Error("Invalid operational exclusion/activation policy");
  return policy;
}

/** Bounded source scan: no script interpretation or remote action-body claims. */
export async function auditOperationalSource(workflow, readAction, policy) {
  const findings = [],
    unknowns = [];
  let localActions = 0;
  async function scan(steps, location, stack = []) {
    for (let index = 0; index < (steps ?? []).length; index++) {
      const step = steps[index],
        at = { location, step: index + 1 };
      if (!step.uses) continue;
      if (step.uses.startsWith("./")) {
        const path = step.uses.slice(2);
        if (
          !/^[\w./-]+$/.test(path) ||
          path.split("/").includes("..") ||
          stack.length >= 32 ||
          stack.includes(path)
        ) {
          unknowns.push({ ...at, kind: "local-action-cycle-or-invalid-path" });
          continue;
        }
        let doc;
        try {
          doc =
            (await readAction(`${path}/action.yml`)) ??
            (await readAction(`${path}/action.yaml`));
        } catch {
          /* opaque unknown below */
        }
        if (!doc?.runs) {
          unknowns.push({ ...at, kind: "local-action-unavailable" });
          continue;
        }
        localActions++;
        if (doc.runs.using === "composite")
          await scan(doc.runs.steps, path, [...stack, path]);
        else if (/^node\d+$/.test(doc.runs.using)) {
          if (doc.runs.using !== "node24")
            findings.push({ ...at, kind: "local-action-node-runtime-drift" });
        } else unknowns.push({ ...at, kind: "local-action-body-uninspected" });
        continue;
      }
      if (step.uses.startsWith("docker://")) {
        unknowns.push({ ...at, kind: "container-action-body-uninspected" });
        continue;
      }
      const match = /^([^@]+)@(.+)$/.exec(step.uses);
      if (!match || !/^[a-f0-9]{40}$/.test(match[2]))
        findings.push({ ...at, kind: "unpinned-action" });
      if (
        match &&
        policy.actionPins[match[1]] &&
        !policy.actionPins[match[1]].includes(match[2])
      )
        findings.push({ ...at, kind: "template-pin-drift" });
      if (match?.[1] === "actions/setup-node") {
        if (step.with?.["node-version"] !== policy.nodeVersion)
          findings.push({ ...at, kind: "node-version-drift" });
      }
      if (match?.[1] === "denoland/setup-deno")
        findings.push({ ...at, kind: "deno-runtime-source-review" });
    }
  }
  for (const [name, job] of Object.entries(workflow.jobs ?? {})) {
    if (job.uses) {
      if (!/@[a-f0-9]{40}$/.test(job.uses))
        findings.push({ location: name, kind: "unpinned-reusable-workflow" });
      unknowns.push({
        location: name,
        kind: "reusable-workflow-body-uninspected",
      });
    }
    await scan(job.steps, name);
  }
  return {
    findings,
    unknowns,
    localActions,
    scope:
      "Pinned source references and recursively resolved local actions only; remote bodies and scripts uninspected.",
  };
}

export function requiredCheckCoverage(documents, protection, rules) {
  const candidates = [];
  for (const { path, workflow } of documents) {
    const on = workflow.on;
    const pr =
      on === "pull_request" ||
      (Array.isArray(on) && on.includes("pull_request")) ||
      (on && Object.hasOwn(on, "pull_request"));
    if (!pr) continue;
    for (const [id, job] of Object.entries(workflow.jobs ?? {})) {
      const name = job.name ?? id;
      // Matrix, filters, conditions and reusable jobs need execution-specific evidence.
      const conditional = Boolean(
        job.if ||
        job.strategy?.matrix ||
        job.uses ||
        on?.pull_request?.paths ||
        on?.pull_request?.["paths-ignore"] ||
        on?.pull_request?.branches ||
        on?.pull_request?.["branches-ignore"] ||
        on?.pull_request?.types ||
        /\$\{\{/.test(name),
      );
      candidates.push({ path, name, conditional });
    }
  }
  if (
    !protection ||
    !Array.isArray(rules) ||
    rules.some(
      (r) =>
        r.type === "required_status_checks" &&
        !Array.isArray(r.parameters?.required_status_checks),
    )
  )
    return {
      state: "unavailable",
      candidates,
      reason:
        "Protection or effective branch rules inaccessible; no absence inferred.",
    };
  const contexts = [
    ...(protection.required_status_checks?.contexts ?? []),
    ...(protection.required_status_checks?.checks ?? []).map((c) => c.context),
    ...rules
      .filter((r) => r.type === "required_status_checks")
      .flatMap(
        (r) =>
          r.parameters?.required_status_checks?.map((c) => c.context) ?? [],
      ),
  ];
  const required = [...new Set(contexts)].map((name) => ({
    name,
    state: candidates.some((c) => c.name === name && !c.conditional)
      ? "source-candidate"
      : "unknown-or-missing",
  }));
  return {
    state: !required.length
      ? "no-requirements-observed"
      : required.some((r) => r.state !== "source-candidate")
        ? "source-coverage-gap"
        : "source-candidates-matched",
    required,
    candidates,
    limit:
      "Static names are not functional gate proof; current-head workflow qualification remains mandatory.",
  };
}

export function activationCoverage(response, policy) {
  if (
    !Array.isArray(response?.variables) ||
    response.total_count > response.variables.length
  )
    return { state: "unavailable" };
  const values = activationNames.map((name) => {
    const value = response.variables.find((v) => v.name === name)?.value;
    const valid = (
      name.endsWith("PHASE") ? ["pilot", "full"] : ["true", "false"]
    ).includes(value);
    return {
      name,
      value: valid ? value : value === undefined ? "absent" : "unrecognized",
      expected: policy.activation[name],
      matches: value === policy.activation[name],
    };
  });
  return {
    state: values.every((v) => v.matches) ? "matches-checkpoint" : "drift",
    values,
  };
}

export function updateOwnership(dependabot) {
  if (!dependabot)
    return { state: "unconfigured", security: "settings-unverified" };
  const npm = (dependabot.updates ?? []).filter(
    (u) => u["package-ecosystem"] === "npm",
  );
  const valid =
    npm.length > 0 &&
    npm.every((update) => {
      const ignore = update.ignore ?? [];
      return (
        firstParty.every((scope) =>
          ignore.some(
            (i) =>
              i["dependency-name"] === scope &&
              Array.isArray(i["update-types"]) &&
              versionTypes.every((type) => i["update-types"].includes(type)),
          ),
        ) &&
        ignore.every(
          (i) =>
            Array.isArray(i["update-types"]) && i["dependency-name"] !== "*",
        )
      );
    });
  return {
    state: valid ? "source-configured" : "drift",
    firstPartyVersions: "coordinator",
    thirdPartyVersions: "dependabot",
    security: "settings-unverified",
    limit:
      "Source version-update ignores must be typed; security enablement requires separate API evidence.",
  };
}

export function exclusionCoverage(repositories, policy) {
  const missingMonitoring = policy.requiredMonitoringExclusions.filter(
    (repo) => !repositories.monitoring?.excludedRepositories?.includes(repo),
  );
  const missingPackages = policy.requiredExcludedPackages.filter(
    (name) => !repositories.excludedPackages?.includes(name),
  );
  return {
    state:
      missingMonitoring.length || missingPackages.length
        ? "drift"
        : "source-retained",
    missingMonitoring,
    missingPackages,
  };
}
