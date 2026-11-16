# Operational drift and advisory admission

## DA-OPS-001 — Bounded operational observations

**Requirement.** The production maintenance audit MUST report exact-source template/runtime, update-owner, exclusion, activation and required-check observations with explicit unavailable or unknown coverage.

### Acceptance details

- Local composite actions MUST be resolved recursively at the same source revision; missing, cyclic or unsupported action/workflow bodies MUST remain explicit coverage gaps.
- Reviewed action pins and Node versions MUST be compared without interpreting arbitrary scripts as a complete security analysis.
- Required-check settings MUST be read separately from source PR-job candidates; inaccessible protection/rules APIs MUST NOT prove coverage or absence of requirements.
- Activation reads MUST retain only allowlisted public-safe booleans/phase from the Variables API or the exact main audit workflow's observed Actions context, with explicit provenance; exclusions and update ownership MUST remain visible without changing settings.

## DA-OPS-002 — Exact advisory decisions

**Requirement.** Coordinator write admission MUST reject every audit finding except an explicitly approved, unexpired exact advisory/package/version/path/dependency-source/lock binding with no known published fix.

### Acceptance details

- The approval authority MUST default empty without inherited exceptions or automatically created approvals.
- Malformed, incomplete, muted or unavailable audits and unknown fix metadata MUST fail closed; additional findings, mismatches, expired approvals and available fixes MUST reject writes.
- The source binding MUST identify the immutable most recent manifest/lock commit and the SHA256 of exact lock bytes, allowing a separately reviewed policy-only approval without a self-referential commit hash.
- Unmatched approvals MUST be reported as stale cleanup findings and MUST NOT silently authorize future findings; fixes MUST require approval retirement.

## DA-OPS-003 — Pre-admission execution

**Requirement.** Real coordinator audit qualification MUST precede writable wave admission and App token minting while preserving read-only inventory and state-only pilot observations.

### Acceptance details

- Inventory MUST run the complete scripts-disabled coordinator audit and emit a public-safe decision; denied writes MUST produce no writable target matrix or new writable admission.
- Reconcile MUST repeat the actual preflight before writer App minting; a prior report alone MUST NOT authorize writes.
- Read-only collection and state-only reporting MUST remain possible with unapproved findings, without modifying activation, repository protections or credentials.

## Recorded decisions

The operator approved the exact coordinator deepmerge decision proposed in
[PR21](https://github.com/lapismd/dependency-automation/pull/21) on November 16.
`config/advisories.json` owns its dependency-source/lock/path/version binding
and November 21 expiry. The [decision record](https://github.com/lapismd/dependency-automation/blob/main/docs/approved-coordinator-advisory.md)
records that scope; all rejection and cleanup requirements above still apply.

The reviewed activation checkpoint is writes=true, phase=pilot, waves=true,
schedule=false and state-writes=true following the explicit manual pilot
cutover. This comparison checkpoint does not change absent-variable/default-off
workflow semantics or external settings. Genuine callback/receiver qualification
is recorded separately from pending publication or replay outcomes.

The operator separately approved the validator-update rebinding in PR34 to
dependency source9d657a74 and exact lock SHA256a3e1f05f…ca61b8b. This replaces
the stale prior tuple without extending the November21 expiry or adding any
advisory, package path, scope or rollout authority. `config/advisories.json`
remains the sole machine-readable approval authority; raw audit observations
and version recipes cannot renew it.

The exact approval is subsequently retired under DA-OPS-002 after upstream
withdrawal at2026-11-16T18:55:38Z and complete zero-finding audit evidence.
Hosted43960484629 correctly held writes on the stale cleanup item; reviewed
removal restores the empty approval list without changing any rejection rule,
source/lock bytes, scope, activation or pilot gate. The
[retirement record](../records/2026-11-16-advisory-retirement.md) retains the
before/after preflight and pending hosted reconciliation distinction.
