# Wave pilot and recovery

S3 source is implemented behind default-off gates. Operator pilot activation is
recorded in PLAN.md; completion caller adoption remains separate. Merge and complete hosted source checks
before changing any gate. This runbook requires an operator decision; it is not
permission for an agent to enable settings or publish a package.

## Gates and authority

| Coordinator variable                 | Default | Effect                                                                                        |
| ------------------------------------ | ------- | --------------------------------------------------------------------------------------------- |
| `LAPIS_DEPENDENCY_WAVES`             | off     | Select package/path wave admission instead of the original flat matrix.                       |
| `LAPIS_DEPENDENCY_WAVE_STATE_WRITES` | off     | Permit the separate trusted-main job to publish coordinator state/report.                     |
| `LAPIS_DEPENDENCY_WRITES`            | off     | Permit per-repository App consumer writes; in wave mode durable admission must succeed first. |
| `LAPIS_DEPENDENCY_PHASE`             | pilot   | Existing four-repository pilot; full still requires a separate decision.                      |
| `LAPIS_DEPENDENCY_SCHEDULE`          | off     | Existing hourly recovery gate. Manual dispatch remains available.                             |

The existing App login defaults to `lapismd-dependency-bot[bot]`; the coordinator
may override `LAPIS_DEPENDENCY_BOT_LOGIN`. Its existing bot Git author is still
required. GitHub API author identities, not Actions rerun actors or GitHub's
web-flow committer, establish branch ownership. Consumer tokens remain scoped to
one repository. jj-store retains its separate cross-account installation.

## Read-only qualification

1. Keep consumer and state writes disabled. Review `pnpm verify`, actionlint,
   generated Renovate validation and authenticated `pnpm inventory` results.
2. After review, select wave mode only and dispatch
   `gh workflow run reconcile.yml --ref main`. Inspect the `first-party-inventory`
   artifact: `waves.json`, `inventory.json`, and the state candidate/before files.
   Reports are public artifacts; the collector admits explicitly public source
   coverage only. Private/unavailable scopes produce opaque holds.
3. Confirm exact policy/source revisions, complete current CI, package ownership,
   admitted targets and every scoped branch hold. A missing/unknown lock,
   unsupported coupled catalog, active upstream publisher or manual repair is
   actionable evidence, never a clean result. Existing breaking drafts retain
   manual compatibility decisions. No baseline/protection/audit gate changes.

`nodes.updates` describes discovered impact; `nodes.admittedUpdates` is the exact
subset permitted into generated rules. One repository can advance an upstream
public package while another package waits. Catalog-backed names require joint
admission across importers; mixed peer support remains held when safe shared
range changes cannot be established. Package SCCs require explicit coordinated
qualification and do not become invented repository cycles.

## Durable pilot

1. After approving public-safe report contents, enable only state writes and
   repeat the manual dry run. The separate contents-write job creates/updates
   `automation/dependency-wave-state`, never main and never a PR. Dry runs record
   operations as `planned`, so they do not consume a writable attempt.
2. Read the branch ref, then read `waves.json` and `report.json` at that exact
   commit SHA. Generation, policy revision and the report identity must agree.
   Maintenance reads this same immutable report receipt. Before this step its
   unavailable-report state is expected.
3. Enable consumer writes for the existing pilot only after reviewing that
   receipt. Dispatch again. Successful state CAS precedes the consumer matrix;
   each target rechecks its exact source, commit ownership and current CI before
   generating executable rules. A new/regenerated compatible head cannot
   inherit auto-merge qualification from an earlier head.
4. Qualify one real next foundation release through all affected public
   publishers and consumers. Do not manufacture a release. Verify each source's
   existing versioning/publication/signing gates, registry integrity/dependency
   contract, complete current CI and downstream admission. Record exact SHAs,
   workflow runs, PRs, registry versions, build minutes and interventions.
5. Replay the publication hint and repeat scheduled/manual scans. Expect one
   compatible rolling PR per consumer, no overwritten repair branch and no
   duplicate publication. Breaking-family drafts remain separate. Complete
   every applicable consumer surface before expanding rollout.

Publishers keep the existing pinned reusable `notify.yml` call. Completion
adoption uses the dedicated pinned `completion.yml`, with trusted source-owned
`workflow_run` callers and the existing notification credential boundary. The
[completion adoption guide](completion-adoption.md) contains the Notes pilot
caller and Mira/Core follow-ups. Shared source alone does not activate any
caller. Until deployed, manual or explicitly gated hourly reconciliation
provides completion recovery; schedule OFF means manual recovery only. No new
secret distribution is required.

The completion hint includes its callback run/attempt. Before inventory, the
receiver waits up to 24 observations at five-second intervals for that exact
callback and its exact bounded check suite to succeed. Failure, unknown identity, rerun or timeout fails before
planning/writes and identifies manual reconciliation after inspection as the
recovery path. This preserves the callback's check and all product checks;
PR-head hint verification never replaces the current default-branch graph.

## Failures and recovery

- A state CAS conflict means another generation won. Discard the candidate and
  re-inventory. Ref updates are non-force descendants of the expected parent.
- A timeout after ref publication triggers read-back once. An exact accepted
  commit is acknowledged; ambiguity fails before consumer writes. Do not retry
  the write blindly or republish packages.
- An admitted operation without an observed PR has uncertain outcome. Inspect
  its originating coordinator run, exact target source, all dependency branches
  and open/closed PR history. A new registry version does not waive that hold.
- Only a proven empty attempt can use manual recovery. After the originating
  reconcile run finishes, obtain the exact state branch commit and operation
  ID, then dispatch:

  ```sh
  gh workflow run reconcile.yml --ref main \
    -f recover-operation=EXACT_64_HEX_OPERATION_ID \
    -f expected-state-revision=EXACT_40_HEX_STATE_COMMIT
  ```

  The collector rejects stale state, unqualified changed source, unknown coverage, any
  retained dependency branch, any open dependency PR or an incomplete run.
  Recovery creates a new durable decision before a retry. It cannot overwrite
  repair work or bypass qualification.

  If the default branch advanced only through documentation, workflows,
  version-guard configuration or tests, add
  `-f recover-source-revision=EXACT_CURRENT_40_HEX_SOURCE_COMMIT`. The collector
  reads complete immutable public trees at both revisions and requires every
  other blob/submodule identity and mode to remain unchanged. Manifest, lock,
  workspace, canonical policy or implementation changes, truncated trees and
  unsafe/duplicate paths reject this route. Recovery records both revisions
  and their unchanged projection digest; ordinary fresh planning and required
  checks still decide which targets may proceed. Never use a guessed SHA or
  remove a retained repair branch merely to satisfy recovery.

- Manual commits hold their exact rolling or publisher compatibility family.
  Ambiguous branch names hold regeneration conservatively. Resolve/merge the
  repair through ordinary review, preserving its commits; reconcile ownership
  afterwards. Closed/unmerged compatibility branches remain retained and hold
  that family, while unrelated compatible work may proceed. No automatic branch
  deletion or claim of supersession is made without exact evidence.
- Registry, CI and per-consumer failures retain independent progress in the
  versioned report. Repair the owning source and rerun the exact failing target;
  do not weaken functional, audit, accessibility or publication gates.

## Rollback

Disable consumer writes first. Disable `LAPIS_DEPENDENCY_WAVES` to restore the
original flat reconciliation/configuration path, and disable state writes to
freeze pending state. State and repair branches remain intact. Review existing
repair ownership before explicitly restoring flat-mode consumer writes; flat
mode retains its original behavior and does not gain the wave repair guards.
The schedule gate can be disabled independently. Re-enabling wave mode resumes
from the retained generation after current-source reconciliation. Never force
reset/delete state to clear a hold.
