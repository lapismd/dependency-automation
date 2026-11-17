const unique = (values, pattern) =>
  Array.isArray(values) &&
  values.length > 0 &&
  values.length <= 64 &&
  new Set(values).size === values.length &&
  values.every(
    (value) =>
      typeof value === "string" && pattern.test(value) && !value.includes(".."),
  );

export function validateWorkspaceIntakePolicy(policy, repository) {
  const keys = [
    "schemaVersion",
    "kind",
    "repository",
    "slot",
    "dependencies",
    "manifests",
    "chapters",
    "lockClosure",
  ];
  if (
    !policy ||
    Object.keys(policy).length !== keys.length ||
    Object.keys(policy).some((key) => !keys.includes(key)) ||
    policy.schemaVersion !== 2 ||
    policy.kind !== "workspace-dependency-intake" ||
    policy.lockClosure !== "registry-transitives" ||
    policy.repository !== repository ||
    !/^(?:lapismd|stevejuma)\/[\w.-]+$/.test(repository) ||
    !/^[a-z][a-z0-9-]{0,63}$/.test(policy.slot ?? "") ||
    !unique(policy.dependencies, /^@(?:lapismd|lapis-notes)\/[a-z0-9._-]+$/) ||
    !unique(policy.manifests, /^(?:[a-zA-Z0-9_-]+\/)*package\.json$/) ||
    !unique(
      policy.chapters,
      /^spec\/src\/(?!SUMMARY\.md$|verification\.md$)[a-zA-Z0-9_/-]+\.md$/,
    )
  )
    throw Error("Canonical intake held: unsupported workspace source policy");
  return policy;
}

export const workspaceIntakeInputs = (policy) => [
  ...new Set(["pnpm-workspace.yaml", "pnpm-lock.yaml", ...policy.manifests]),
];
