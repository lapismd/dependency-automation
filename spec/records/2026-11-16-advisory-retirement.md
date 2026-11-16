# Coordinator advisory retirement — November 16, 2026

## Exact decision and cause

DA-OPS-002, DA-OPS-003 and DA-POL-003 retain their implemented contracts.
Only the single approved GHSA-gcqx-w48m-w2h4 /deepmerge4.3.1 /
`.>renovate>deepmerge` entry is removed from config/advisories.json. There is
no replacement approval, changed dependency, changed rejection or expanded scope.
The historical approval record retains the exact source/lock and exclusive
November21 expiry; withdrawn findings cannot reserve future acceptance.

Official GitHub advisory metadata reports withdrawal at
2026-11-16T18:55:38Z and update18:55:42Z. Its package record still lists
no first patched version. Withdrawal is not evidence of an installed fix.
A fresh complete pnpm audit exits0, zero findings at all five severities,
empty muted list and602 total dependencies.

## Hosted stale-cleanup evidence and Core recovery

Normal exact-state recovery43960484629 succeeds at coordinator source
ebc7d2de98d04415d8f035b7fafcb5b88ced351c. It proves Design Core's source
8c9d4974becd27506c506575e52829905c8656a9 unchanged and public, with no retained
dependency branches, dependency PRs or orphan branches and a completed
originating reconcile43861120207. No wave state is edited manually.

Recovery binds operation42ef04bc5c04b158a448bb4f25066d0c03723696434b41b4d55515d71ee89258
to expected state3f82aaeb31e4de070895cf83e0aa1529d7094a33. The successful CAS
publishes generation68 at0359bd01aa8607d16c47ecb8347f2659f6d49f10; the original
operation is retry-approved and its new current-policy candidate is planned.
An earlier local dispatch precondition observed changing state and refused to
send a stale recovery request; the settled exact revision was re-read first.

The same hosted inventory audit reports zero findings but allowed=false,
with exactly one `retire-stale-approval` cleanup item. Consumer reconciliation
is skipped, so no writer token/PR is inferred. State-only reporting remains
available as required. Production writes remain held until this removal passes
normal source review and deployed reconciliation repeats the real preflight.

## Source validation and remaining acceptance

The real preflight before removal is the retained hosted denial above. After
removal, the unchanged real command accepts exactly dependency source
9d657a7458e40ca84962a12c9b8e361534b3470f and lock SHA256
a3e1f05fe6a25925d61b6af7baf5316c24156a0b71319611f6e3298bbca61b8b,
with no findings and no cleanup. No subprocess/audit policy code changed.
Existing advisory and production-preflight regression controls remain binding.

Full `pnpm verify` passes338 tests and all three canonical lanes; formatter
and actionlint pass. Fresh GET-only inventory reports19 repositories,43 owners
and220 edges with no coverage gaps or cycles; all19 freshly generated native
Renovate configurations pass strict validation. Doctor passes11/11 and semantic
QMD returns the owning advisory requirement. The first search invocation used
an extra pnpm separator and failed argument parsing; the corrected QMD command
passes, with no fallback or canonical scan before discovery.
Hosted current-head checks, normal pilot reconciliation, genuine release-chain
completion and idempotent replay remain separate acceptance gates. No schedule,
rollout phase, repository/channel scope, signing or frozen-host hold changes.
