const recipes = {
  "lapismd/ai-host": ["pnpm checks:release", "pnpm packages:pack"],
  "lapismd/lapis-community": [
    "pnpm spec:check",
    "pnpm check",
    "pnpm test",
    "pnpm build",
    "pnpm test:ui:consumer",
    "pnpm test:storybook:all",
    "pnpm build-storybook",
  ],
};

// These repositories had no pull-request functional pipeline. Keep release
// authority separate, and run their existing package-owned validation commands.
export function consumerChecks(repository, packageManager, context) {
  const commands = recipes[repository];
  if (!commands) return null;
  const version = /^pnpm@(\d+\.\d+\.\d+)(?:\+.*)?$/.exec(packageManager)?.[1];
  if (!version) throw Error("PR checks require a pinned pnpm version");
  const steps = [
    {
      uses: "actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803",
      with: { "fetch-depth": 0 },
    },
    {
      uses: "actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38",
      with: { "node-version": "24.15.0" },
    },
    { run: `corepack enable && corepack prepare pnpm@${version} --activate` },
    {
      uses: "taiki-e/install-action@68a389c788b2cd04016ce8c80ee23b80d2ab3d68",
      with: { tool: "mdbook@0.5.4" },
    },
  ];
  steps.push({
    name: "Install exact candidate dependencies",
    run: "pnpm install --frozen-lockfile",
  });
  if (repository === "lapismd/lapis-community")
    steps.push({ run: "pnpm exec playwright install --with-deps chromium" });
  steps.push(
    { name: "Audit dependencies", run: "pnpm audit" },
    {
      name: "Enforce specification-first changes",
      if: "github.event_name == 'pull_request'",
      env: {
        PR_BASE: "${{ github.event.pull_request.base.sha }}",
        PR_HEAD: "${{ github.event.pull_request.head.sha }}",
      },
      run: 'pnpm spec:first --base "$PR_BASE" --head "$PR_HEAD"',
    },
    ...commands.map((run) => ({ name: run, run })),
  );
  return {
    name: "Check dependency candidates",
    on: { pull_request: null, workflow_dispatch: null },
    permissions: { contents: "read" },
    env: context,
    jobs: {
      check: { "runs-on": "ubuntu-latest", "timeout-minutes": 90, steps },
    },
  };
}
