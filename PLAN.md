# Consolidated Lapis maintenance plan

## Bot review context follow-up

- Implemented: enrich native Renovate notes and the profile writer's managed
  description with exact public-source evidence, honest CI qualification and
  working review/recovery links. Native controls and maintainer text remain
  intact; profile no-op runs remain GET-only. No new checkbox or rollout gate.
- Qualified locally: the exact profile regression changed from 9 passing / 2
  failing tests to zero failures; the combined message/profile suite passes all
  20 tests and full `pnpm verify` passes all 106 tests and three specification
  lanes. Actionlint, native Renovate configuration validation and the required
  fresh GET-only public inventory pass. Complete native Notes and historical
  profile examples were rendered without updating their live PR bodies; previews
  and scan evidence remain untracked. Hosted source review and a future genuine
  changed profile/dependency candidate remain separate deployment acceptance.

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

| Slice                                     | Owner                             | Status                                            | Exit condition                                                           |
| ----------------------------------------- | --------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------ |
| S1 Policy and trusted PR authentication   | dependency-automation + consumers | Qualified; source/main receipts recorded          | Routine trusted PRs start CI; monitoring does not grant update authority |
| S2 Remove dependency-image pin churn      | lapis-ci + Plugins, then Notes    | Qualified in Plugins and Notes                    | Normal lockfile bumps generate zero image-pin PRs                        |
| S3 Coordinate dependency/release waves    | dependency-automation             | Writable pilot active; full release chain pending | Idempotent upstream-to-downstream progress with explicit blockers        |
| S4 Maintenance integration                | lapis-maintenance                 | Deployed; live read/action ports qualified        | One UI explains waves, issues, actions and exceptions                    |
| S5 Release/registry batching and recovery | publishers + plugin-registry      | Registry batch and recovery qualified             | Batches preserve signing and resume failed publication safely            |
| S6 Deno-free tooling and drift prevention | dependency-automation + consumers | Guards landed; consumer adoption in progress      | Supported tooling cohort cannot silently drift                           |

## Current release checkpoint — November 16

This checkpoint supersedes dated implementation snapshots below; they remain
historical evidence, not current activation defaults. S3 and S6 are still open.

- [x] All four pilot completion callers are merged and have genuine successful
      dispatches. Plugins' repeated completion advanced the receiver without a
      duplicate candidate. Shared source and callback receipts are recorded in
      [publication evidence](docs/publication-evidence.md).
- [x] Coordinator publication proof PR29 merged `3f64220c`. Its 215 tests and
      three specification lanes pass, followed by successful main source CI. The
      hosted reconciliation `43809436156` is validating the deployed collector.
- [x] Notes API0.6.6 and AppProfile0.2.3 published from `1e49d754`. Independent
      registry read-back matched retained artifact bytes. Rerunning only failed
      jobs in release `43800122156` completed verification and both GitHub releases
      on attempt2, without rebuild or republish. Both packages remain on `next`.
- [x] Notes metadata-cache hardening PR141 merged `a90761f1` after hosted CI;
      124 release tests and real registry-consumer acceptance passed locally.
- [x] Tasks recurrence readiness PR27 merged `faafd55f` after all ten hosted
      gates passed. Its full local lanes include2930 units,29 native/provider
      cases and66 interaction/accessibility cases. Version PR25 must incorporate
      this source repair and obtain fresh qualification before release.
- [x] Notebook canonical repair PR37 merged `1d66bb8b`; main CI, version,
      Storybook Pages and registry publication workflows all succeeded.
- [ ] Enable Actions read on the existing bot registration and accept the
      installation permission update. Current public App metadata lacks Actions;
      the deployed capability check skips token minting and preserves the artifact
      verification hold. This is account setup, not secret retrieval or rotation.
- [ ] Complete hosted publication-proof read-back and the genuine pilot chain,
      including the compound-range lock update and replay. Latest-only admission
      remains in force; observed `next` publication is not permission to promote
      a tag or admit a channel. Restore scheduled/full rollout only after acceptance.
- [ ] Merge the shared exact development-audit helper after final CI. Source
      review regressions reject changes during collection, decision-time expiry
      and untracked dependency inputs; its full suite passes72 cases.
- [ ] Release the source-owned Mira Mermaid repair and its genuine Editor
      dependency-floor patch, then validate Docs against released packages.
      Docs' packed production peer closure must be clean before its distinct
      expiring development-only decision and shared guard can deploy.
- [ ] Qualify remaining eligible version recipes, including AI's actual Node22
      and native prerequisites, before adopting guards. A portable CLI alone is
      insufficient proof. Excluded Deno-only packages/hosts remain excluded.
- [ ] Repair trusted dependency intake's mapped canonical handoff so future
      merges do not repeat Notebook's main spec-first failure. Preserve the main
      gate and narrow PR exemption while preparing accurate source-owned evidence.

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
- [x] Migrate and qualify .github profile-refresh pilot.
- [x] Migrate and qualify generated version PR consumers.
- [x] Adopt monitoring policy in Maintenance; audit final-check coverage.

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
- [x] Extend the qualified pattern to generated version PRs.

The probe uses the existing coordinator secret, requests a token scoped to one
explicit repository with read-only contents/PR permissions, and performs GETs
only. It does not prove write readiness or alter App installation/settings.

Local readiness validation: workflow-policy tests passed 4/4, the full suite
passed 30/30, formatting and actionlint passed, and generated Renovate config
validated (optional native RE2 fallback warning retained). The hosted probes
below qualified that local boundary after the workflow landed.

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
Main/Pages qualification is recorded below.

The central profile pilot uses separate generation and publication jobs.
Generation executes the source-owned `.github` updater with read-only access
and no App secret. Publication runs coordinator code only, downloads the same
run's README artifact, validates npm-cell grammar against the exact current
source and configured packages, and mints one-repository App access. Manual
branch commits, unexpected files and stale source stop publication. Rolling
updates preserve history with fast-forward-only ref writes; identical pending
candidates perform no writes. An orphaned branch after an uncertain PR write
needs reconciliation rather than automatic overwrite.

The initial pilot was manual-only. The old `.github` hourly writer was retired
through a source PR, retaining updater tests, before the first dispatch.
App-authored CI qualified the rolling PR before schedule activation. The focused
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
PR CI 43753844810 passed every applicable lane, including all four Storybook
shards, static Storybook, release artifacts and the final validator. PR #140
merged as `46fab6d8c4de28d5a4121b7e90a060210c4ab265`. Main version workflow
43755294462 passed and correctly found no eligible changeset. This qualifies
deployment and the empty-release path; a real generated candidate remains
pending. Notes and the remaining eligible version consumers still need migration.

Schedule PR #11 passed check 43754016968 and merged as `457c4ed3`.
`LAPIS_PROFILE_REFRESH_ENABLED=true` was set through `gh variable set` and
read back successfully. The original source writer is retired; the coordinator
is the sole scheduled producer. The ordinary PR check, separate writer identity,
branch-history guards and no-op replay were all hosted-qualified before this
activation. The next hourly firing remains a rollout observation.

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

### S2 progress — shared input identity

- [x] Inspect shared-image and Plugins dependency-context contracts.
- [x] Implement reusable dependency-only input identity/receipt helper in Lapis CI.
- [x] Qualify the standalone helper and actual Plugins context locally.
- [x] Merge/qualify shared helper: https://github.com/lapismd/lapis-ci/pull/2.
- [x] Qualify verified immutable-digest resolver: https://github.com/lapismd/lapis-ci/pull/3.
- [x] Add the source-owned attested producer and staging-to-identity promotion.
- [x] Migrate/qualify Plugins, then Notes, including cache-miss frozen installs.
- [x] Remove obsolete pin producers and superseded bot PRs after acceptance.

The old Plugins tag includes only a truncated lockfile hash, while its actual
build context also reads a Dockerfile, manifests, workspace configuration and
patches. The new helper binds all permitted context bytes, paths, file/directory
modes, shared toolchain digest and both platforms. Its lookup tag uses the full
SHA-256. Source repositories still own context assembly and dependency layers.
Hidden configuration/secrets, source scripts, installed packages, symlinks and
incomplete contexts fail closed; no new Deno tooling is introduced.

Lapis CI head `5bfddfc6` passes `pnpm verify` (11/11 tests) and formatting.
The focused missing-module target initially failed once, then passed 4/4 after
implementation. Standalone CLI acceptance checks out-of-context receipts and
GitHub outputs. Plugins' real `prepareCiDependencyContext` output passed the
same acceptance command with 29 files and identity
`sha256:7e3e60b15a059a7926107cb7fc8bd278f862e2a0c654ca978e3cfabe4642f7c1`.
Its public patch README initially exposed one acceptance failure; explicitly
allowing and hashing that data repaired the exact command. Hosted CI 43754667449
passed its native image build and smoke gate. PR #2 merged as `982b122a`.
No image contents, digest pins, producers or consumer workflows have changed in
this foundation slice; it does not yet reduce image-pin PRs.

### S2 resolver qualification in progress

Lapis CI PR #3 adds the shared read-only resolver. It derives current inputs
itself, resolves a full-identity lookup tag to an immutable multi-architecture
index, verifies GitHub's signed producer identity and compares the complete
input receipt. Subject digest, both platform descriptors, main workflow, hosted
runner and certificate-bound source commit must agree. Invalid signatures or
provenance fail; known cache/service outages use the reviewed base image for
the source's unconditional candidate frozen install. No signing key or App
writer is used by the resolver.

The focused target initially failed once for its missing module, then passed
18/18. `pnpm verify` passes 29/29 repository tests. Formatter passed. A real
read-only GHCR lookup for Plugins' 29-file identity returned `miss` and its
reviewed base digest. CLI policy/schema details were checked against the
supported GitHub CLI/Sigstore sources. Hosted helper CI, positive custom
attestation publication and actual source cold/warm execution remain pending.
The producer must attest its staging digest before promoting the full identity
tag, so incomplete publication cannot advertise an unverified cache entry.

Resolver PR #3 is merged as `e20b534b`; its hosted native image gate passed.
Shared publisher/tooling PR #4 is also merged after 44 helper tests and hosted
validation. The reviewed cohort `617eb34fc337832401ef81feb9a2673033874e3b`
binds Buildx and immutable BuildKit inputs into identity. Exact host CLI setup
uses the shared toolchain checksums. An isolated native controller smoke built
and checked an amd64/arm64 OCI index; full source fetch/publication remains a
consumer gate.

Plugins adoption PR #141, head `4ae020c1`, preserves the required `image-pin`
check through a fail-closed gate, keeps all frozen installs and delegates
serialized publication without pin-PR write authority. Local source tooling,
specs, audit and fresh-base installs passed; hosted CI 43759889627 is pending.
Signed publication, full cold/warm consumer acceptance and obsolete bot review
cleanup remain required before claiming zero image-pin PRs.

### Parallel canonical specification and Pages — qualified

The additional user-requested canonical coordinator book has 14 chapters and
35 requirements, an explicit workflow/module map and strict spec-first
governance. PR #13 merged as `2bd58ec8`. Main check 43759765126 and Pages run
43759765158 passed; deployment 7809666306 succeeded. All indexed chapters,
TOC, CSS and JavaScript were read back over HTTPS at
<https://lapismd.github.io/dependency-automation/>. Operational report paths
are absent. This delivery ran in parallel with the shared publisher and Plugins
adoption; it does not change the remaining slice statuses.

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

### S3 source implementation — default-off pilot prepared

- [x] Derive package/path updates and release chains from exact lock importers,
      public source manifests and registry metadata.
- [x] Wire admitted targets and exact allowed versions into the production
      reconciliation matrix; retain flat-mode rollback.
- [x] Persist versioned operations/publication identities with generation/ref
      concurrency checks and uncertain-write read-back on a dedicated state branch.
- [x] Preserve scoped repair/abandoned compatibility branches, joint catalogs,
      current workflow coverage and exact qualified PR candidates.
- [x] Prepare public-safe Maintenance report, completion hint and manual empty-attempt recovery contracts.
- [ ] Qualify hosted state publication, the next real foundation release chain,
      replay/no-duplicate behavior and per-consumer surfaces before activation.

New wave and state-write gates remain OFF; no remote state branch, setting,
consumer PR, release or protection was changed by this slice. Existing publisher
signing/publication authority and the separate jj-store installation remain.
The [pilot/recovery/rollback runbook](docs/wave-pilot.md) names concrete gate,
read-back, source-owned completion callback and recovery steps. Maintenance can
read `report.json` at the exact state branch commit after a reviewed pilot;
absence before activation is expected. Operational snapshots remain ignored and
are not canonical/public book content.

Local qualification uses Node 24.15.0 and the existing released Deno-free
spec-validator 0.2.0. `pnpm exec spec-validator doctor` passed 11/11 and
`pnpm spec:search --semantic "dependency release waves admission reconciliation ownership"`
returned actual QMD results. `pnpm verify` passes 80/80 tests, formatting,
syntax/action pins and all three canonical lanes. `actionlint` 1.7.12 passes.
All 19 generated global Renovate configurations validate without config
errors/warnings; the actual admitted Notes wave config also passes the CLI.
The known optional native RE2 fallback warning remains unchanged.

The exact initial `node --test tests/waves.test.mjs` target failed once because
the new test file did not exist; it now passes 22/22. Wave/state/evidence/workflow
regressions cover duplicates, out-of-order/missed hints, unpublished/held sources,
multiple publishers, dev versus release chains, package SCCs, path/coupled catalog
admission, scoped repairs, incomplete/early CI, partial/uncertain writes, CAS,
originating run retention, peer widening and superseded source intent. A temporary
synthetic state-test report identity mismatch and a development syntax error each
failed once and are repaired; all functional failures are now zero. Canonical
format/map failures were corrected with no requirement or assertion weakening.

Authenticated GET-only inventory through the existing gh CLI authentication
finds 19 public repositories, 43 public package owners, 220 edges, zero runtime
cycles and zero coverage gaps. It admits Design Core 0.13.4 in Notes API,
File Explorer, UI and Workspace while Plugins waits for the affected publisher
contracts; existing compatibility branches remain scoped/retained. Desktop's
unpublished AI dependency and explicit Profile/API hold remain. No credentials
were extracted: a local ignored transport delegates GitHub GETs to `gh api`;
registry reads remain public. State/report write tests use synthetic storage.

The concurrent S1 detector correction is also included: the exact
`node --test --test-name-pattern 'Changesets github-token input' tests/maintenance-policy.test.mjs`
regression changed from one failure to one pass; its owning suite passes 6/6.
It recognizes Notebook's pinned v2 `with.github-token` App reference and
Terminal's pinned v1 input, retaining legacy explicit environment precedence.
Source workflow evidence remains separate from actual generated-candidate CI.

Source [PR #16](https://github.com/lapismd/dependency-automation/pull/16)
contains verified source commit
[`417c1698a963`](https://github.com/lapismd/dependency-automation/commit/417c1698a963).
It is based on merged specification-entrypoint main `ee307a21`; hosted S3
acceptance and gate activation remain pending the operator's review.

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
   command compatibility before removing runtime setup or changing CLI majors.
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

### S6a source foundation — 2026-11-15

- [x] Verify official registry metadata, tarball integrity and upstream executable bytes for Changesets 2.31.1 and 3.0.3; both are Node-only, correcting the earlier Deno requirement assumption.
- [x] Execute fresh generated Prettier-only consumers on Node 24 without Deno for both CLI majors; prove the Deno-config coexistence negative and block it before App minting rather than force another formatter.
- [x] Add central source-observed cohorts for six repositories, explicit missing coverage, and production candidate rejection before release-intent writes.
- [x] Preserve existing CLI majors and refuse to overwrite source-owned version recipes; remove redundant Deno only from the upstream version template.
- [x] Qualify hosted S6a source checks and reviewed source merge through PR18; consumer deployment remains below.
- [ ] Adopt and qualify the guard in eligible Node consumers. AI Controller and other excluded Deno-only boundaries remain outside this rollout; Notes' shared portable/frozen setup must not lose its installer without whole-recipe proof.
- [x] Implement central required-check, runtime-exclusion, activation and deployed-template/pin drift source coverage in S6b; hosted deployment and remediation remain below.
- [x] Implement exact coordinator advisory/path/version/dependency-source/lock/expiry policy with expired and mismatched rejection; individual decisions require explicit operator approval.
- [ ] Qualify all remaining tool cohorts and source/consumer tuples; S6 is not complete.

See [the exact-source tooling rollout inventory and runbook](docs/tooling-rollout.md).
Local qualification: the original missing-module target failed once; the
repaired tooling tests pass 11/11 and pnpm verify passes 91/91 plus all three
spec lanes. Both explicit qualify-tooling commands pass on Node 24.19.0,
including Prettier-only mutation and the CLI 3 Deno-config negative. Actionlint
and generated Renovate validation pass; optional native RE2 uses its existing
RegExp fallback. Doctor and semantic QMD discovery pass. Hosted qualification
and consumer adoption remain pending.

Source PR: https://github.com/lapismd/dependency-automation/pull/18, code commit
5ba5c22029f999f1768db9df88bc6c0f94af3d95, based on merged readiness/S3 main
cf6eda3feba058408ca183f9beae0eff203bad22. This is the S6a foundation only.
Actual AI Controller version acceptance found Deno formatting selected by its
intentional deno.json; its installer remains required under that policy.
The read-only inventory remains 19 repositories, 43 owners, 220 edges, zero
cycles and zero coverage holds. Fifteen resolved Changesets CLIs match the two
reviewed Node contracts; thirteen repository cohorts are still unconfigured.
The coordinator's unchanged Renovate graph has one LOW and four MODERATE
instances across deepmerge, glob and minimatch advisories; the runbook retains
their exact IDs and paths. No waiver or clean full-audit claim is introduced.

Current parent operator checkpoint: writes=false, phase=pilot, waves=true,
schedule=true and wave-state writes absent/off. Hosted read-only pilot
43769439228 was queued on main 519e6cd9; its later receipt belongs to the parent.
These current settings supersede old flat-mode settings as a live claim, while
the earlier dated records remain historical. This slice changes no activation.

### S6b operational/advisory source controls — 2026-11-15

- [x] Implement bounded production drift reporting for exact-source template pins/Node runtimes, recursively resolved local composites, retained exclusions and allowlisted activation observations.
- [x] Implement conservative protection/effective-rule versus PR-job candidate coverage, preserving unavailable/conditional/unknown outcomes and all current-head functional gates.
- [x] Record single version-update owners and retain Dependabot security coverage, including repair of existing untyped first-party ignores in source preparation.
- [x] Implement exact advisory/path/version/severity/dependency-source/lock/expiry decisions with an empty approval authority, known-fix rejection and stale-approval cleanup.
- [x] Run actual coordinator audit before writable wave planning and repeat before reconcile App minting; preserve read-only/state-only pilot behavior.
- [x] Qualify hosted source checks and operator-reviewed source deployment through PR21; individual policy activation remains separately reviewed.
- [ ] Resolve consumer ownership/pin/runtime/check gaps with each source owner; source observations are not full workflow-security analysis.
- [ ] Complete active consumer guard/recipe adoption and remaining cohort qualification; S6 remains in progress.

The S6a hosted source check subsequently passed and PR18 merged at
468d1c91e41d88e705708346bb72e05f6c18b880. The current checkpoint is
writes=false/phase=pilot/waves=true/schedule=true/state-writes=true;
state-only hosted run43772797422 passed. The earlier off/queued records above
remain dated history, superseded by this checkpoint without changing settings.

Local S6b source verification passed 104 tests and three spec lanes after
correcting two new spec-shape errors. Doctor11/11, semantic QMD and actionlint
passed. The live GET-only maintenance audit inspected25 public repositories,
resolved101 local-action invocations and reported3 unavailable required-check
settings,8 static-candidate matches and14 source gaps. It retained46 unknown
bodies and explicit drift rather than declaring them clean. Activation matched
the current checkpoint. Registry inventory remained19repositories/43owners/
220edges/0cycles/0coverage. Its local wave run omitted bot identity and is not
write-readiness proof. The unchanged coordinator graph remains held by one
unapproved LOW deepmerge path plus four known-fix MODERATE paths; PR19 separately
remediates the moderates. The approved list remains empty; credential authority
does not approve a waiver and no Visual Delta exception transfers here.

See [operational drift and exact admission runbook](docs/operational-drift.md).

S6b PR21 is https://github.com/lapismd/dependency-automation/pull/21, rebased on
PR19 merge `f0e071c0b812366d59eda1a5d468fd148db167ff` while retaining GOV-005,
its patched worker tests and the exact remediated package/lock graph. Fresh
frozen installation plus actual advisory preflight now reports only the LOW
deepmerge 4.3.1 path and holds writes. The exact dependency source and lock
binding appear in the [disabled operator proposal](docs/proposals/deepmerge-low-2026-11-21.md),
ending 2026-11-21T00:00:00Z or a known upstream fix, whichever comes first.
It concerns the automation runtime with scoped bot writes, not an application
shipping dependency. The approved list remains empty and all other findings
remain blocking; explicit user acceptance has not been inferred.

Rebase qualification: frozen install passed, `pnpm verify` passed 108 tests and
all three spec lanes, and actionlint passed. The exact advisory command exited
1 for the expected unapproved LOW; the disabled proposal matches its binding
and is rejected by the approval schema because no actual approval time exists.

Hosted run 43777315092 found the new test fixture's assumed `jj` installation:
107 passed/1 failed before its assertions. The fixture now exercises the actual
Git path without Jujutsu on hosted checkouts, retaining local isolated/colocated
Jujutsu coverage and all assertions. The exact target passes 2/2 both normally
and with a Node/Git-only PATH, with no skipped tests or new CI tool dependency.

## Measurement and completion

### S6c expanded cohort source evidence — 2026-11-16

- [x] Add ten missing eligible public cohorts, retaining exact source/manifest/lock/resolved-tool context in the production policy and inventory assessment.
- [x] Record the latest observed successful default-branch source pipelines separately from unqualified version recipes: nine match inspected source; Server remains prior-source.
- [x] Preserve explicit holds and frozen-root exclusions, existing CLI majors, dependency/audit authority and activation controls.
- [x] Qualify this source PR on hosted CI and deploy through the parent operator.
- [x] Implement the older-six exact evidence refresh with reviewed CI jobs, preserved supported constraints and explicit missing/prior source context; hosted refresh deployment remains below.
- [x] Add an upstream reusable runtime guard in Lapis CI, then prove and adopt one actual portable consumer recipe with its custom command/config unchanged.

The GET-only collector produced ten review candidates with zero unavailable
entries. Tasks43776791410 and Docs43773572649 completed after the parent's
existing npm-production approvals; recorded successful context is therefore
current-source rather than the earlier held-run observations. Actual Node24
whole-recipe qualification remains unproven for every new record. No consumer
implementation is duplicated and no Deno prerequisite is removed. The
[cohort evidence ledger](docs/cohort-evidence.md) links each exact run and
describes limits, source constraints and the next shared-helper ownership step.

Local qualification: the initial new evidence target failed once before its
module existed; the repaired focused discovery/tooling set passed 26 tests.
Final `pnpm verify` passed 123 tests and all three spec lanes after correcting
one new specification-section placement error. Doctor passed 11/11, semantic
QMD discovery and actionlint passed, and the current latest Deno-free validator
remains 0.2.0. A real read-only registry inventory retained 19 repositories,
43 owners and 220 edges with zero cycles/coverage holds. All ten new evidence
records matched current source and lock bytes; nine CI observations matched
source and Server remained prior-source. All ten recipes remained unqualified.
This base revision's advisory authority remains untouched; the parent owns the
separate user-approved exact LOW policy slice and any later rebase preserving it.

PR22 is rebased on policy PR23 merge
`f07ff67172f11dae2c46967f16d390ea1a57d30d`, preserving the approved exact
entry, decision/proposal documents, DA-OPS-002 row and latest November16 parent
checkpoint. Combined verification passes 123 tests and all three spec lanes.
Actual preflight now exits0 with the single `exact-approved-finding` and no
cleanup; the raw LOW remains visible, and every other finding still blocks.
This cohort rebase makes no new approval or activation decision.

### Combined message/advisory checkpoint — 2026-11-16

PR20 merged at `3aa6c8b51b6ecbde3f9fb5b5453de39b2cb4669a`; main check
43777762256 succeeded. PR21 is rebased on that source, preserving the message
renderer, profile writer, tests and canonical DA-REC-005/DA-PR-005 rows alongside
the disabled exact LOW proposal. Package/lock source binding remains unchanged.

The parent operator updated the existing [Notes126 body](https://github.com/lapismd/lapis-notes/pull/126)
at 2026-11-16T00:00:33.682Z while retaining head
`d3466d38c5f2baa6c868e2c2031d17c6926f84b1`. Native body, checkbox and debug
bytes outside the legacy note were preserved, together with the timestamped
observation from 2026-11-15T23:31:29.916Z. The parent owns the local operational
receipt in the message workspace; no live report is copied into canonical book
inputs. This is body-only acceptance and does not prove dependency merge/release.

The exact LOW decision has been requested from the user asynchronously, with
no answer received at this checkpoint. The proposal stays disabled, the runtime
approval list stays empty and consumer writes stay false. No approval or
activation is inferred from this source rebase or the successful message update.

Combined local qualification passed a fresh frozen install, 119 tests and all
three spec lanes, actionlint, and validation of all 19 generated Renovate
configs with the enriched message renderer. The actual advisory preflight
continues to exit 1 for the single unapproved LOW with the proposal's unchanged
dependency-source/lock binding. Hosted qualification of the rebased PR21 head
remains separate; this checkpoint enables no exception or write activation.

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

## November 15 rollout checkpoint

The following are qualified source/deployment results and pending acceptance,
not completion claims for all six slices.

- **S1:** Profile consolidation is hosted-qualified. Plugins version authentication
  is merged; Notes' merged version job passed App minting and Changesets on main.
  Visual Delta authentication PR77 merged after all eight hosted checks passed,
  with no dependency or release change. Mira41, Core85, AI13 and Server92 are
  reviewable source PRs awaiting hosted qualification; remaining version writers
  are being migrated separately. AI/Server's genuinely missing App configuration
  was provisioned from the operator-authorized existing key, and installation
  probes proved exact single-repository read scope. This change extends the
  manual read-only hosted probe to those two targets; their hosted reads and
  next genuine App-created version candidates remain pending.
- **S2:** Shared publisher/resolver helpers are merged. The first Plugins producer
  built and signed its index but failed before promotion because two CLI identity
  selectors conflicted. Lapis CI PR5 corrects this and passed native hosted CI;
  real pinned CLI/full resolver verification accepted the existing signed stage
  against independently reconstructed inputs. Plugins145 advances the helper
  cohort, and Notes135 adopts the same no-pin-PR contract. Their hosted consumer
  gates, successful promotion and repeated warm/no-op acceptance remain pending.
- **S3:** PR16 merged as `519e6cd9efc5c8bd6de920d4bcf2acdff1c30792`,
  implementing production wave admission and durable public-safe state behind
  default-off new gates. All 80 tests and three spec lanes pass; PR and main check
  43768772692 succeeded. Reviewed public state, real foundation-wave/replay and
  write activation remain pending. The later read-only cutover enables waves
  and schedule with writes=false/phase=pilot and state writes absent/off;
  see the S6a operator checkpoint for its queued hosted receipt.
- **S4:** Maintenance7 merged at
  `4b65439b34153e284eb6dadbb6e7ac7178650d23`; main check and Pages deployment
  run43765876743 succeeded, and the public entry point returned HTTP200.
  Current report/issue views and confirmed batch actions are deployed. Real S3
  report and disposable batch acceptance remain pending; fixture tests do not
  claim live command execution.
- **S5/S6:** Source-owned registry reuse/resume and Deno-free tooling/cohort drift
  enforcement are under implementation. Existing registry batching is retained;
  no new publication or audit exception is implied.

The Visual Delta raw full audit still reports the existing LOW development-only
advisory; production audit is clean. Its consumed 0.1.5 release exception was
not transferred to authentication source or another release. Future dependency
and publication work retains its governing audit gates.

## November 16 deployment and approval checkpoint

This checkpoint supersedes earlier pending-state descriptions; their dated
receipts remain historical. Remaining consumer and wave gates are still open.

- **S1:** Auth migrations are merged for Plugins #140, Notes #132, Visual Delta #77,
  Mira #41, Core #85, AI #13, Docs #16, Tasks #23, Terminal #22, Agent UI #37 and jj-store #89.
  App minting and Changesets steps passed on main in Notes43778076879,
  Visual Delta43766653714, Mira43770750188, Core43773566953, AI43772596193,
  Docs43773572649, Tasks43776791410, Terminal43773578012,
  Agent UI43776785767 and jj-store43773584374. Plugins #147 was a genuine
  App-authored version PR, merged after ordinary CI. Empty/no-change jobs are
  not manufactured candidate evidence. Server #92 remains at refreshed head
  136f34c3 awaiting native/UI CI. Docs/Tasks publication environments were
  approved through gh under standing deployment authority; both complete main
  runs and their publication/verification jobs succeeded.
- **S2:** Plugins #145 merged at b045e791. Corrected signed producer43771402027
  succeeded; repeat43775859652 reused its immutable image. After the genuine
  Plugins #147 release changed inputs, producer43776275040 succeeded on75c71903.
  Full fresh warm CI 43778011166 passed on that source, selecting signed digest
  bc8095bf540fa25911d93cd5fd0ea5525b7cbf78bfbe6290fcc4e7d982a87c6e
  for identity d2906e0bc190b705f432dfef3f49b7199e267486426c40c7b2b60996f1f42cea.
  Earlier warm43775857516 was cancelled by a newer push and is not a pass.
  Notes #135 was rebased onto unrelated Sync main ee6615b2 at bce9c51a;
  exact7 adoption tests,120 release tests,6spec lanes/69 regressions,
  audit/release policy/format/actionlint passed. Refreshed full CI 43779143189
  and subsequent Notes signed producer/warm/reuse acceptance remain pending.
- **S3:** State-only43772797422 succeeded with inventory/state writes and zero
  consumer writes. Maintenance's deployed report reader accepted the real
  immutable public state/report and correctly reports stale policy revisions.
  Consumer writes remain false and phase pilot while the reviewed policy
  decision is deployed; the controlled genuine foundation wave is next.
- **S4:** Production Maintenance controller/read/preflight/command/write ports
  from deployed4b65439b were exercised through gh-authenticated HTTPS on the
  disposable expected-rejection run43778309268. Batch preparation and duplicate
  confirmation produced one accepted rerun, advancing attempt1 to queued2.
  Fresh preflight rejected the old attempt with zero additional writes.
  Credentials stayed in gh's existing store. Two local harness setup errors
  occurred before API calls and were corrected; the final exact acceptance
  command passed. This qualifies the live command boundary; browser visuals
  and every possible action kind are not inferred from one disposable action.
- **S5:** Registry #165 merged889c8ca7. Preparation43776779580 and writer43776944357
  qualified artifact14186364002, SHA256034fffde2bcbfca706eb014c000570263f390e5a81335d195b23571376308424,
  candidate38293e83 and three approved queue entries together. Repeat
  preparation43778013307 and writer43778015392 returned unchanged with zero
  verification/build time. Invalid preparation attempt999 in 43778309268
  rejected before writer-token creation; correct replay43778496424 returned
  the same candidate unchanged without signing/rebuilding. Hosted tests
  complement the unit partial-upload recovery regression; they do not claim
  a real network upload outage. Publication #164 mergedd416054d;
  production43779004975 succeeded. Eight public metadata/signature files match
  exact source bytes, four Ed25519 signatures verify, and the live index names
  bases0.4.1, canvas0.4.1 and markdown0.3.2.
- **Rich messages:** Coordinator #20 merged3aa6c8b5 and its main/spec Pages runs
  passed. Genuine scheduled profile refresh43778000008 created App-authored
  .github #12 with package delta tables, source/candidate links and recovery
  guidance. Ordinary CI 43778051079 passed without workflow approval;
  reviewed npm-cell-only changes merged0bd71150. Notes #126's native content and
  checkbox remain intact outside its managed context.
- **S6:** Coordinator #21 mergedc803882b after119tests/3spec and hosted43778093986
  passed. The operator explicitly approved only the exact coordinator deepmerge
  tuple below. Cohort expansion and source-owned guard adoption remain separate
  slices. Intentional frozen Deno tasks stay outside portable adoption; CLI
  metadata alone cannot authorize removing their prerequisites.

### Explicit coordinator advisory decision

The operator approved the exact PR21 proposal on November16. The single entry
in config/advisories.json binds GHSA-gcqx-w48m-w2h4, deepmerge4.3.1,
`.>renovate>deepmerge`, LOW, dependency source 7141c2ba and lock hash 889c017f
through exclusive2026-11-21T00:00:00.000Z, ending sooner on a published fix.
See [the full decision and exact hashes](docs/approved-coordinator-advisory.md).
All other findings and stale/mismatched approvals remain blocking.

The pre-approval preflight exited1 with one unapproved LOW; after the policy
change it exits0 with that exact approved finding and zero cleanup. Raw audit
still contains the LOW. Package and lock bytes are unchanged. Focused advisory
and preflight tests pass7/7, full verification passes119tests and all3spec lanes,
doctor11/11 and actionlint pass. Two initial canonical shape/mapping errors were
corrected without changing product assertions. Fresh GET-only inventory retains
19repositories/43owners/220edges/0cycles/0coverage; all19 flat configurations and
the native Renovate validator pass. Optional RE2 uses its existing RegExp
fallback. The local read-only wave omits bot identity and does not claim hosted
writable admission. Policy CI/deployment and controlled admitted-wave acceptance
are subsequent gates. The operator has also granted standing approval for
logical completion decisions while retaining functional and scope boundaries.

### Hosted activation evidence with existing read authority

Hosted audit43781137104 succeeded while retaining an unavailable activation
observation because its read-only workflow token could not read the Variables API. A follow-up
passes only the five allowlisted values from the trusted main audit workflow's
resolved vars context, labels the exact provenance/source SHA and preserves API
precedence. Unknown contexts and missing/invalid values cannot become checkpoint
defaults or clean evidence. Read authority stays contents-only with no App token
or settings permission. The exact hosted-activation regression changed from
one failure to two passing tests; its complete owning suite passes10/10.
See the operational runbook for deployment/read-back qualification.

Further qualification: Server92 passed all eight hosted checks and merged
`a63b96a20c08a840bd481227b961582d99f700b3`. Notes135 passed the refreshed full
CI and merged`66a05073805d8fd7b45bc555afbd9f8b2903f747`; its first signed producer
43781514488 is running. Plugins' obsolete bot-only pin130 was closed after the
full warm proof, retaining its branch and all frozen/excluded routes.

Maintenance recovery dispatch passed through the deployed production dispatch
controller, parser, immediate fresh preflight, command port and non-retrying
writer. Exactly one POST selected current main11680335, workflow419578924,
blob83d48b27 and verified empty preparation43781629698/1. Result43782359968
succeeded with inspect success/publication skipped, main unchanged and zero PRs
before/after. This qualifies actual recovery command wiring without a browser
credential export, duplicate dispatch, build or signing.

Cohort22 merged588e6189. The activation-observation slice preserves its TOOL004
row and the explicit approved advisory; combined127tests and3spec lanes pass.
The broader suite's old exact workflow-env expectation was updated to enumerate
only the original token and five public vars, keeping its strict whitelist and
read-only/no-App assertions; the exact regression passes1/1 after one failure.

### S3 completion adoption source — November 16

Read-only audit at coordinator `d53aa051` found that all four pilot sources
still call publication-only notifier `ea9d35b`; none has a completion hook.
The shared completion verifier now prepares exact public workflow/run/attempt
and current-head checks before App minting, repeats them before dispatch, and
settles the notifying callback before full inventory. It preserves every
current-head qualification gate and never selects the PR head as graph source.
The [source adoption guide](docs/completion-adoption.md) prepares Notes and
Mira/Core/Plugins callers; actual source adoption and live completion acceptance
remain pending. Notes source is independently owned for a functional CI repair;
its failed candidate remains held.

Manual writable pilot43786666847 succeeded after an explicit operator transition
to writes=true, phase=pilot, waves=true, state-writes=true, schedule=false. The
previous audit checkpoint records the earlier observed settings; this paragraph
records the transition without changing external settings or claiming scheduled
recovery is active. No callback was activated by this shared source change.

Shared completion review found the final notifier still performed unconditional
publication discovery before its completed-event branch. The actual CLI test
reproduced one forbidden candidate-tree read; discovery is now isolated to
publication notifications. Completion dispatch performs only verified public
GitHub metadata reads, with separate source-read/coordinator-write credentials.
The exact target passes1/1 with one dispatch and no tree/blob/file/npm requests.
Caller adoption remains separate from this source boundary repair.

### Compound range pilot repair — November 16

The exact Notes126 candidate49531dc1 passed all required CI after its one
unchanged failed-job rerun. Manual replay43794621762 completed without a new
candidate or duplicate PR, and correctly retained merge admission: File Explorer
still resolved Core 0.13.3 under its unchanged compound support range, while the
planner incorrectly expected a narrowed `^0.13.4` manifest. Three other admitted
manifests had updated. No merge or workflow gate was bypassed.

Compound runtime support now remains unchanged when the admitted registry target
already satisfies it, and the generated per-path native Renovate rule requests
`update-lockfile`. The exact target lock and fresh candidate CI still qualify
merge. An outside-support compound target remains held for source-owned review.
Unchanged public manifests do not invent publication intent. Two exact source
regressions initially failed; both pass after the repair, including Renovate's
actual rule engine/range updater and old-lock/pending-head negative controls.
Hosted regenerated-candidate acceptance remains pending.

Shared completion25 merged e3c91cb3; Plugins guard149 and Notes diagnostics139
are merged. Shared LapisCI8 is merged6511f29e; actual Core43795242917 and
Mira43795245438 recipe proofs passed before consumer guard adoption. Source
callbacks and Core/Mira adoption remain separately reviewed source PRs.

### Persisted compound publication waits

The earlier planner had already stored File Explorer publication intent before
the compound-range repair. A lock-only repair must not leave that obsolete wait
blocking downstream work forever or claim a new release that never occurred.
The regression reproduces one persisted waiting record. Reconciliation can now
mark it superseded only after a changed, qualified main resolves every required
target and its unchanged compound support exactly matches integrity-verified
published metadata with git provenance. Old locks, pending CI, missing integrity
or provenance, changed support and ordinary ranges keep their publication wait.
This updates only derived state through normal reconciliation, with no live state
edit or generated package release; actual accepted-main qualification is pending.
The exact regression changed from1 failure to1 pass with six negative controls.

### S6d exact older-cohort refresh source — November 16

All 16cohorts now have exact source, root manifest/lock hashes and resolved-tool
context. The older six retain every supported tool range and pnpm version;
actual wider source declarations remain observations rather than widened policy.
Explicit source workflow/job policies bind complete successful required jobs to
source/run/attempt. Skipped, duplicate, partial, mismatched or unavailable jobs
cannot qualify. Older ten run-only observations remain labelled accordingly.

Refreshed Plugins 0abf4958 and Notes 1e49d754 retain prior-source functional
receipts 43795232129/43795264453 at 46c08176/40e3e357. Core 9cf94b7c has
same-source CI 43773566523. Notes' prior PWA validation/deployment passed
while retaining its quarantined skipped interaction job. VD abcb2e6d actual CI 43766653716
passes all four required jobs. Mira d681bdd6 remains unavailable: release-only
success skipped artifact validation. Notebook 4405b5c6 failed spec-first mappings
in 43704372870, so 43615472367 remains explicitly prior-source 1e2f0f84.

VD's absent root packageManager stays absent. Its recorded pnpm 10.32.1 pin binds
exact release workflow bytes/job/step separately; changed commands cannot
silently produce a new accepted pin. Notes retains deno.json and its shared
frozen setup. No work on excluded AI Controller/AI Host/Terminal Host, consumer
source, package/lock, advisory bindings, activation or write authority occurs.

The GET-only collector now supports explicit existing-cohort refresh, preserves
policy ranges/versions and emits ignored review proposals. It rejects held,
excluded and unknown requested scope. Central supported-cohort drift control
remains distinct from whole-project recipe portability; S6 is not marked done.

Pending: hosted review/deployment and inventory read-back for this refresh;
remaining eligible Node guard adoption; source-owned Notebook canonical repair
and Mira validation context. Recipes remain unqualified in cohort metadata.

### Concurrent pilot caller checkpoint — November 16

Notes release #137 merged 308acb05; completion callers Notes #140 and Plugins #150
merged 1e49d75421899183cb4f0fb14ae613a172872eeb and
0abf495865443859760929d55c6d7a97fb20d3b9 after their full PR checks passed.
Core #86 merged 8c9d4974becd27506c506575e52829905c8656a9 with 11 checks green;
Mira #42 merged 345e6390ec61b61d3c512c6dd40ac8218a9ee34e after its repaired
check lanes passed. Source guards retain shared helper 6511f29e and unchanged
version recipes/configuration/major contracts. Cohort source observations above
remain dated; these later source changes must remain visible as drift.

Genuine Plugins completion 43798984826 passed pre-App verified-current-completion,
verified source 0abf4958 and sent its verified completion wake-up. Receiver
repository_dispatch 43799022094 completed inventory and was still writing wave
state at the parent's last checkpoint. All four pilot callers are merged, but
receiver settlement, durable wave progression and the whole S3 chain are not
claimed complete. No repeat polling or activation change is part of this slice.

Local S6d qualification: 26 focused tooling tests, 179 full tests and three spec
lanes pass. Actual GET-only refresh returns all 16 eligible proposals; inventory
retains 19 repositories, 43 owners and 220 edges with zero cycles/coverage holds.
All 19 actual global native Renovate configs, formatter, actionlint, doctor and
QMD discovery pass. Package/lock and approved LOW policy bytes remain unchanged.
[Exact source qualification](spec/records/2026-11-16-six-cohort-refresh.md)
retains initial failures, observed CI limits and pending hosted delivery.

### Remaining dependency intake / main specification handoff

- [ ] Repair the S1/S6 source policy handoff so trusted dependency intake carries accurate mapped canonical evidence or a verified merge handoff before claiming main qualification. PR-only bot specification exemptions do not qualify main, and main spec-first remains binding.

Root owns Notebook repair PR #37 (9549549b8883): the two original missing-map
findings become zero over the original intake base; three Docker specification
lanes plus routing/parity and App ownership pass. This is a canonical-only repair
with no product/dependency graph change. Trusted dependency PR #36 (Core 0.13.4)
may recreate the main-map gap unless the owning preparation/handoff policy is
fixed. This remaining work is outside the cohort refresh and grants no waiver,
new runtime qualification or manufactured release intent.
