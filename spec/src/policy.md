# Repository policy

`config/repositories.json` is the versioned authority for dependency-update
entries, monitoring additions/exclusions and excluded package names. It is not
a live installation or secret store.

## DA-POL-001 — Explicit dependency scope

**Requirement.** Dependency discovery and update targets MUST originate from validated repository entries with supported schema, unique identities and explicit rollout phases.

### Acceptance details

- Entries MUST identify a supported organization/account repository and `pilot` or `full` phase.
- A supplied hold reason MUST be a non-empty string and MUST prevent that target from entering the write matrix.
- Invalid or duplicate entries MUST fail before reconciliation.

## DA-POL-002 — Monitoring authority separation

**Requirement.** Monitoring additions MUST expand read coverage without granting dependency-update or publication authority.

### Acceptance details

- Monitoring scope MUST be the sorted union of update entries and monitoring additions, minus monitoring exclusions.
- Monitoring exclusions MUST win, and malformed or duplicate monitoring identities MUST fail validation.
- Missing optional monitoring fields MUST retain legacy update-entry defaults.
- Monitoring adapters MUST NOT mutate the dependency-write allowlist or remove holds.

## DA-POL-003 — Excluded and held scope

**Requirement.** The rollout MUST preserve explicit repository/package exclusions and portable-leaf boundaries rather than activate parked Deno hosts or held consumers.

### Acceptance details

- Community and Nostr repositories MUST remain outside this rollout unless explicitly reauthorized.
- Discovery MUST exclude parked Deno host paths, generated trees and fixtures.
- Excluded package names MUST be ignored by generated Renovate rules.
- An existing portable-leaf update entry MUST NOT be interpreted as permission to activate its excluded service or host.

## Scope interpretation

Monitoring exclusions and update entries deliberately serve different purposes.
For example, a repository may retain a portable package consumer entry while
its service-oriented root remains excluded from broad monitoring. An explicit
hold keeps a repository discoverable for explanation without making it writable.

## Public operational coverage

The allowlist does not establish repository visibility. Discovery classifies
visibility before collecting source. Public coordinator artifacts/state contain
only verified public sources; inaccessible/non-public entries produce opaque
coverage holds without widening credentials or revealing source names/bodies.

Monitoring token detection includes Changesets' explicit `github-token` input;
this classification does not expand dependency targets or installation scope.
The separate config/tooling.json contract follows DA-TOOL-001 through
DA-TOOL-003. Its repository-specific cohorts describe tooling rather than
dependency edges or permissions. It cannot add advisory exceptions,
change rollout phases, enable writes or activate excluded hosts.

Expanded tooling records may retain exact source/artifact hashes, resolved
versions and historical successful source-CI context under DA-TOOL-004; that
metadata never qualifies a whole version recipe or grants dependency writes.
Reviewed source workflow/job selectors and package-manager provenance follow
DA-TOOL-005/006; evidence refresh preserves existing supported tool ranges and
retains undeclared manifests without inventing declarations.

`config/operations.json` records reviewed template references, single update
class owners, retained exclusions and a dated activation checkpoint, without
granting settings authority. `config/advisories.json` is the separately reviewed
exact approval authority under DA-OPS-002; its initial list is empty. Source
observations and raw audit findings cannot create approvals.

The November 16 operator decision adds one exact coordinator deepmerge entry
with the reviewed dependency-source/lock binding and November 21 expiry.
This changes only advisory admission under DA-OPS-002; repository scope,
existing holds, rollout phase and the separate write gate remain unchanged.

Hosted activation observations may use the five values supplied by the trusted
main audit workflow when its read token cannot query the Variables API. This
read-only evidence follows DA-OPS-001; it cannot create defaults, change settings
or grant writer authority.

Completion policy binds only existing pilot repository workflow IDs/paths and
permitted source events. It adds no dependency write scope, removes no hold,
and excludes the notification callback itself and the deferred Nostr publisher.
Unknown or recreated workflow identities require explicit source review before
notification adoption.

Publication policy reviews source-owned publisher workflow identities and exact
verification-tool bytes under DA-PUB-001/002. It adds no update repositories,
channel admission, source signing authority or publication permission.

Source-owned canonical intake is an optional preparation capability, not an
activation or repository-scope change. Invalid policies fail closed; existing
phase, portability, package exclusions and manual-repair holds remain binding.
