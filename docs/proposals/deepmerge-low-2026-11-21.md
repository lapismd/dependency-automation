# Disabled proposal: coordinator deepmerge LOW

Historical proposal retained for the reviewed tuple. The operator subsequently
approved that exact scope on November 16; see the
[decision record](../approved-coordinator-advisory.md). This proposal and its
adjacent JSON remain disabled; only `config/advisories.json` is runtime authority.

This is a concrete proposal for operator review, **not an approval**. It is
outside `config/advisories.json`, whose approval list remains empty. Current
dependency-write admission remains held. The adjacent
[disabled JSON proposal](deepmerge-low-2026-11-21.json) has `enabled:false` and
`approvedAt:null`, so it cannot satisfy the runtime approval schema.

The proposed bounded decision is to accept only GHSA-gcqx-w48m-w2h4 in
`deepmerge@4.3.1`, exact path `.>renovate>deepmerge`, severity LOW, until
**2026-11-21T00:00:00Z or a known published upstream fix, whichever comes first**.
It applies only to dependency source commit
`7141c2ba56bfc46f620d7020bcc61808d8192ba7` and lock SHA256
`889c017f647b35c3955e79683c9915d5bfc7e7b660a3b9a1c481b7098d0c5b2c`.

The affected dependency executes in the **Renovate automation runtime with
scoped bot write permissions**. It is not an application shipping dependency.
The advisory concerns prototype poisoning during merge operations; no claim
is made that automation exposure is impossible or that ordinary tests remove
that risk. Credential provisioning and permission to maintain repositories do
not approve this risk decision. The proposal does not enable dependency writes
or change the existing pilot/operator gates.

[PR19](https://github.com/lapismd/dependency-automation/pull/19) remediated all
four MODERATE glob/minimatch paths while retaining the reviewed Renovate
version and testing its real matcher/cleanup APIs. On the freshly installed
frozen graph, `node scripts/audit-preflight.mjs` exited 1 as intended and
reported exactly one unapproved LOW path. Registry metadata at the recorded
observation time reported latest deepmerge 4.3.1 and no patched range; the
preflight independently checks published versions against advisory ranges.
See the [upstream advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)
and [official npm metadata](https://registry.npmjs.org/deepmerge).

[PR21](https://github.com/lapismd/dependency-automation/pull/21) supplies the
exact source/lock/path/version/severity/expiry guard. Any other advisory,
additional path, changed graph binding, expired approval, incomplete/muted
audit, unavailable fix evidence or known published fix continues to deny writes.
A disappeared finding requires stale approval retirement, and the runtime
never installs a fix or broadens an exception automatically.

Only an explicit operator approval could authorize a later source change adding
the exact candidate to the approval authority, with its actual approval time
and linked review. Until then this document and JSON remain inert review
material. Fresh audit qualification, existing functional/current-head checks,
source-owner consumer gates and separate write activation are still required.
