# Workflow and module wiring

This map describes executable entrypoints. It deliberately contains no secret
values, live operational reports or copied repository inventories.

## DA-WIRE-001 — Explicit workflow graph

**Requirement.** Each hosted workflow MUST retain an explicit entrypoint, data boundary and authority consistent with its owning canonical chapter.

### Acceptance details

- Inventory and audit jobs MUST remain readers; per-target reconciliation and profile publication MUST be the explicit writer boundaries.
- Notifications MUST call the registry-verifying notifier after a source-owned verified publication boundary.
- Documentation delivery MUST upload only the generated specification book.

## Hosted entrypoints

| Workflow                | Trigger and jobs                              | Inputs and entrypoints                                                                   | Outputs and authority                                                   |
| ----------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `check.yml`             | PR/main checks                                | Frozen install, `pnpm verify`                                                            | Source/spec qualification; contents read                                |
| `reconcile.yml`         | Publication dispatch, hourly catch-up, manual | `inventory` → matrix `reconcile`; inventory/config scripts → Renovate → `prepare-pr.mjs` | Ignored report artifacts; dry-run or explicit one-repository App writes |
| `notify.yml`            | Reusable publisher call                       | Exact coordinator/source revisions → `scripts/notify.mjs`                                | Registry-verified dispatch to coordinator; no npm publisher             |
| `maintenance-audit.yml` | Daily/manual                                  | Shared monitoring policy → `scripts/audit-maintenance.mjs`                               | Read-only partial/complete JSON report, 14-day artifact                 |
| `app-readiness.yml`     | Manual main-only                              | One constrained pilot and existing encrypted App credentials                             | Scope/repository/PR read proof; no target writes                        |
| `profile-refresh.yml`   | Gated hourly/manual                           | Source generator → same-run artifact → coordinator `publish-profile.mjs`                 | Guarded rolling profile PR using scoped App writes                      |
| `pages.yml`             | Main push/manual main                         | Frozen install and complete verification → generated `spec/book`                         | Book-only Pages artifact; isolated Pages deployment authority           |

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
