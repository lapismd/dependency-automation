# LapisMD dependency automation

Verified first-party npm releases wake a self-hosted Renovate runner. It reads
active workspace manifests on each allowlisted repository's default branch,
checks stable npm versions and their first-party prerequisites, and opens
dependency PRs. Compatible updates auto-merge after successful CI and existing
repository merge rules. Publication, signing and deployment retain their
separate gates.

The initial configuration is **pilot / dry-run / schedule disabled**. Creating
the repository or merging its source does not enable dependency writes.

## Development

Use Node 24.15.0 and the pinned pnpm version:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm verify
actionlint .github/workflows/*.yml
pnpm inventory
```

`GH_TOKEN` is a read token for inventory discovery; public repositories can also
be read with the workflow's token. Inventory outputs live under ignored
`reports/`, including exact source revisions, owners, consumers, unpublished
references, and runtime strongly connected components. A registry error fails
the scan; only HTTP 404 means unpublished. The release notification is a hint,
never authority for a version bump.

## GitHub App setup

Create a GitHub App owned by `lapismd`, named
`lapismd-dependency-bot` (or set `LAPIS_DEPENDENCY_BOT_LOGIN` in consumers).
Choose **Any account** (public registration), so the same App can be installed
on both `lapismd` and `stevejuma/jj-store`. A private organization-owned App can
only be installed on its owning organization. Public registration does not
expand this coordinator's explicit repository allowlist.

Disable webhooks. Grant repository contents and pull requests **read/write**,
metadata **read**, and checks and commit statuses **read**. It needs no workflow
write, administration, npm, signing, or deployment credentials.

Install it for the allowlisted LapisMD repositories, this coordinator, and
separately for `stevejuma/jj-store`. Installation tokens are minted per target
repository and automatically revoked by `actions/create-github-app-token`.

Configure the following organization values, restricting the private-key secret
to this coordinator, the publisher workflows that notify it, and the
Notebook and AI Controller version-PR workflows:

| Name                               | Kind                        | Value                                                                                            |
| ---------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------ |
| `LAPIS_DEPENDENCY_APP_CLIENT_ID`   | variable                    | App client ID                                                                                    |
| `LAPIS_DEPENDENCY_APP_PRIVATE_KEY` | secret                      | App-generated PEM key                                                                            |
| `LAPIS_DEPENDENCY_BOT_GIT_AUTHOR`  | coordinator variable        | `lapismd-dependency-bot[bot] <APP_USER_ID+lapismd-dependency-bot[bot]@users.noreply.github.com>` |
| `LAPIS_DEPENDENCY_BOT_LOGIN`       | consumer variable, optional | Alternate installed App login                                                                    |

For `stevejuma/jj-store`, configure the corresponding client-ID variable and
notification key secret in that repository too. No secrets belong in this tree.

## Activation and recovery

1. Merge consumer CI/versioning integrations and publisher notification jobs.
   Enable `LAPIS_DEPENDENCY_VERSION_PR_ENABLED=true` in Notebook and AI Controller
   after their new Changesets workflows pass review. Community remains held out
   of the allowlist until its CI integration PR #2 is approved and merged. These
   workflows use repository-scoped App tokens so generated PRs start functional
   CI automatically. They only prepare version PRs; existing publication gates
   remain separate.
2. Dispatch **Reconcile first-party npm dependencies** with all write variables
   unset. Inspect inventory and Renovate dry-run summaries for the four pilot
   repositories: Mira, Design Core, Notes and Plugins.
3. Set coordinator variable `LAPIS_DEPENDENCY_WRITES=true` for the reviewed pilot.
4. Review the pilot PRs and their functional checks. Set
   `LAPIS_DEPENDENCY_PHASE=full` only after the other repository integrations land.
5. Set `LAPIS_DEPENDENCY_SCHEDULE=true` to enable the hourly catch-up scan.

Unset `LAPIS_DEPENDENCY_WRITES` to return to dry-run; unset the schedule variable
to stop scheduled scans. Manual dispatch always supports diagnosis. Failed
notifications can be retried independently of publication; an hourly scan also
discovers manual publications and missed events.

Notifications use `repository_dispatch` / `lapis-npm-published-v1` with
`repository`, a 40-character `sourceSha`, and `packages: [{name, version}]`.
Source workflows call the pinned `notify.yml` only after their verification
job succeeds. Manually published packages without a release workflow are found
by reconciliation. The coordinator does not install or invoke an npm publisher. Notebook now has
its own protected release pipeline; its publication approvals remain separate.

## Review policy

Compatible updates refresh one rolling PR per repository and auto-merge through
Renovate on a later reconciliation after all reported checks succeed. Renovate
must observe an up-to-date branch; existing review and merge requirements still
apply. `platformAutomerge: false` and `ignoreTests: false` keep failed, pending,
cancelled, or missing checks from being bypassed by native auto-merge.
Each upstream family gets a separate draft PR with auto-merge explicitly
disabled for major or 0.x minor updates. Exact, caret and tilde styles remain
intact. Existing peer support is retained; widening is proposed
only when a new version falls outside that support. Runtime cycles use lockfile
updates for already-compatible ranges to avoid release loops.

The shared post-upgrade helper adds one deterministic Changeset for affected
public runtime/peer contracts, or an empty Changeset where release-intent rules
require it. Private application roots do not become publication targets.
Repositories must complete Changesets onboarding before a runtime update can
be written. Existing independently versioned plugin packages stay independent.
Version preparation installs the pinned Deno runtime required by Changesets 3
before invoking the CLI. This is separate from the Node-only specification
validator and does not enable a consumer service.

Trusted dependency-bot PRs and existing generated version PRs skip specification
checks. The policy uses the PR author, not the person rerunning a job. Audits,
types, unit tests, builds, packaging, interactions, accessibility and existing
release gates remain active. The copied policy module is maintained here and
uses the installed validator API to retain functional lanes embedded in its
aggregate check command. Docker workers receive only its explicit public
PR-context variables, never credentials.

Existing lockfile CI-image workflows refresh digest pins after merge. Dependency
PRs install their exact candidate lockfile; a previous image digest is never
relabelled as a build of the new dependency graph. Rust, Git revisions, container
versions, and third-party dependency automation are not managed here.

`lapis-plugin-docs` is included in the full rollout with the other standalone plugins. Deprecated `terminal-host` stays excluded.
The terminal-host npm package is also ignored in remaining manifests, so stale
Deno development declarations cannot keep that legacy release chain alive.
Parked Deno desktop and server workspaces are excluded by workspace discovery.
AI Host remains included because the current Tauri application consumes its
portable file-tools leaf through Notes API. AI Controller also supplies portable
client and memory exports to the active AI plugin; no Deno service is enabled by
this automation.

Community remains temporarily excluded by operator decision. Restore its
`phase: "full"` allowlist entry only after
[its integration PR](https://github.com/lapismd/lapis-community/pull/2) lands; do
not enable its new version-PR workflow while that integration is held.

Desktop remains in ownership/consumer discovery with an explicit write hold.
Its private Profile/API 0.2.3 cohort stays pinned. Its unpublished `@lapismd/ai`
dependency and CI archive projection require qualified Renovate support before
the hold is removed. Inventory also holds any consumer with an unpublished
first-party registry dependency, rather than proposing an un-installable PR.
