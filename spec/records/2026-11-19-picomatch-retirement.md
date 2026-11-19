# Coordinator picomatch approval retirement — November 19, 2026

## Exact decision and cause

DA-OPS-002, DA-OPS-003 and DA-POL-003 retain their implemented contracts.
Only the two approved GHSA-fc5q-39xc-vjpf /picomatch entries are removed from
`config/advisories.json`. There is no replacement approval, changed dependency,
changed rejection rule or expanded scope. The historical approval record retains
the exact source/lock bindings and exclusive November19 expiry; withdrawn
findings cannot reserve future acceptance.

Official GitHub advisory metadata reports withdrawal at
2026-11-18T15:38:56Z (updated15:38:58Z). Its package record still lists no
first patched version. Withdrawal is not evidence of an installed fix. A fresh
complete `pnpm audit` exits0 with zero findings at all severities.

## Preflight before and after removal

Before removal, the real `node scripts/audit-preflight.mjs` reports
allowed=false at2026-11-19T07:46:15.866Z against dependency source
9d657a7458e40ca84962a12c9b8e361534b3470f and lock SHA256
a3e1f05fe6a25925d61b6af7baf5316c24156a0b71319611f6e3298bbca61b8b. Findings are
empty; cleanup lists exactly two `retire-stale-approval` items for picomatch
2.3.2 at `.>renovate>@yarnpkg/core>micromatch>picomatch` and picomatch4.0.7 at
`.>renovate>re2>node-gyp>tinyglobby>picomatch`. Consumer reconciliation remains
skipped for a held write admission.

After removing only those two obsolete approvals, the same real command accepts
the unchanged dependency tuple with zero findings and no cleanup. No subprocess
or audit policy code changed. Existing advisory and production-preflight
regression controls remain binding. Exclusive calendar expiry
2026-11-19T00:00:00.000Z is already past; retirement follows withdrawal and
stale-cleanup denial rather than automatic extension.

## Source validation and remaining acceptance

Full `pnpm verify` passes726 tests and all three specification lanes under the
contracted Node24.15.0 and gh2.102.0 tool tuple. Doctor reports11/11 and QMD
discovers DA-OPS-002 without fallback. Formatter and repository check scripts
pass. Hosted current-head checks, normal pilot reconciliation, genuine
release-chain completion and idempotent replay remain separate acceptance gates.
No schedule, rollout phase, repository/channel scope, signing or frozen-host
hold changes. Issue71 closes when this reviewed retirement deploys; pilot
success never renewed or rebound the exact tuples.
