# Terminal and Registry source activation

The operator gives standing activation approval after source merge and passing
acceptance. Only these two source phases change from full to pilot. All other
phases, global pilot settings, exclusions, private-source holds and exact
coordinator advisory bindings are unchanged. Return only affected entries to
full to roll back; preserve pending operations, manual repairs and signed data.

## Terminal source and main

Source27 merged50d1bb9fa41a4eed6636b7f7bf10c93a398d2534 after all required
macOS/spec checks passed on27eca50886ab25b5a93917b93e52089a7fa9c11d.
Exact-main CI44196015467, Pages44196015615 and version44196015683 pass.
Actual version intent=false skips the version App token and Changesets action.
Cargo44196721525 succeeds with plan only; publish/dispatch skip. Completion
callbacks44196114698/44196136323/44196722446 pass; read probe44192011775
passed for the existing App without retrieving or rotating its key.

The source-owned single-development profile covers only Core0.13 patches.
Real released Core0.13.4→0.13.5 full-catalog intake and18 functional
intake/callback cases pass. Actual source remains Core0.13.4/product0.1.2,
SDK0.2.1. A separate fixture runs the complete real Node24/pnpm10.32.1/
Rust version recipe with Deno absent, genuine historical intent and all15
expected generated outputs; no package is published from that fixture.

After all notes are consumed, a fresh genuine Core patch also passes the
independent guard, actual runtime/intent guard returnsfalse and the unchanged
release:version command reports changed:false/version0.1.2 with zero extra
writes. Thus no central emptyChangeset:true flag is needed; that field stays
unchanged. Ordinary future Core candidate/main acceptance remains separate.

## Registry source and main

Source184 merged69d8c06375f8fed507bc7443d265405ea255f021 after green Checks
on100c2ffb17b6ba93cfc775f3cf253503acfdb7ed. Current-main Checks44194081036,
Prepare44194080969, Publish registry44194080999 and qualified writer44194177572
pass. Verified callbacks44194389379/44194500900 pass; the latter reports
verified-current-completion. App read probe44192016274 passes.
The source caller credential and public client-ID metadata are available;
registry signing credentials were not changed.

Independent ordinary CI passes17 focused/164 full script/26 browser cases,
retaining the private root, supported API0.1 patch minimum0.1.2, signed
registry generation/verification and no npm/Changesets version authority.
No dependency, lock, catalog entry or signed bytes change in source adoption.
The normal coordinator still reports an upstream API qualification/publication
wait. It stays visible and binding; enabling the source does not fabricate a
new compatible version or waive a private/publication prerequisite.

## Activation and repeat

Policy deployment, fresh prospective GET-only inventory, ordinary durable
settlement and repeat receipts are recorded after their actual observation.
An explicit held/no-update registry result is distinct from Terminal’s genuine
compatible candidate and from proof of a new package publication.

## Pre-merge policy validation

All477 tests, three specification lanes, doctor11, actionlint and strict
Renovate configuration validation pass. The first local run used the system
GitHub CLI and failed4 verifier test modules before collecting their full
cases;58 exact verifier tests and all477 tests pass with the already qualified
pinned CLI. No verifier check was weakened. Existing local RE2 fallback warning
is unchanged.

Fresh GET-only prospective inventory under the proposed policy qualifies both
exact current source SHAs. Terminal admits only the real Core0.13.4→0.13.5
development patch with no holds/waits; Registry has no update and retains its
one upstream API publication wait. Both local write switches are false. Exact
configuration comparison proves only their phases changed and no empty-note
flag, other source entry or global setting changed. Live receipts remain pending.
