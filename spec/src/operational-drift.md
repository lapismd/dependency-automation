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

The reviewed activation checkpoint records writes=true, phase=pilot, waves=true,
schedule=true and state-writes=true after the genuine Notebook candidate,
main and normal replay qualify. Live variable read-back records activation at
2026-11-17T19:03:07.167Z. This comparison checkpoint does not change absent-variable/
default-off workflow semantics or external settings. The timer configuration,
actual callbacks and ordinary-run receipts remain separate observations.

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
[retirement record](https://github.com/lapismd/dependency-automation/blob/main/spec/records/2026-11-16-advisory-retirement.md) retains the
before/after preflight and pending hosted reconciliation distinction.

## Picomatch observation and exact approval — November 17

Fresh coordinator audit reports HIGH GHSA-fc5q-39xc-vjpf on picomatch2.3.2 and
4.0.7 at two exact Renovate runtime paths. The dependency-source/lock bytes are
unchanged; the earlier clean observations and retired LOW decision cannot
authorize these findings. Normal audit admission denies writes before App
minting, and the operator also places the consumer writer switch off while
scheduling remains off. The disabled proposal in
`docs/proposals/picomatch-high-2026-11-19.md` grants no authority; DA-OPS-002
still requires a fixed dependency graph or explicit exact operator decision.

The operator subsequently explicitly approves exactly the two proposal bindings
at `2026-11-17T18:15:39.194Z`, expiring exclusively November19,2026 at00:00UTC
or sooner on a known published fix. Active policy retains unchanged dependency
source9d657a74/locka3e1f05f and reviewed proposal PR69. Fresh preflight must
accept only those two paths; raw audit still reports HIGH, all other gates
remain blocking, and hosted deployment/regeneration acceptance is separate.
The [activation evidence](https://github.com/lapismd/dependency-automation/blob/main/spec/records/2026-11-17-picomatch-approval.md) records
before/after qualification without treating the graph as clean.

Those exact HIGH approvals are subsequently retired under DA-OPS-002 after
upstream withdrawal at2026-11-18T15:38:56Z and complete zero-finding audit
evidence. Preflight correctly holds writes on two `retire-stale-approval`
cleanup items until reviewed removal restores the empty approval list without
changing any rejection rule, source/lock bytes, scope, activation or pilot gate.
The [retirement record](https://github.com/lapismd/dependency-automation/blob/main/spec/records/2026-11-19-picomatch-retirement.md)
retains the before/after preflight and pending hosted reconciliation distinction.

The retained exclusion checkpoint also names `lapismd/agent-redaction` and
`@lapismd/agent-redaction`, matching the operator’s Deno-package exclusion.
Removing either remains observable drift; this is not an advisory decision or
activation change.
