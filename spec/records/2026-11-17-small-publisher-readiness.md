# Small publisher adoption preparation

Spec Validator main70c92752 and Visual Delta main1d01be1b had no open PRs at
inspection. Visual Delta's open issue19 requests Storybook11 support; that
major migration remains outside compatible dependency adoption. Existing source
publishers already notify the coordinator only after provenance verification.
This slice adds exact current completion/probe metadata, no writer activation.

Spec Validator consumes no first-party Lapis npm dependency in its public root
or private workspace tool. It retains its Node-only check and tag/OIDC publisher
without inventing a Changesets recipe or a dependency bump. Visual Delta has
one first-party development edge, spec-validator0.2.1; its current fresh full
audit has one HIGH Changesets/picomatch advisory and production audit is clean.
No existing coordinator or historical LOW exception is transferred.

The operator requests source preparation across repositories, a final merge
pass, then activation after each source's passing merge/acceptance. All holds,
source-publication policy, baseline approval and existing branch checks remain.

Shared validation passes466 tests, all three specification lanes, formatter/pin
checks, actionlint, doctor and GET-only inventory with writes/state writes=false.
Strict existing native Renovate configuration validates; local RE2 reports its
existing unavailable-native-module fallback, with no regex/config-engine change
in this metadata-only slice. Initial appended prose produced two atomic-detail
spec diagnostics; moving it before the owning requirement resolves both.
The completion positive fixture still derives its known-source set from the
actual source allowlist; all unknown/stale/self-trigger negatives remain.
