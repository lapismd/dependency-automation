# Workflow and module wiring

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
| `app-readiness.yml`     | Manual main-only                                         | One of five constrained pilots and existing encrypted App credentials                    | Scope/repository/PR read proof; no target writes                          |
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
