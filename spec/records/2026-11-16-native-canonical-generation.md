# Native canonical candidate generation — November 16

## Observed failure

Coordinator main `e72ce609` admitted Notebook's exact Core development patch
without clearing six unrelated publication waits. Normal reconciliation
`43838472240` wrote bot PR36 head `030da1e`, but its sole changed file was
`package.json`. Consumer CI `43839212355` rejected the missing override, lock
and canonical facts in `check:dependency-intake`; all other functional lanes
passed. No manual consumer-branch repair or merge was used.

The real Renovate extractor classifies the existing override separately as
`pnpm-workspace.overrides` in `pnpm-workspace.yaml`. The wave's final deny rule
disabled that edge even while admitting the root development dependency.
The installed runner also posts an artifact-error status after a failed
preparation and branch commit; the intentionally status-read-only token cannot
perform that POST. Its native catch reports `REPOSITORY_CHANGED`, matching the
observed abort before PR body/error explanation. The hosted info log does not
retain the response details, so the exact HTTP response is not claimed.

## Source repair and qualification

- The source-profile validator gates one companion rule for the exact package
  and dependency name, workspace path, native override type and admitted target.
  Peers, runtime dependencies, another workspace, compound selectors, catalogs
  and unrelated overrides stay disabled in the actual native rule-engine test.
- Supported `statusCheckNames.artifactError: null` avoids the unauthorized
  status POST. Native errors/comments, `ignoreTests: false`, current-head wave
  qualification and repository protection remain binding. No App permission,
  release intent, channel or rollout setting changes.
- The two focused regressions initially failed and now pass. The native
  extractor/rules operate on the retained real Notebook fixture. Artifact
  reporting uses actual Renovate defaults/config merging and its status helper.
- All 106 canonical/admission/wave tests and all 295 coordinator tests pass.
  Specification validation initially rejected five bullets, then prose inside
  acceptance details; both documentation-shape failures were corrected without
  weakening the checker. The three final specification lanes pass; doctor
  reports eleven passes, and QMD discovery succeeds.
- An actual native full dry run with the generated rules and observed bot
  identity completed with exit0. Renovate generated the manifest, paired
  workspace override, mechanical lock and both exact source-owned chapters;
  its shared post-upgrade command and scripts-disabled frozen install passed.
  Native logs show the complete five-file prospective commit and PR36 body
  update. Canonical content is redacted in debug output, so no content hash is
  inferred from those placeholders. No GitHub write was enabled.
- A fresh read-only inventory succeeds with19 repositories,43 package owners,
  220 edges and zero coverage holds. Advisory preflight permits only the
  existing exact coordinator decision; requested/effective writes are false.

## Remaining acceptance

Commit and qualify the coordinator repair, deploy it, then run ordinary
reconciliation again. Inspect actual bot-generated files/body and fresh
current-head Notebook CI before merging. Successful local generation is not
hosted consumer acceptance, full-wave completion or permission to enable the
global schedule. Source-owned registry-readiness recovery and the other S6
consumers remain tracked in `PLAN.md`.
