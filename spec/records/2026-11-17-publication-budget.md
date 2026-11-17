# Full-inventory publication resource qualification

Coordinator PR38 merges at `8dbd06b52e8e84a18f3a0732eb0ecaad916e4243`.
Exact-main check43986106119 and specification deployment43986101753 pass.
Normal reconciliation43986461238 succeeds and persists generation81, but emits
no consumer writes: Plugins still waits on five `publication-byte-limit`
observations, and Notes remains upstream-wait. Successful inventory execution
does not prove publication acceptance or complete S3.

The immutable inventory artifact14284439907 has ZIP digest
`sha256:77dabb3cce01d37700e17f9383812be9d0f2ba3a361f015fcb2e935c96dc91bc`.
Its report covers 19 repositories, 43 public package owners and 220 edges with
no coverage holds or runtime cycles. Fresh full-collector reproduction retains
these exact public source coordinates and waiting baselines, reads public npm
metadata and invokes the actual reviewed ECDSA/Sigstore verifier through the
pinned standard CLI. Public GET responses are cached outside source for exact
repeatability; no raw artifacts or reports are committed or published to Pages.

The original ten-package probe did not cover the whole inventory's resource
surface. The full reproduction has 14 byte-limited observations. The current
40,983,874-byte candidate, older still-current 17,216,619-byte candidate and
16,061,227-byte Docx npm archive already total 74,261,720 bytes, exceeding the
former 64 MiB budget before Notes and public metadata. The static reader's
reviewed 16 MiB npm bound also disagrees with the crypto wrapper's hard-coded
4 MiB bound, wasting the larger read before an incorrect subject-size hold.

The source repair makes the shared fetch ceiling explicitly 128 MiB and retains
the 256-request limit and every per-response, source, redirect, timeout and
archive bound. Only the exact reviewed Plugins static profile can pass npm
archives up to 16 MiB to the crypto verifier; Notes, absent/unknown profiles and
foreign publishers retain their 4 MiB bound. Every current owned version gets
its observation pass before other tags or retained baselines. An untrusted
claim preflight rejects inconsistent subjects before downloading npm bytes;
it cannot grant assurance, and full crypto/source validation still runs.

The two new exact behavioral regressions fail before the repair and pass
afterward. The focused publication suite passes 63 tests, including the real
registry/DSSE/Ed25519 negatives, default and foreign-profile size rejection,
oversized static input, total-budget exhaustion and duplicate-read caching.
The full public-source reproduction then makes 196 reads and consumes
84,776,455 bytes, with zero byte-budget holds. All ten new Plugins versions and
the still-current History0.5.1 verify and match the current public contracts;
17 publication observations verify overall. Unreviewed publishers, unpublished
versions, incomplete releases and six oversized older candidates remain held.
Neither a larger total budget nor successful preflight waives those failures.

A separate fresh GET-only inventory rediscovers all 19 repositories, 43 owners
and 220 edges with zero coverage holds or cycles. Its publication reader uses
178 requests/84,177,028 bytes, and independently verifies the same eleven
current Plugins contracts. Full `pnpm verify` passes 349 tests and all three
specification lanes on Node24.15.0. Actionlint and all nineteen generated native
Renovate configurations pass; the existing optional native RE2 fallback is
unchanged. Doctor passes all eleven checks and semantic QMD discovery works.

The first broad verification correctly rejects one multi-sentence canonical
bullet, then the missing mapped waves chapter; both specification defects are
repaired and the exact specification command plus final full verification pass.

Source deployment, a fresh normal hosted inventory/state read-back, genuine
Notes progress and idempotent replay remain required after this change merges.
This slice changes no dependency graph, advisory decision, tag, rollout phase,
schedule, credential permission, persisted-state schema or state by hand.
