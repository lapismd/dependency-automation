# Repository policy

The reviewed Notes channel cohort follows DA-PUB-003 with exact package,
version, integrity and consumer-manifest scopes. It adds no repository entries,
recognizes Profile0.2.5 publication only, and changes no phase, schedule or write
activation. Profile consumer scope entries stay forbidden. DA-POL-001
through DA-POL-003 retain their existing authority and excluded hosts.

`config/repositories.json` is the versioned authority for dependency-update
entries, monitoring additions/exclusions and excluded package names. It is not
a live installation or secret store.

The single-repository rollout selects Notebook as the only `pilot` entry.
With the coordinator phase retained at `pilot`, every `full` entry remains
observation-only until its own adoption task explicitly promotes that entry.
Existing completion callers remain read/dispatch observers independently of
write activation; excluded and held roots remain ineligible for those callers.

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
- An existing portable-leaf entry MUST NOT authorize its excluded service or host; retained excluded Deno roots MUST remain held in every rollout phase while their public metadata MAY remain read-only graph evidence.

## Scope interpretation

Monitoring exclusions and update entries deliberately serve different purposes.
For example, a repository may retain a portable package consumer entry while
its service-oriented root remains excluded from broad monitoring. An explicit
hold keeps a repository discoverable for explanation without making it writable.

AI Controller and AI Host retain explicit dependency-write holds in addition to
their monitoring exclusions. Their existing entries continue supplying public
prerequisite metadata; neither a future full phase nor later successful CI may
turn those excluded roots into dependency-update targets.

## Public operational coverage

The allowlist does not establish repository visibility. Discovery classifies
visibility before collecting source. Public coordinator artifacts/state contain
only verified public sources; inaccessible/non-public entries produce opaque
coverage holds without widening credentials or revealing source names/bodies.

DA-INV-005 public raw reads use the same reviewed entries and exact source tree.
They grant no additional installation, credential, private-source or write scope;
unknown visibility and unverified file bytes remain held. DA-INV-006 HTTP
diagnostics expose only sanitized failure context, never access tokens or bodies.

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

The scheduled single-pilot checkpoint keeps global phase `pilot`, so only
individually activated entries can enter the writer matrix. Its expected
schedule value does not enable hosted scheduling: actual activation follows
the selected pilot's candidate/main/replay acceptance. Missing variables retain
the workflow's default-off gate, independently of checkpoint metadata.

`config/operations.json` records reviewed template references, single update
class owners, retained exclusions and a dated activation checkpoint, without
granting settings authority. `config/advisories.json` is the separately reviewed
exact approval authority under DA-OPS-002; its initial list is empty. Source
observations and raw audit findings cannot create approvals.

The initial November 16 operator decision added one exact coordinator deepmerge entry
with the reviewed dependency-source/lock binding and November 21 expiry.
This changes only advisory admission under DA-OPS-002; repository scope,
existing holds, rollout phase and the separate write gate remain unchanged.

After retirement of that LOW decision, the November17 operator explicitly
approves two exact HIGH picomatch runtime paths bound to dependency source
9d657a74 and lock SHA256a3e1f05f. Their exclusive November19,00:00UTC expiry
and earlier known-fix termination are independent of the historical LOW scope.
Only `config/advisories.json` grants those two tuples; all other findings,
source/lock drift, stale approval cleanup and existing rollout gates still deny
writes. The decision does not activate another repository or consumer exception.

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

Notebook is the sole additional pilot update entry for the bounded canonical
Core development intake. This changes no global phase, schedule, service scope,
package exclusions or held publisher. Source review and actual normal bot
regeneration remain separate from source qualification of DA-WAVE-007; the
[bounded pilot runbook](../../docs/notebook-canonical-pilot.md) retains acceptance
and rollback.

PR34's explicit operator decision rebinds the single existing coordinator
runtime LOW to source9d657a74 and locka3e1f05f…ca61b8b after the required
validator update. This replaces the old exact tuple and preserves expiry,
known-fix rejection and every other audit failure under DA-OPS-002. No write
scope, activation setting, phase, package signing or deployment gate changes.

The five existing pilot tooling cohorts allow exactly spec-validator0.2.0 or
the reviewed Deno-free0.2.1 patch. This explicit DA-TOOL-003 policy repair
unblocks the source-owned release-intent hook without skipping it or widening
other tooling families. Historical source/lock evidence remains unchanged.

The same exact advisory entry is now retired after official upstream withdrawal
and complete zero-finding audit evidence. Active approvals are empty. This
DA-OPS-002 cleanup neither installs a dependency fix nor grants any new
exception; every future finding must pass the unchanged rejection policy.

Docs and Tasks add exact completion observation and one-repository read-only
App readiness targets while retaining source phase full. This metadata does
not grant writer, publication or audit-exception authority. Their newly observed
HIGH Changesets finding remains blocked by the existing consumer gates; only
separately qualified source adoption may precede a reviewed phase change.

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
