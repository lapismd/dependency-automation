# Exact picomatch runtime approval — November 17, 2026

## Authority and scope

The operator explicitly approved the exact proposal reviewed in
[PR69](https://github.com/lapismd/dependency-automation/pull/69), source
f2bfb9c3623cd73b81ce5dba6cb0fde5a22df6a3. The approval is recorded at
2026-11-17T18:15:39.194Z. DA-OPS-002/003 retain their exact admission and
pre-App audit contracts; no evaluation code or dependency bytes change.

Only HIGH GHSA-fc5q-39xc-vjpf on these two runtime identities is approved:

- picomatch2.3.2 at `.>renovate>@yarnpkg/core>micromatch>picomatch`.
- picomatch4.0.7 at `.>renovate>re2>node-gyp>tinyglobby>picomatch`.

Both bind dependency-source9d657a7458e40ca84962a12c9b8e361534b3470f and exact
lock SHA256a3e1f05fe6a25925d61b6af7baf5316c24156a0b71319611f6e3298bbca61b8b.
Exclusive expiry is November19,2026 at00:00UTC, or sooner on a known published
fix. Repository-scoped App write credentials and runtime exposure are explicit;
this is not a development-only waiver. No consumer exception is included.

## Actual before and after evidence

`node scripts/audit-preflight.mjs` before activation reports allowed=false at
2026-11-17T18:15:07.743Z, exactly two unapproved HIGH paths and no cleanup.
After adding only the two approved tuples, the same command reports allowed=true
at2026-11-17T18:15:40.244Z, two exact-approved-finding results and no cleanup.
The complete raw `pnpm audit --json` still exits1 and reports two HIGH findings;
qualification does not describe a clean dependency graph. Current registry
metadata provides no published fix.

The actual policy/audit evaluator rejects six independent mutations: source,
lock, exclusive expiry, unavailable registry, known published fix and an extra
path. `node --test tests/advisories.test.mjs tests/audit-preflight.test.mjs`
passes7/7, including malformed/muted evidence, exact bindings and stale cleanup.
Local raw audit, before/after preflight and mutation receipts are retained in
`coordinator-picomatch-approval-20261117/` outside the repository.

## Deployment boundary

Consumer writes and scheduling remain off during source validation and review.
Restore only the already-reviewed Notebook pilot writer after the approved
policy is deployed and fresh audit admission passes. Regenerate its existing
bot PR through the normal checked action; retain strict consumer guards,
current-head CI, automatic merge, main completion, no-false-publication and
idempotent replay before enabling scheduling. Other repository adoption stays
independently tracked under issue50; no global rollout is authorized by this
security decision. Source validation and hosted acceptance are separate.

## Source validation

Full `pnpm verify` passes the repository checks and466/466 tests, then exposes
a missing parallel mapped policy chapter in spec-first. Add that chapter with
the same bounded approval statement and rerun the document checks; no runtime
code or test changes follow the passing suite. All19 generated native Renovate
configurations strictly validate. Actionlint passes; doctor reports11/11 and
QMD discovers DA-OPS-002 without fallback. Fresh read-only inventory is retained
separately from writable hosted acceptance.

Final repository formatting/syntax/pin checks and all three specification lanes
pass after the mapped policy update. Fresh GET-only inventory reports19
repositories,43 owners,220 edges, zero coverage gaps and zero runtime cycles;
its actual audit qualifies exactly the two approved HIGH paths. Requested and
effective writes are false, state writes are false, and other writers remain
outside pilot. No hosted consumer write is inferred from this read-only proof.
