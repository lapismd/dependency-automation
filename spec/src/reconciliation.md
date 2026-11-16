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
- Writable planning and App minting MUST pass the actual coordinator advisory preflight, with App key and bot author additionally required before writable reconciliation.

## DA-REC-004 — Constrained execution

**Requirement.** The runner MUST constrain post-upgrade execution and credentials to the reviewed coordinator contract.

### Acceptance details

- Tokens MUST be minted for one selected repository with contents/PR writes and checks/status reads.
- The only allowed post-upgrade command MUST be the exact coordinator `prepare-pr.mjs` entrypoint.
- General package scripts and unrestricted environment exposure MUST remain disabled.
- Reconciliation MUST NOT prune stale branches automatically; wave mode adds explicit repair ownership.

## Native artifact reporting

Native artifact-error status writes MUST be disabled for the status-read-only
token. Preparation errors MUST retain native PR reporting and functional CI/merge
gates rather than require additional status-write authority.

## DA-REC-005 — Native review context

**Requirement.** Generated dependency PR notes MUST add bounded, escaped, public-source review context through Renovate's native `prBodyNotes`, preserving its package table, release notes, configuration, controls and metadata.

### Acceptance details

- Context MUST identify the exact consumer source and available wave observation/policy revision, discovered paths, compatibility and release-intent policy without claiming that earlier CI qualifies a later PR head.
- Candidates and holds MUST be labelled as repository scan evidence, not the current PR diff; incomplete or absent wave/CI evidence MUST remain explicit.
- The native rebase/retry checkbox MUST retain its native marker and meaning, with the next eligible coordinator run respecting source/manual-repair holds, current-head CI and repository protections; no unwired action checkbox MAY be added.
- Updating an existing body MUST replace only one well-formed Lapis-managed section or the exact legacy Lapis note, leaving native bytes and maintainer additions intact; ambiguous sections MUST stop the update.

## Wave scheduling boundary

The default flat matrix remains the rollback path. Explicit wave mode selects
only admitted consumers and restricts generated versions to their admitted
candidate set. Durable admission precedes writable consumer execution; current
source/repair ownership is read again before invoking Renovate. See [waves](waves.md).

Wave-mode auto-merge additionally requires complete current PR-head workflow
coverage, an exact already-qualified candidate and current source ancestry.
Revalidation refreshes the inventory before generating executable rules. A new
or regenerated head waits for its own CI rather than inheriting an earlier green
head. Closed breaking-family branches hold that family; compatible work in a
different family remains eligible. Workspace catalogs move only with all their
references jointly admitted, including preservation of peer support.

Compound runtime support follows [DA-WAVE-006](waves.md#da-wave-006--compound-support-ranges): per-path native lockfile rules preserve existing support while exact candidate lock and CI evidence continue to gate auto-merge.

Wave inventory prepares the exact reviewed standard provenance-verifier CLI
through the owned pinned setup action. Verification remains a read-only
publication-evidence gate and never broadens the latest-only candidate policy.

Public publication collection reuses inventory's existing contents-read workflow
token. It has no App credentials or new permissions and cannot replace separate
state/write admission. Unavailable artifact access leaves evidence unknown.

Opted-in canonical preparation extends post-upgrade file filters with only its
reviewed exact chapter paths. The runner still executes only the shared
preparation command, with lifecycle scripts disabled and manual branches held.
When its single-development profile independently qualifies, the exact matching
`pnpm-workspace.overrides` edge MUST be admitted alongside the root development
dependency at the same target. This does not enable peer/runtime edges, another
workspace file, compound selectors, catalogs or other overrides.
