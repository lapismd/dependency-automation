# Approved coordinator advisory decision — November 16, 2026

The operator explicitly approved the exact decision proposed in
[PR21](https://github.com/lapismd/dependency-automation/pull/21) on November 16.
The runtime authority is the single entry in `config/advisories.json`.
The earlier disabled proposal remains a historical review artifact.

| Binding                      | Approved value                                                     |
| ---------------------------- | ------------------------------------------------------------------ |
| Advisory                     | GHSA-gcqx-w48m-w2h4                                                |
| Package and resolved version | deepmerge 4.3.1                                                    |
| Exact dependency path        | `.>renovate>deepmerge`                                             |
| Severity                     | LOW                                                                |
| Dependency-source commit     | `7141c2ba56bfc46f620d7020bcc61808d8192ba7`                         |
| Lockfile SHA256              | `889c017f647b35c3955e79683c9915d5bfc7e7b660a3b9a1c481b7098d0c5b2c` |
| Approval recorded            | 2026-11-16T00:19:11.000Z                                           |
| Exclusive expiry             | 2026-11-21T00:00:00.000Z                                           |
| Early termination            | A known published fix, whichever occurs first                      |

This decision covers the Renovate automation runtime with repository-scoped bot
write permissions. The advisory concerns prototype poisoning during merge
operations. The operator reviewed this scope separately from the earlier
Visual Delta exception.

The fresh pre-approval `node scripts/audit-preflight.mjs` exited 1 with exactly
one unapproved LOW path and no cleanup findings. Its source and lock bindings
matched the values above. All four MODERATE glob/minimatch paths were already
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
