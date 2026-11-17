# Workflow and module wiring

The accepted initial single-repository rollout uses Notebook in the existing
`pilot` phase; the next qualified source entry is the no-input Spec Validator. `config/completions.json` also binds its actual CI, Pages and
version workflow IDs; verified observer callbacks from other known non-held
consumers remain accepted without enabling those consumers' writers. The
coordinator's hourly schedule is enabled after the Notebook acceptance and
normal replay receipts. The source policy retains global phase `pilot`, Notebook and only the
separately accepted no-input Spec Validator entry; the [single-pilot record](https://github.com/lapismd/dependency-automation/blob/main/spec/records/2026-11-17-notebook-single-pilot.md)
separates actual candidate/main/callback evidence, timer configuration and the
first unobserved cron event. Sixteen adoption tasks reuse this same flow; no
consumer copies the engine or independently enables another schedule.

`reconcile.yml` passes optional manual `recover-source-revision` only to the
inventory recovery boundary. `qualifyRecoverySource` reads both exact public
trees before `recoverEmptyOperation` can record a source transition. The
existing exact-state CAS/read-back and consumer revalidation remain required;
ordinary events cannot invoke this recovery path.

This map describes executable entrypoints. It deliberately contains no secret
values, live operational reports or copied repository inventories.

## DA-WIRE-001 — Explicit workflow graph

**Requirement.** Each hosted workflow MUST retain an explicit entrypoint, data boundary and authority consistent with its owning canonical chapter.

### Acceptance details

- Inventory and audit jobs MUST remain readers; per-target reconciliation, profile publication and the separately gated coordinator state job MUST be the explicit writer boundaries.
- Publication notifications MUST call the registry-verifying notifier after a source-owned verified publication boundary; completion callbacks MUST use the separately verified read-only workflow-run boundary before App minting.
- Documentation delivery MUST upload only the generated specification book.

## Hosted entrypoints

| Workflow                | Trigger and jobs                                         | Inputs and entrypoints                                                                   | Outputs and authority                                                     |
| ----------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `check.yml`             | PR/main checks                                           | Frozen install, `pnpm verify`                                                            | Source/spec qualification; contents read                                  |
| `reconcile.yml`         | Publication/completion dispatch, hourly catch-up, manual | `inventory` → matrix `reconcile`; inventory/config scripts → Renovate → `prepare-pr.mjs` | Ignored report artifacts; dry-run or explicit one-repository App writes   |
| `completion.yml`        | Reusable trusted source `workflow_run` call              | Exact allowed source run/attempt → read-only verification → existing scoped App          | Completion hint; receiver waits for callback completion; no source writes |
| `notify.yml`            | Reusable publisher call                                  | Exact coordinator/source revisions → `scripts/notify.mjs`                                | Registry-verified dispatch to coordinator; no npm publisher               |
| `maintenance-audit.yml` | Daily/manual                                             | Shared monitoring policy → `scripts/audit-maintenance.mjs`                               | Read-only partial/complete JSON report, 14-day artifact                   |
| `app-readiness.yml`     | Manual main-only                                         | One of the explicitly reviewed repositories and existing encrypted App credentials       | Scope/repository/PR read proof; no target writes                          |
| `profile-refresh.yml`   | Gated hourly/manual                                      | Source generator → same-run artifact → coordinator `publish-profile.mjs`                 | Guarded rolling profile PR using scoped App writes                        |
| `pages.yml`             | Main push/manual main                                    | Frozen install and complete verification → generated `spec/book`                         | Book-only Pages artifact; isolated Pages deployment authority             |

## Source flow

```text
policy + GitHub default-branch manifests + npm metadata
  -> inventory (owners, consumers, availability, cycles, holds)
  -> eligible per-repository matrix
  -> generated Renovate rules + target-scoped token
  -> exact candidate install + deterministic release intent
  -> consumer CI and existing merge rules
  -> source-owned versioning / approval / publication
  -> verified notification hint or scheduled catch-up
```

| Boundary                     | Owning implementation                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Discovery / registry closure | `src/github.mjs`, `src/policy.mjs`, `scripts/inventory.mjs`                                                                     |
| Central Renovate rules       | `src/renovate.mjs`, `scripts/configure-renovate.mjs`, `renovate.config.cjs`                                                     |
| Release intent               | `src/changesets.mjs`, `scripts/prepare-pr.mjs`                                                                                  |
| Consumer integration         | `scripts/prepare-consumer.mjs`, `scripts/onboard-changesets.mjs`, `src/consumer-ci.mjs`, `src/docker-context.mjs`, `templates/` |
| Publication notification     | `scripts/notify.mjs`, `notify.yml`                                                                                              |
| Monitoring policy / audit    | `src/maintenance-policy.mjs`, `scripts/audit-maintenance.mjs`                                                                   |
| Profile validation / writes  | `src/profile-writer.mjs`, `scripts/publish-profile.mjs`                                                                         |
| Repository/spec checks       | `scripts/check.mjs`, `spec-validator.config.mjs`, package scripts                                                               |

Workspace canonical preparation uses `canonical-workspace-policy.mjs` for
source-owned schema/scope, `canonical-workspace.mjs` for actual facts and lock
validation, and the existing `canonical-intake-files.mjs` adapter for immutable
source/filesystem checks. `canonical-admission.mjs` restricts ordinary wave
admission; `renovate.mjs` binds target integrity and exact output filters before
`prepare-pr.mjs` invokes the shared preparer. Consumer deployment remains under
DA-REL-005 qualification.

## Wave wiring

`src/audit-preflight.mjs` runs the complete coordinator audit before inventory
can plan writable admissions. `scripts/audit-preflight.mjs` repeats the real
check before the App-token step. Read-only matrix execution no longer mints a
write-capable App token. The operational maintenance audit resolves local
composites from exact-source tree blobs and reads required-check/activation
metadata without changing settings.

`maintenance-audit.yml` passes only the five allowlisted activation variables
from GitHub's vars context. When the Variables API is unavailable, the collector
requires that exact main workflow/repository/ref/event/revision context and
labels the observation source. It retains contents-read authority and adds no
App token, settings permission or write API.

`inventory` reads state and current evidence, then emits the admitted matrix and
candidate state. `wave-state` publishes that state only from trusted main with
its separate gate; matrix `reconcile` requires that publication in writable wave
mode. `validate-wave-target.mjs` refreshes target revision and branch ownership
before Renovate. `src/waves.mjs`, `src/wave-evidence.mjs` and
`src/wave-state.mjs` own planning, observation and state CAS respectively.
The default-off wave gate leaves the original flat matrix available for rollback.

Completion adoption uses `config/completions.json`, `src/completion.mjs` and
`scripts/qualify-completion.mjs`. The generic publisher notifier rejects
completion calls before App minting. `completion.yml` checks out only an exact
trusted coordinator revision with credentials disabled, installs frozen
production dependencies without lifecycle scripts, and reads source API metadata.
It revalidates after minting and dispatches no candidate data beyond documented
public coordinates. The callback run/attempt in the hint is settled before
inventory; all existing qualification checks remain observed.

The read-only inventory and source/book verification jobs install the owned
Lapis CI `setup-gh` action at the reviewed immutable publication-policy pin.
Publication collection verifies its exact binary/runtime/trust bytes before
offline provenance checks; it grants no artifact execution or publication authority.

Trusted-main wave inventory uses its existing contents-read workflow token for
public artifact downloads, with no App key, reader mint or permission probe.
Discovery and publication collection remain public-only; missing read access
keeps the publication unknown. Per-target writers retain their separate App
credentials, actual audit preflight and admission gates.

Docs and Tasks register their actual CI/Pages completion identities while
remaining outside the writable pilot. The App readiness workflow adds only
these exact read-only probe targets; source callback adoption and required
consumer audit qualification remain separate gates.

The next small-repository slice registers Spec Validator's existing Check
workflow and Visual Delta's existing CI, PR-specification, Pages and version
workflows by exact IDs, paths and supported events. The read-only App probe
adds only those two exact targets. Tag publishers, native capture, image
publishers and callback self-triggers are not completion sources; verified npm
notifications remain separate. Both repositories retain phase `full` until
their merged source acceptance and a separate per-entry activation/replay.
Spec Validator currently consumes no Lapis npm dependency; no synthetic Core
pin or version recipe is introduced to create an update. Visual Delta consumes
only the Deno-free specification tool in development and retains its existing
audit and compare-only browser gates. The operator requests a final merge pass
and gives standing approval for per-repository activation after passing source
acceptance; advisory exceptions and global full rollout are not implied.

The operator-approved next activation adds only Spec Validator after its source7
mergedf3bab11837648045540bf7ef948503131dcab041 and main Check44174151693
passed. Read-only existing-App probe44173967888 passed. Its normal functional
no-Lapis-input contract preserves the current zero-update graph; no Changesets
writer, dependency bump, version/tag or publication is invented. Notebook
remains the sole exercised dependency-writing consumer; all other entries and
existing holds/exclusions remain unchanged, and global phase stays `pilot`.
Actual completion, ordinary no-update settlement and repeat receipts are
recorded in the source activation record; source registration alone is not
claimed as a new publisher or multi-consumer update proof.
