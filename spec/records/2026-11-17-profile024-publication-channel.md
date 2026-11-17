# Profile0.2.4 publication-only channel binding

## Decision and boundary

Complete the already-authorized maintenance release chain using the existing
reviewed cohort mechanism. Add only `@lapis-notes/app-profile@0.2.4`, source
`92f1cdbf276a1275370677bb35ccb5e08318099f`, with exact registry integrity
`sha512-sbHQq2j0gXU7E29v0yzrW67eCTNv7fYbGpM9H2mKhpV88rXBh95Umc4gj3b5ZQ+YbUBE0/9n4R7erqfeYRZJOQ==`.

The package is a publication-only pin: its name is rejected in every consumer
scope entry. There are no added repositories, manifest paths, dependency fields,
consumer writes or admitted Profile updates. Global `latest`, registry tags,
pilot phase, scheduled/full rollout, all exclusions, source qualification,
publication provenance/integrity, dependency floors and CAS remain binding.
No release is rebuilt, republished or fabricated to exercise this policy.

## Independent publication evidence

Hosted inventory44027276770, exact coordinator source834c058b, observes Profile
publication as verified but channel-not-admitted. Its digest-checked artifact
14303792289 retains actual publisher44017925251 attempt1 and same-source,
same-artifact verification attempt2. Both bind Notes source92f1cdbf, manifest
SHA256514fe6e8524049309c7486cbd5340b567ff4907cd4e7c3cfb4319d40527e0497,
release ZIP SHA256e7b262fa68d04e5bd4d6366fee0910e1415318efb16e278d7a4d87750d5393c9
and npm archive SHA256159377ba6059128f88964703243119edfa31ac1ea5fc1f79a4758f7e40ce6af9.
Full source/lock/current CI and authenticated npm signature/provenance proof
remain independently required; a hardcoded coordinate alone grants nothing.

## Qualification

Before editing source, twelve focused regressions report ten passing negative
gates and two failures: no exact Profile pin and its genuine wait stays open.
After the change all twelve pass. The full focused channel/publisher suite
passes51 cases, including unchanged-version, unmet-floor, unknown-proof,
source/integrity/channel drift, failed/pending current CI and stale policy
holds. Exact Profile consumer scopes are rejected. Retirement and replay
preserve all global availability facts, release identities and operation IDs.

The first expanded run reports50 pass/one failure because the registry refresh
asserted eight reads for four pins. The fifth publication pin correctly requires
ten reads; update that explicit expectation while preserving all five identity,
deprecation, channel and transport refusal scenarios.

Fresh GET-only inventory retains19 repositories,43 owners,220 edges and zero
coverage gaps/cycles/audit findings. Initial local planning omitted the public
bot author setting and held nodes; replanning the same fresh observations with
the configured public bot identity qualifies Notes and recognizes Profile024.
However its genuine persisted wait correctly remains: the published Design Core
range is `^0.13.3` while the retained required minimum is0.13.4. Other five
required floors match. Do not claim retirement, weaken this floor gate or create
a release merely to satisfy a planner assertion. Trace the original intent's
source and whether it incorrectly treated a compatible lock-only change as a
required new runtime minimum in the next source slice.

The qualified dry-run replay preserves release objects and operation IDs.
Global Profile availability remains0.1.0 and Server/Desktop stay held. The local
native-config setup initially tries a non-admitted wave target and is correctly
refused; separate syntax validation uses the ordinary non-wave configuration
surface only and grants no writer authority.

Complete source checks and deployed acceptance of this publication-only policy
remain required. Full Notes retirement and downstream delivery are open.

## Local source acceptance

The additional regression reproduces the actual lower compatible Core minimum
with its qualified lock already at0.13.4: channel recognition succeeds while
the original release wait stays held. This is a remaining source/intent question,
not permission to relax the release-floor check.

Final local acceptance passes411 tests including that additional floor regression,
three specification lanes, Actionlint and19 fresh native Renovate syntax
configurations. QMD semantic discovery succeeds; doctor passes11/11; registry
still reports0.2.1 as the latest Deno-free validator. The optional native RE2
module remains unavailable and Renovate uses its existing fallback; validation
succeeds without changing tool dependencies or audit policy.
