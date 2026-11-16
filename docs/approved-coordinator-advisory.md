# Approved coordinator advisory decision — November 16, 2026

The operator explicitly approved the exact decision proposed in
[PR21](https://github.com/lapismd/dependency-automation/pull/21) on November 16,
then explicitly approved the exact validator-update rebinding in
[PR34](https://github.com/lapismd/dependency-automation/pull/34).
The runtime authority is the single entry in `config/advisories.json`.
The earlier disabled proposal remains a historical review artifact.

| Binding                      | Approved value                                                     |
| ---------------------------- | ------------------------------------------------------------------ |
| Advisory                     | GHSA-gcqx-w48m-w2h4                                                |
| Package and resolved version | deepmerge 4.3.1                                                    |
| Exact dependency path        | `.>renovate>deepmerge`                                             |
| Severity                     | LOW                                                                |
| Dependency-source commit     | `9d657a7458e40ca84962a12c9b8e361534b3470f`                         |
| Lockfile SHA256              | `a3e1f05fe6a25925d61b6af7baf5316c24156a0b71319611f6e3298bbca61b8b` |
| Approval recorded            | 2026-11-16T18:32:00.563Z                                           |
| Exclusive expiry             | 2026-11-21T00:00:00.000Z                                           |
| Early termination            | A known published fix, whichever occurs first                      |

This decision covers the Renovate automation runtime with repository-scoped bot
write permissions. The advisory concerns prototype poisoning during merge
operations. The operator reviewed this scope separately from the earlier
Visual Delta exception.

The original PR21 pre-approval `node scripts/audit-preflight.mjs` exited1
with one unapproved LOW and no cleanup findings, against the historical
7141c2ba /889c017f tuple. The new PR34 tuple and its separate preflight
are recorded below. All four MODERATE glob/minimatch paths were already
remediated by [PR19](https://github.com/lapismd/dependency-automation/pull/19).
Raw audit output continues to report the LOW; policy qualification does not
change the audit result or claim a vulnerability-free graph.

Every other finding, additional path, source/lock mismatch, expired or future
approval, muted/incomplete audit and unavailable fix evidence remains blocking.
A disappeared finding requires retiring this entry. The runtime checks current
registry fix evidence before writable admission and repeats the audit before
App minting. The decision does not broaden repository scope or alter branch,
functional, accessibility, packaging, compatibility or publication gates.

After policy deployment, retain pilot phase for the controlled dependency wave,
read back its source/state/report receipts, and expand only after acceptance.
Existing explicit Desktop and frozen-host holds remain authoritative.

The rebind changes only the dependency-source and lock hashes required by the
workspace-mandated Deno-free validator0.2.1 update, its actual approval time and
review link. The operator separately approved these exact bytes; the original
7141c2ba /889c017f binding is historical and removed from active policy.
November21 expiry and all other gates remain unchanged. At
2026-11-16T18:30:55.646Z the actual preflight correctly reported the new tuple
unapproved and the old tuple stale. The disabled proposal remains a review
record with its activation status updated, not a second approval authority.

At2026-11-16T18:32:01.456Z, the actual post-activation preflight accepted exactly
the approved9d657a74 /a3e1f05f tuple: allowed=true, one
exact-approved-finding and empty stale-cleanup list. Fresh official registry
metadata still exposes no fix. Raw audit remains one LOW; all other findings
and unavailable evidence still deny writable admission.
