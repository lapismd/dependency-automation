# Reconciliation and review policy

The runner uses generated central rules, not consumer-controlled Renovate
configuration. `scripts/configure-renovate.mjs` selects a target only from the
validated inventory. `renovate.config.cjs` binds that generated configuration,
the single allowed post-upgrade command and explicit write activation.

## DA-REC-001 — Restricted update managers

**Requirement.** Generated reconciliation MUST handle only eligible first-party npm dependencies within discovered active manifest paths.

### Acceptance details

- All packages MUST start disabled; only the first-party npm scopes MAY be enabled.
- Own packages, excluded packages and unpublished or prerequisite-ineligible versions MUST be ignored or disabled.
- Existing exact/caret/tilde styles and peer support MUST be retained, with widening only when the candidate falls outside support.
- Consumer-local Renovate settings MUST NOT override central target restrictions.

## DA-REC-002 — Compatible and breaking reviews

**Requirement.** Compatible updates MAY auto-merge only after checks succeed and repository rules permit; major and pre-1.0 minor updates MUST remain separate compatibility drafts.

### Acceptance details

- Compatible changes MUST use one grouped rolling PR per consumer.
- Breaking families MUST disable auto-merge and remain draft PRs.
- Native platform auto-merge and ignored tests MUST remain disabled; stale branches MUST be refreshed.
- Existing review/merge requirements MUST NOT be bypassed or replaced with manufactured approvals.

## DA-REC-003 — Explicit write activation

**Requirement.** Reconciliation MUST default to pilot dry-run and require explicit operator activation before repository writes or broader rollout.

### Acceptance details

- Only `LAPIS_DEPENDENCY_WRITES=true` MAY enable writes; unset values MUST select full dry-run.
- Full phase MUST require `LAPIS_DEPENDENCY_PHASE=full`; other values MUST retain pilot selection.
- Scheduled scans MUST require `LAPIS_DEPENDENCY_SCHEDULE=true`; manual diagnosis MUST remain available.
- Write jobs MUST require the configured App key and bot author before running writable reconciliation.

## DA-REC-004 — Constrained execution

**Requirement.** The runner MUST constrain post-upgrade execution and credentials to the reviewed coordinator contract.

### Acceptance details

- Tokens MUST be minted for one selected repository with contents/PR writes and checks/status reads.
- The only allowed post-upgrade command MUST be the exact coordinator `prepare-pr.mjs` entrypoint.
- General package scripts and unrestricted environment exposure MUST remain disabled.
- Reconciliation MUST NOT prune stale branches automatically; explicit repair ownership remains future wave work.

## Current scheduling boundary

The hourly scan is catch-up for missed notifications, not persistent wave state.
Current concurrency limits and per-repository locks control runner execution;
topological release-wave admission and operation reconciliation remain planned.
