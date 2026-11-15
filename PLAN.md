# Consolidated Lapis maintenance plan

## Objective and authorization

Reduce routine PRs, approval clicks, repeated builds and manual dependency
coordination using the existing Lapis bots. The user requested this complete
plan, progress tracking and implementation of the first slice on 2026-11-15.
The older organization-wide cleanup goal remains paused. This rollout does not
resume unrelated PR cleanup.

This repository owns policy, dependency discovery, scheduling, reconciliation
and machine-readable reports. Lapis CI owns shared toolchains and reusable CI
helpers. Lapis Maintenance owns the operator UI, controllers and adapters.
Packages retain their tests, compatibility decisions, signing and publication
credentials. Shared component defects remain with their source package.

## Evidence at planning time

- Coordinator run 43739383423 reported 19 repositories, 43 public package
  owners, 220 edges and no runtime cycles. Full rollout, writes and scheduled
  reconciliation were already enabled. Registry metadata remains authoritative.
- The App successfully automerged first-party updates; no replacement bot is
  needed. Major and breaking 0.x minor updates remain compatibility drafts.
- Notes and Plugins created 20 lockfile-image pin PRs from November 7 through
  the November 15 inspection. Rolling branches already exist; they limit
  simultaneous PRs but do not eliminate successive PRs.
- Notes copies generated dependency-image identity into three canonical chapters.
- Several generated version/image/profile PRs still use GITHUB_TOKEN, causing
  action-required waits. App-authenticated dependency PRs already start CI.
- Maintenance already supports workflow/environment approval, dispatch, reruns,
  cancellation and automerge. It is a static browser app; closed-app monitoring
  is deferred. Its defaults come from this coordinator's update allowlist.
- Maintenance, Lapis CI and .github are absent from that allowlist. Monitoring
  coverage must be independent of permission to update dependencies.
- The three core automation repositories had no open issues. Visual Delta issue
  19 requests Storybook 11 support; keep that as deliberate compatibility work.
- Versioning has drifted: Plugins uses Changesets 2 while Notes/Notebook and the
  generated template use Changesets 3 with Deno setup.

These are dated observations, not a live health claim. Refresh evidence at every
rollout checkpoint and record exact source revisions and commands.

## Boundaries

- Keep Community, Nostr and Deno-only repositories/packages out of this rollout.
  Classify portable packages separately from parked Deno hosts. Existing legacy
  update entries are not authorization to expand writes into excluded scope.
- Do not enable additional writes, remove holds, widen App permissions or change
  branch protections as a side effect of adding monitoring.
- Preserve functional, interaction, accessibility, audit and packaging gates.
  Missing, cancelled or stale checks cannot count as successful qualification.
- Never auto-discard manual repair commits. Give repaired PRs explicit ownership.
- Preserve immutable source/artifact identities, frozen installs and registry
  semver boundaries. Cache outages must not change validation correctness.
- Keep browser credentials out of unattended automation. Signing secrets remain
  in their owning publication workflow; uncertain writes require reconciliation.

## Delivery order and tracker

Statuses: planned, in progress, locally verified, PR open, landed, qualified.
A slice is complete only when its deployment/consumer acceptance is recorded.
Link PRs and evidence here; do not turn a local test into a rollout claim.

| Slice                                     | Owner                             | Status      | Exit condition                                                           |
| ----------------------------------------- | --------------------------------- | ----------- | ------------------------------------------------------------------------ |
| S1 Policy and trusted PR authentication   | dependency-automation + consumers | In progress | Routine trusted PRs start CI; monitoring does not grant update authority |
| S2 Remove dependency-image pin churn      | lapis-ci + Plugins, then Notes    | Planned     | Normal lockfile bumps generate zero image-pin PRs                        |
| S3 Coordinate dependency/release waves    | dependency-automation             | Planned     | Idempotent upstream-to-downstream progress with explicit blockers        |
| S4 Maintenance integration                | lapis-maintenance                 | Planned     | One UI explains waves, issues, actions and exceptions                    |
| S5 Release/registry batching and recovery | publishers + plugin-registry      | Planned     | Batches preserve signing and resume failed publication safely            |
| S6 Deno-free tooling and drift prevention | dependency-automation + consumers | Planned     | Supported tooling cohort cannot silently drift                           |

## S1: shared policy and trusted PR authentication

1. Add a monitoring-only repository list alongside the existing update allowlist.
   Include infrastructure and Maintenance itself without feeding those entries
   into Renovate, package discovery or release notifications.
2. Add strict policy validation for repository identities, duplicates and scope.
   Keep the existing schema and consumers backward compatible during rollout.
3. Add a read-only audit of PR-creating workflows. Report GITHUB_TOKEN creators,
   unknown authentication, inaccessible repositories and discovery gaps. Include
   exact source SHAs and paths. Never mint write tokens or modify targets.
4. Inspect App installation and selected-secret access for each pilot repository.
   Record missing setup without silently falling back to GITHUB_TOKEN.
5. Pilot .github's profile refresh with the existing repository-scoped App token.
   Use ephemeral checkout credentials, App identity for generated commits and
   contents/PR permissions only. Keep the existing check and rolling branch.
6. Migrate Plugins version PRs, then Notes and remaining eligible generated PRs.
   Cover drift with parsed workflow tests; retain repository-specific release
   and provenance preparation commands.
7. Adopt one required final check where necessary, proving all applicable lanes
   succeeded for the current candidate. Change repository protection only after
   replacement coverage is verified. Do not manufacture approving reviews.
8. Integrate monitoring policy into Maintenance discovery in S4. Until then,
   report that consumer adoption separately from coordinator readiness.

Validation: focused failing policy/audit tests first, pnpm verify, actionlint,
generated Renovate config validation and read-only registry inventory. Pilot
acceptance requires an App-authored PR that starts functional CI without workflow
approval. Verify missing-key behavior and unexpected-file rejection. Roll back
the individual consumer migration if validation fails; do not weaken checks.

### S1 progress

- [x] Inspect existing bots, configuration, issues, image generation and UI.
- [x] Confirm dependency App installation and narrow permissions.
- [x] Record the full rollout plan before implementation.
- [x] Implement and locally verify monitoring-only policy and authentication audit.
- [x] Confirm pilot repository installation/secret provisioning through hosted probes.
- [ ] Migrate and qualify .github profile-refresh pilot.
- [ ] Migrate and qualify generated version PR consumers.
- [ ] Adopt monitoring policy in Maintenance; audit final-check coverage.

Organization secret-selection API access returned HTTP 403 on 2026-11-15.
Installation metadata is readable. This limits provisioning verification, not
local policy/audit implementation. Never record credential values in evidence.

### S1a local qualification — 2026-11-15

The first implementation adds backward-compatible monitoring policy, validated
exclusions, `pnpm maintenance:audit`, and a daily/manual read-only Actions report.
It does not change the 19 dependency-update entries or remove any consumer hold.
The Maintenance browser still needs the S4 policy adapter. Authentication
migration is not complete and no reduction in approval clicks is claimed yet.

- Focused original regression: 4 passed, 1 failed (missing infrastructure scope).
  Repaired target: 5 passed, 0 failed; combined policy/workflow tests: 8/8.
- `pnpm verify`: formatting, syntax, policy and workflow pins passed; 29 tests
  passed, 0 failed.
- `actionlint .github/workflows/*.yml`: passed, including the new report job.
- Generated Plugins Renovate configuration validated successfully. Validator
  warned that optional native RE2 was unavailable and used RegExp fallback.
- Authenticated read-only `pnpm maintenance:audit`: 25 repositories inspected,
  zero unavailable; 15 GITHUB_TOKEN creator steps, one App reference and two
  unverified references. Findings are limited to the documented detector scope.
- Authenticated read-only `pnpm inventory`: 19 repositories, 43 package owners,
  220 edges, zero runtime cycles. Desktop's unpublished dependency/hold remains.
- Reports are ignored local artifacts under `reports/`; hosted reports have
  14-day retention. PR #7 merged as `7a0110219fd7f4eec24ad2294b7635807e2e8e97`.
  Main CI run 43747651889 and hosted audit run 43747653779 both passed; artifact
  14174058961 proves report upload. S1a is hosted-qualified.

### S1b readiness and authentication migration

- [x] Land and run the manual read-only App probe for .github, Plugins and Notes.
- [x] Record installation or credential-access gaps without retrieving values.
- [x] Keep key use central; design the profile write worker around verified
      originating workflows, source revisions, allowed files and expected diffs.
- [x] Qualify one App-authored profile PR starting CI without manual approval.
- [ ] Extend the qualified pattern to generated version PRs.

The probe uses the existing coordinator secret, requests a token scoped to one
explicit repository with read-only contents/PR permissions, and performs GETs
only. It does not prove write readiness or alter App installation/settings.

Local readiness validation: workflow-policy tests passed 4/4, the full suite
passed 30/30, formatting and actionlint passed, and generated Renovate config
validated (optional native RE2 fallback warning retained). Hosted probe results
remain pending until the manual workflow lands on main.

PR #8 merged as `cdd744cd`. Plugins probe 43751191293 and Notes probe
43751193508 passed. Initial .github probe 43751188837 found an installation
404 with both credentials available. The user added .github to the existing
installation; rerun 43751406794 passed. All three pilots now have qualified
read-only App access, without retrieving, copying or rotating any secret.

Maintenance's monitoring-policy adapter is being qualified independently while
the central profile PR writer is prepared. This is partial S4 adoption, not
completion of the planned wave, issues or automation-history UI.
Consumer PR: https://github.com/lapismd/lapis-maintenance/pull/6. Local
qualification passed 188 unit tests, 18 browser tests, 175 Storybook scenarios,
seven PWA checks, type checks, builds and specs. Hosted PR check 43752014387
passed and PR #6 merged as `8120ce8492114427dce1fee52e176775f2868f2c`.
Main/Pages run 43752491073 is pending.

The central profile pilot uses separate generation and publication jobs.
Generation executes the source-owned `.github` updater with read-only access
and no App secret. Publication runs coordinator code only, downloads the same
run's README artifact, validates npm-cell grammar against the exact current
source and configured packages, and mints one-repository App access. Manual
branch commits, unexpected files and stale source stop publication. Rolling
updates preserve history with fast-forward-only ref writes; identical pending
candidates perform no writes. An orphaned branch after an uncertain PR write
needs reconciliation rather than automatic overwrite.

The workflow is manual-only. Before its first dispatch, retire the old `.github`
hourly writer through a source PR, retaining updater tests. Qualify the rolling
PR with App-authored CI before enabling the coordinator schedule. The focused
regression started with one failed module target; repaired writer tests pass
8/8 and combined workflow tests pass 13/13. Retained branches are reusable only
when their exact head belongs to a merged bot PR; uncertain orphan branches
remain blocked. Full local verification passed 39 tests, formatting, syntax,
workflow pins and actionlint. Generated Renovate validation passed with the
known optional native RE2 fallback warning. Read-only registry inventory still
reports 19 repositories, 43 package owners, 220 edges and no cycles; Desktop's
hold remains. Hosted write acceptance is pending.

Coordinator pilot PR #9 merged as `8db2dbb9`; source migration PR
lapismd/.github#10 merged as `e7bd42ca`. Hosted pilot 43752971286 passed
generation and publication. Commit `34fcfe8e` is attributed to the dependency
App and updates only the permitted profile diff against main. The inherited
PR #9, created by github-actions, has no Actions run for that new head. Its
older action-required run 43743636923 was approved using `gh` and passed;
that old-head result is not current-head acceptance.

The follow-up performs a one-time creator handover: after validating and
updating the bot-owned branch, close the legacy github-actions PR and create
an App-owned replacement. Ordinary checks remain required; no schedule is
enabled yet. The new regression covers even an identical candidate on a legacy
PR, so deduplication cannot prevent the handover. Writer tests pass 9/9.

Maintenance main run 43752491073 passed both check and deployment; deployment
7808718582 reports success for `8120ce8492114427dce1fee52e176775f2868f2c`.
The public Pages entry point returned HTTP 200. Shared monitoring adoption is
hosted-qualified; the remaining S4 wave, issue and action features are planned.

The creator handover PR #10 merged as `93a6f54e`. Hosted pilot 43753392589
passed and replaced the legacy PR with App-created lapismd/.github#11, head
`77ff9bfe`. Its ordinary PR check 43753449724 passed without workflow approval;
PR #11 merged as `11e8fdaa703ef18f7d0ea9e1cf8c8b71e2c376e8`. A repeat pilot
43753589998 passed and returned `{"state":"unchanged"}` with no new PR.
The old inherited head also received a later successful CI run 43753190173,
so its initially missing run is not evidence of a persistent GitHub defect.

The qualified workflow now has an hourly schedule gated by the explicit
`LAPIS_PROFILE_REFRESH_ENABLED` repository variable. Keep the gate disabled
until the schedule change lands; enabling it is part of this approved rollout.
Manual dispatch remains available for recovery. Writer state remains confined
to the existing rolling branch and PRs; no source key distribution is needed.

Plugins version-PR authentication is locally qualified separately: the existing
encrypted App key is already consumed by its successful release notification
workflow. The migration scopes its PR writer to this repository, retains public
eligibility and the existing version command, and pins action revisions. There
are currently no pending eligible changesets; do not manufacture a package bump
just to exercise the writer. Hosted migration/next eligible candidate acceptance
will be recorded with the source PR.

Source PR: https://github.com/lapismd/lapis-plugins/pull/140 (head `4e4a650b`).
Local qualification passed 232 release-tooling tests, all three specification
lanes, audit under the existing policy, actionlint and formatting. The original
eligibility case and new authentication case both pass independently. Hosted
CI remains pending; this does not claim a generated version PR has run yet.

Rollback: remove the audit workflow/command and optional monitoring field;
dependency reconciliation and publication retain their existing behavior.

## S2: remove lockfile-image PRs

1. Inventory current image contracts, validators, canonical mappings and callers.
2. Put reusable producer/resolver helpers in lapis-ci. Keep package dependency
   layers separate from the shared toolchain image.
3. Define a complete input identity including toolchain digest, Dockerfile,
   lockfile, relevant manifests/workspace configuration, patches and platform.
4. Publish dependency layers once per identity and attest their producer/source.
   Resolve and verify the identity-to-immutable-digest mapping before use.
5. On a cache miss, run the pinned toolchain with an exact frozen install. Never
   relabel an old layer as the candidate graph. Fail on invalid provenance.
6. Pilot in Plugins, then Notes. Replace per-digest canonical snapshots with
   stable normative rules and immutable build receipts. Update governing specs
   before changing executable contracts.
7. Remove obsolete pin-PR producers and close only proven superseded bot PRs.
   Keep human-reviewed shared-toolchain changes as source PRs.

Validate cold/warm/cache-missing paths, mismatched identity and provenance,
both architectures, functional lanes and local/hosted parity. A normal lockfile
update must create no follow-up image-pin PR. Retain the old resolver for rollback
until both consumers qualify; rollback must still install the candidate graph.

## S3: dependency and release waves

1. Extend discovered graph edges with update type, compatibility, release intent,
   consumer acceptance and explicit holds. Do not hand-maintain npm edges.
2. Coalesce release notifications; registry availability verifies every event.
3. Plan affected consumers in dependency order. Wait for required upstream
   versions and qualification before opening the next wave. Group compatible
   updates into one rolling PR per consumer; isolate breaking compatibility work.
4. Persist wave state and operation identities. Deduplicate repeat events, stale
   commits and already published versions; reconcile accepted/uncertain writes.
5. Add explicit bot-owned versus repair-owned PR handover. Regenerate only
   untouched bot branches; retain and surface manual work.
6. Wake on completion/publication notifications with scheduled recovery. Preserve
   separate cross-account access for jj-store and do not grant global writes.

Validate duplicate/out-of-order/missed events, unpublished prerequisites,
multiple publishers, held consumers, cycles, partial failure and repair commits.
Prove one foundation release reaches affected consumers without duplicate PRs.
Roll back scheduling to existing reconciliation without losing pending work.

## S4: bundle operator features into Maintenance

1. Follow its spec-first workflow and existing controller/read/command ports.
2. Consume the shared monitoring policy and versioned coordinator reports.
   Display coverage gaps, exclusions and stale/unavailable reports explicitly.
3. Add dependency/release wave details, upstream blockers and downstream progress.
4. Add open GitHub issues alongside PRs and current main failures. Link Visual
   Delta issue 19 as a compatibility project, not an automatic upgrade.
5. Distinguish running work, expected upstream waits, approval waits, compatibility
   decisions, repair ownership and publication failures in the attention inbox.
6. Show automation decisions with reason, policy revision and immutable targets.
7. Add confirmed batch actions only for individually eligible targets. Revalidate
   each immediately before writing; report partial/uncertain results separately.
8. Run unattended collection in coordinator Actions. The browser reads reports
   and performs confirmed commands using its existing credential boundaries.

Verify fixture-only Storybook, unit/browser/interaction/accessibility lanes,
specifications, static builds, real disposable action acceptance and Pages/PWA
delivery. No private data in public reports, service-worker assets or fixtures.
Preserve ordinary manual controls when coordinator reports are unavailable.

## S5: release and registry efficiency

1. Measure PRs/build minutes per release; distinguish required review from churn.
2. Batch related plugin submissions/publications using the existing queue and
   signing authority. Preserve per-plugin source/version/signature verification.
3. Reuse qualified artifacts only when source/build inputs and provenance match.
   Promote identical image digests to release tags instead of rebuilding them.
4. Make upload/publication steps resumable and idempotent. Verify already existing
   bytes; never overwrite a conflicting version or replay uncertain writes.
5. Surface publication progress and recovery actions in Maintenance reports.

Validate reproducibility, signatures, partial upload, duplicate dispatch,
cross-platform manifests and production read-back. A failed upload must recover
without repeating completed qualification or publishing duplicate releases.

## S6: tooling and drift control

1. Select and qualify a supported Deno-free versioning contract. Audit CLI API and
   command compatibility before replacing Changesets 3 or its Deno installer.
2. Migrate templates and active consumers together; leave excluded hosts alone.
3. Keep Storybook/Playwright/Vitest as tested compatibility cohorts. Assign a
   single owner to each first/third-party update class; retain security coverage.
4. Audit workflow template pins, required checks, runtime exclusions and activation
   settings centrally. Fix upstream templates before regenerating consumers.
5. Store exact approved advisory exceptions with dependency path and expiry;
   fail all other findings and remove exceptions when fixes become available.

Verify a fresh generated consumer without Deno, expected version/release output,
real consumer acceptance and expired/mismatched exception rejection. Do not
introduce package patches or disable audits to make migration pass.

## Measurement and completion

Capture a dated baseline and compare a representative release wave after rollout:

- Image-pin PRs per ordinary dependency bump: target zero.
- Workflow-start approval clicks per eligible trusted bot PR: target zero.
- Compatible update PRs: at most one active rolling PR per consumer.
- Duplicate reconciliations/publications and overwritten manual repairs: zero.
- Record CI minutes, release latency, retries and interventions per wave.
- Every monitored repository and active hold appears with an explicit reason.
- Product, audit and compatibility failures remain actionable and unhidden.

For each slice append commit/PR links, exact commands and pass/failure counts,
hosted run IDs, deployment/registry receipts, remaining gaps and rollback status.
Update checkboxes only after the named boundary is proven. Do not equate zero
open PRs with no unresolved issues or unfinished releases.
