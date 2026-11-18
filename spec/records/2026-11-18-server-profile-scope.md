# Exact Server Profile consumption scope

DA-PUB-003 now admits the already verified Profile0.2.6 cohort pin only at
`lapismd/lapis-server:package.json:dependencies`. The previous publication-only
rule held Server's actual public Profile prerequisite even though its exact
source538bb469, integrity and next membership had been verified. Other Profile
consumer repositories, paths and dependency types remain rejected by policy,
including Desktop and development/optional/peer fields. No pin, registry tag,
publisher, source guard, advisory decision, phase or inactive SDK grant changes.

## Regression and boundaries

Before implementation, the new27-case target has25 passes and two failures:
the reviewed scope is absent and Server cannot select the verified pin.
After the scope addition, one new test incorrectly asks the publication
projection itself to withhold a version when current CI fails. Publication
observation and current-source wave qualification are independent boundaries.
The corrected test first proves successful release retirement, then proves
failed current CI retains the release wait and failed wave acceptance. This
changes no production CI predicate or failure assertion. All27 exact cases
and57 combined channel/retirement cases pass.

Controls reject eight unreviewed scopes and their projected leakage, moved next
membership, wrong integrity/source, unknown proof, deprecated/private publishers,
stale policy and revoked scope. Raw latest-only availability and publication
facts remain byte-identical. Existing retirement/current-CI/dependency-floor and
no-duplicate replay checks retain their meaning; Server's new positive direct
scope has separate coverage.

The first wider invocation lacks the exact reviewed GitHub CLI binary on PATH:
six verifier failures correctly reject that environment. With the original
qualified gh2.102.0, Node24.15.0 and pnpm10.34.5 restored, all672 tests pass,
zero skipped. The first specification replay rejects a fifth acceptance bullet;
fold its scope constraint into the existing direct-scope item, preserving every
prior condition and the unchanged four-bullet cap. Final specification replay
is recorded separately below. No verifier, trust seed or assertion is relaxed.

## Actual source and generated configuration

Fresh GET-only observation covers19 repositories,42 owners and212 edges with
zero coverage gaps or cycles. Requested/effective repository and state writes
are false. The original source/lock-bound coordinator audit exception remains
unchanged; it grants no Server audit exception.

At actual Server3c8e48a2 the unavailable-Profile hold disappears and the real
compatible Profile0.2.2-to0.2.6 patch becomes visible. All eight mixed-batch
canonical holds remain because Tasks0.1.1-to0.2.1 is an unsupported breaking
minor transition. All three genuine upstream publication-floor waits remain:
Profile, Search and Source Editor still require their Core minimum repair and
actual publication. Zero Server writes are admitted. This is neither a manual
minor migration nor full repository adoption acceptance.

Strict JSON and CJS Renovate validation pass for a controlled admitted Server
patch: respectLatest stays true globally and exactly one rule relaxes it for
the root runtime Profile0.2.6 target. This controlled configuration is not an
actual source admission or writer receipt. The existing missing native RE2
warning remains visible. Actionlint, doctor11/11 and real QMD discovery pass;
the registry still reports the latest Deno-free validator0.2.1.

The next specification replay correctly requires both mapped policy/wave
chapters. Update their former publication-only scope statements consistently
with DA-PUB-003; preserve their prior publication, source and release-floor
requirements. Final validation, mdBook and exact-main spec-first then pass.

Fresh raw reports and failed-attempt logs remain in the task cache under
`server-profile-channel-fresh` and `server-profile-channel-*`. They are excluded
from the public specification artifact. Hosted source checks, main deployment,
Server's separate manual transition and final live/replay remain required.
