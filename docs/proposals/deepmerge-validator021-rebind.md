# Exact coordinator advisory rebinding proposal

Status: disabled; operator decision required. Existing approval policy is unchanged.

The mandatory released Deno-free spec-validator0.2.1 update changes only that
development dependency resolution. The frozen Renovate runtime still reports
exactly one LOW finding and no other vulnerabilities. This proposal changes no
advisory, package version, path, severity or expiry, and grants no new workflow,
repository, rollout or publication authority.

Proposed replacement binding:

| Field                    | Exact value                                                        |
| ------------------------ | ------------------------------------------------------------------ |
| Advisory                 | GHSA-gcqx-w48m-w2h4                                                |
| Package                  | deepmerge                                                          |
| Version                  | 4.3.1                                                              |
| Dependency path          | `.>renovate>deepmerge`                                             |
| Severity                 | LOW                                                                |
| Dependency-source commit | `9d657a7458e40ca84962a12c9b8e361534b3470f`                         |
| Lockfile SHA256          | `a3e1f05fe6a25925d61b6af7baf5316c24156a0b71319611f6e3298bbca61b8b` |
| Expiry                   | November21,2026 at00:00UTC, or sooner when a fix exists            |
| Runtime                  | Coordinator Renovate with scoped repository writes                 |

Fresh `pnpm audit --json` reports one LOW, zero MODERATE/HIGH/CRITICAL.
Official registry metadata still publishes4.3.1 as latest, with no patched
release. The actual preflight holds the new graph; no old exact-lock decision
is transferred and no approved timestamp is fabricated.

Activation replaces the stale prior-source/lock entry only after the operator's
decision is recorded, with actual approval time and this review. All other
findings, known-fix rejection, expiry, exact source/lock/path matching and stale
approval cleanup remain blocking. Preserve the reviewed source commit in merge
history so the bound dependency source remains independently reproducible.

[Full source qualification](../../spec/records/2026-11-16-scoped-channels-static-proof.md)
records333 tests, three specification lanes,20 real configuration validations,
the Maintenance parser and fresh19-repository/43-owner/220-edge inventory.
Hosted checks and writable rollout remain separate gates.
