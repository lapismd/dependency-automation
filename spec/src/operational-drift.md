# Operational drift and advisory admission

## DA-OPS-001 — Bounded operational observations

**Requirement.** The production maintenance audit MUST report exact-source template/runtime, update-owner, exclusion, activation and required-check observations with explicit unavailable or unknown coverage.

### Acceptance details

- Local composite actions MUST be resolved recursively at the same source revision; missing, cyclic or unsupported action/workflow bodies MUST remain explicit coverage gaps.
- Reviewed action pins and Node versions MUST be compared without interpreting arbitrary scripts as a complete security analysis.
- Required-check settings MUST be read separately from source PR-job candidates; inaccessible protection/rules APIs MUST NOT prove coverage or absence of requirements.
- Activation reads MUST retain only allowlisted public-safe booleans/phase; exclusions and first-party version versus third-party/security ownership MUST remain visible without changing settings.

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
- Reconcile MUST repeat the actual preflight before App minting; a prior report alone MUST NOT authorize writes.
- Read-only collection and state-only reporting MUST remain possible with unapproved findings, without modifying activation, repository protections or credentials.
