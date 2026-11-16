# Consumer integration

`scripts/prepare-consumer.mjs` installs the governed policy wrapper and patches
known workflow/validation boundaries. It preserves repository-owned commands.
`scripts/onboard-changesets.mjs` prepares selected public root packages for
version PRs; it does not publish them.

## DA-INT-001 — Functional checks survive exemptions

**Requirement.** Trusted generated PRs MAY skip specification phases, but functional, audit, packaging and release gates MUST remain active.

### Acceptance details

- Trust MUST use the PR author and bot type, not the actor rerunning a job.
- The configured dependency bot, Dependabot, Renovate and the existing generated version branch MAY qualify under the wrapper's explicit rules.
- An aggregate specification command MUST still run configured functional lanes and propagate failures.
- Missing or untrusted context MUST retain ordinary specification checks.

## DA-INT-002 — Version PR boundary

**Requirement.** Generated version workflows MUST use repository-scoped App writes and source-owned version preparation without publishing packages or creating GitHub releases.

### Acceptance details

- Activation MUST remain explicit and checkout credentials MUST NOT persist.
- Version commands MUST retain source-specific metadata synchronization and CLI runtime requirements.
- Missing credentials MUST NOT silently substitute a workflow-token writer.
- Publication and signing MUST retain the owning repository's approval boundary.

## DA-INT-003 — Container context boundary

**Requirement.** Docker validation workers MUST receive only explicit public PR-context variables, never coordinator credentials.

### Acceptance details

- Flat worker bundles MUST remain standalone; host coordination MUST attach the PR context before container creation.
- Unrelated Docker operations MUST remain unchanged.
- Integration MUST remain repeatable without duplicating policy imports or command wrappers.

## DA-INT-004 — Update ownership

Preparation also repairs an existing untyped first-party ignore into explicit
version-update types, retaining security updates rather than leaving a blanket
suppression. Central operational drift reports missing/competing ownership and
unknown security-setting coverage under DA-OPS-001.

**Requirement.** Consumer preparation MUST retain security coverage and avoid competing first-party version-update owners.

### Acceptance details

- Dependabot security updates MUST remain enabled.
- First-party version-update ignores MAY prevent duplicate version PRs while the coordinator owns those scopes.
- Newly supplied PR pipelines MUST invoke the repository's existing validation commands with read-only authority.

## Versioning runtime qualification

DA-TOOL-001 governs the generated Node-only versioning contract. Onboarding
preserves a supported existing CLI major and copies its exact runtime guard.
Onboarding must refuse to overwrite a different source-owned version recipe;
that consumer requires explicit source integration.
The version-only template validates the installed CLI before App minting and
does not install Deno. Notes' separate frozen-host prerequisites remain owned by
Notes; no consumer migration is implied by this upstream template correction.
