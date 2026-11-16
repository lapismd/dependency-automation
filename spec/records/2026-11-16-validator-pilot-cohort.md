# Reviewed validator patch in pilot cohorts

## Observed production failure

Coordinator PR34 merged6ab64b8a and its exact main check43930711916 and Pages
43930712099 pass. Controlled pilot43931334684 completes inventory, state CAS
and Plugins reconciliation under writes=true, waves=true, phase=pilot,
schedule=false and state-writes=true. It reports19 repositories,43 owners,
220 edges, no coverage gaps,183 publication-reader requests and51095927 bytes.
Its actual advisory preflight accepts only the explicitly approved9d657a74 /
a3e1f05f source/lock tuple, with one raw LOW and no stale entries.

That workflow success is not a completed release chain. Native Renovate logs
artifactErrors after regenerating Plugins PR127 at4e96106e: the post-upgrade
hook rejects Candidate tooling cohort drift: @lapismd/spec-validator. Both base
0abf4958 and that PR head contain only .changeset/config.json; runtime dependency
updates have no release Changeset. We do not merge the PR or hand-edit a consumer
note to conceal this source-owned automation failure.

The installed policy admitted only0.2.0, even though the workspace requires the
reviewed released Deno-free0.2.1 before specification checks. Official npm
metadata confirms0.2.1, Node>=22 and integrity
`sha512-aHLByppZkay1axSm8KvCwOJz0si8aDyZBXDGWW+d2VQw+66f1KLimw2rEMjYIpLdoSG9+yN5Kd1MKlAJw7xUVw==`.
Its existing owning release evidence qualifies the doctor discovery repair;
this change does not claim any new consumer or whole-version-recipe proof.

## Narrow policy repair

Exactly the existing Plugins, Mira, Core, Notes and Notebook pilot cohorts now
admit0.2.0 or0.2.1. Historical source, manifest/lock hashes, installed versions
and CI records remain unchanged. No future patch/minor, new CLI or package
manager family, excluded/frozen host, advisory exception, activation variable,
phase, schedule, permission or dependency target is admitted. Existing drift
logic and the source-owned release-intent hook remain intact.

The exact command
`node --test --test-name-pattern='Plugins pilot' tests/validator-pilot-cohort.test.mjs`
reproduces one unwanted cohort-drift exception and passes1/1 after the policy
change. An initial malformed test-fixture literal was corrected before this
behavioral reproduction; it is not counted as the product failure.
All five pilot cases and the existing tooling suite pass16 tests, rejecting
unreviewed0.2.2/0.3.0 and new Deno formatter inputs. No assertions are loosened.

## Deployment gates

Full verification, actionlint, actual generated configuration validation and a
fresh GET-only inventory remain required before source commit. After accepted
main checks, regenerate through the normal coordinator so Plugins receives its
own deterministic runtime Changeset. Inspect actual branch source, dependency
scope, Changeset, current-head CI and release/publication evidence before merge.
Do not count this local repair or an artifact-error workflow exit as completion.

The prior Mira admission was uncertain after a completed empty run43861120207.
Manual recovery43933516100 was dispatched with the exact operation ID and
observed durable-state revision37d0abc4. The owning workflow must re-prove
unchanged public source and empty branches/PRs and use its existing CAS fence.
No state was hand-edited and no observation timeout was treated as a completed
run. Its actual outcome remains pending separately from this policy repair.

## Final local acceptance

All338 source tests and all three specification lanes pass; the focused cohort
and existing tooling suite passes16 tests. Actionlint and all20 actual generated
Renovate configurations pass. Fresh GET-only inventory again proves19 public
repositories,43 owners,220 edges, no coverage gaps and no cycles. The unchanged
coordinator advisory preflight still accepts only the approved source/lock tuple;
there is no dependency graph or advisory approval change in this policy slice.

Shared CI PR17 merged7981eda8 with both PR checks green, preparing exact Docs
output validation. Its read-only actual Tasks and Docs recipe proofs were
dispatched as43934760205 and43934766066. Shared main Linux validation is green;
its separate macOS job was still queued at observation. Starting read-only
qualification on the accepted shared main does not waive adoption/deployment
gates or claim the pending main check passed.

Mira's exact manual recovery43933516100 has now completed its inventory,
state CAS, Plugins reconciliation and Mira reconciliation successfully. This
is a genuine retry of the proven empty completed attempt, not a state rewrite.
Its native artifact-error outcome and candidate contents still require read-back;
the old cohort policy remains in that workflow source until this repair lands.
