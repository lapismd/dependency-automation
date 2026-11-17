# Spec Validator source activation

The operator explicitly authorizes per-repository activation after passing
source merge/acceptance. Spec Validator7 merged
f3bab11837648045540bf7ef948503131dcab041. Its exact-main
[Check44174151693](https://github.com/lapismd/spec-validator/actions/runs/44174151693)
passes, including the new functional no-Lapis-input contract. The existing-App
read-only probe44173967888 passes without copying or retrieving keys. Shared
registration74 merged5c4261194737ef0a4d1dd43942b9392be3572f81; the observer
pins reviewed implementation/policy92e3e55d174498916c134f950850e1d572656cab.

Only `lapismd/spec-validator` changes from full to pilot. Global phase remains
pilot; Notebook stays enabled, and every other entry, hold, Deno/Community/Nostr
exclusion and audit approval is unchanged. The public root/private workspace
consume no Lapis dependency; no synthetic Core pin or release intent is added.
Any future dependency-input addition fails its normal contract test until an
independent intake is qualified. The existing verified tag/OIDC publisher and
notification remain unchanged; a new publication branch is not exercised here.

The source adoption records13 pre-existing development-only tool findings and
zero production findings. No dependency changes, additional exception or new
audit waiver is introduced; its existing required Check has no audit lane.
Retain that separate maintenance follow-up in task62.

The actual source completion44174310233 passed, reporting
`verified-current-completion` and dispatching the exactf3bab118 source hint.
Ordinary post-activation settlement/replay receipts remain to be attached. This source change does not itself prove a
new update, PR, package release, publisher execution or global full rollout.
Rollback changes only this entry back to full, preserving durable operations.

Fresh GET-only inventory observes19 repositories/212 edges, no coverage failures
and current Spec Validatorf3bab118 qualified with zero updates, holds or waits
under the proposed policy. Both local write switches are false. The exact
policy comparison confirms that only this phase changes. All466 tests, three
spec lanes, formatter/pin checks and actionlint pass.
