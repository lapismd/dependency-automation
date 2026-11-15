const repositoryPattern = /^(?:lapismd|stevejuma)\/[\w.-]+$/;

export function monitoringRepositories(policy) {
  const monitoring = policy.monitoring ?? {};
  for (const key of ["repositories", "excludedRepositories"]) {
    const entries = monitoring[key] ?? [];
    if (
      !Array.isArray(entries) ||
      entries.some((value) => !repositoryPattern.test(value)) ||
      new Set(entries).size !== entries.length
    )
      throw Error(`Invalid monitoring ${key}`);
  }
  const excluded = new Set(monitoring.excludedRepositories ?? []);
  return [
    ...new Set([
      ...policy.repositories.map((entry) => entry.repository),
      ...(monitoring.repositories ?? []),
    ]),
  ]
    .filter((repository) => !excluded.has(repository))
    .sort();
}

/** Report authentication references only; never return environment values. */
export function auditWorkflowAuthentication(workflow) {
  const findings = [];
  for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
    const steps = job.steps ?? [];
    const appIds = new Set(
      steps
        .filter((step) =>
          step.uses?.startsWith("actions/create-github-app-token@"),
        )
        .map((step) => step.id)
        .filter(Boolean),
    );
    steps.forEach((step, index) => {
      const creator =
        /\bgh\s+pr\s+(?:create|edit)\b/.test(step.run ?? "") ||
        step.uses?.startsWith("changesets/action@") ||
        step.uses?.startsWith("peter-evans/create-pull-request@");
      if (!creator) return;
      const env = { ...workflow.env, ...job.env, ...step.env };
      const token =
        step.with?.token ??
        (step.uses?.startsWith("changesets/action@")
          ? env.GITHUB_TOKEN
          : (env.GH_TOKEN ?? env.GITHUB_TOKEN)) ??
        "";
      const appId = /^\$\{\{\s*steps\.([\w-]+)\.outputs\.token\s*\}\}$/.exec(
        token,
      )?.[1];
      const authentication = /(?:secrets\.GITHUB_TOKEN|github\.token)/.test(
        token,
      )
        ? "github-token"
        : appIds.has(appId)
          ? "github-app"
          : "unverified";
      findings.push({
        job: jobName,
        step: index + 1,
        authentication,
        action:
          authentication === "github-token"
            ? "Migrate generated PR writes to a repository-scoped App token."
            : authentication === "unverified"
              ? "Inspect PR authentication before enabling unattended writes."
              : "Verify repository scope and installation/secret provisioning.",
      });
    });
  }
  return findings;
}
