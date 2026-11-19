# Mira, Design Core, Tasks and Docs source activation

Standing operator approval covers post-merge per-repository activation after
passing source acceptance. Only these four entries move from full to pilot.
Mira’s existing `emptyChangeset: true` flag is preserved; Design Core, Tasks
and Docs introduce no forced empty-note flag. Desktop’s private-archive hold,
every Deno/community/Nostr exclusion, every other repository, global pilot
settings and the empty advisory approval list remain unchanged. Rollback
returns only these four entries to full; preserve pending operations, manual
repairs and signed evidence.

## Mira source and current main

Source [49](https://github.com/lapismd/mira-mde/pull/49) merged as
`211737c7a82864e5fb7ffef205416555c83a5912`, which is still the default-branch
head. Exact-main [Mira CI44330328605](https://github.com/lapismd/mira-mde/actions/runs/44330328605),
[Pages44330328647](https://github.com/lapismd/mira-mde/actions/runs/44330328647)
and [Release44330330365](https://github.com/lapismd/mira-mde/actions/runs/44330330365)
pass. Publish steps are correctly skipped; npm `@lapismd/mira` remains `0.2.0`.
[Completion44331790274](https://github.com/lapismd/mira-mde/actions/runs/44331790274)
passes and logs `verified-current-completion`. Fresh full audit is clean. No
open Mira PRs remain.

## Design Core source and current main

Source [93](https://github.com/lapismd/design-core/pull/93) and Version Packages
[95](https://github.com/lapismd/design-core/pull/95) land current main
`a031402fbff4b6e6c8acffba449379730b5c9df7`. Exact-main
[CI44369806338](https://github.com/lapismd/design-core/actions/runs/44369806338),
[Pages44369806719](https://github.com/lapismd/design-core/actions/runs/44369806719)
and [Release44369806771](https://github.com/lapismd/design-core/actions/runs/44369806771)
pass, including Dependency audits and Verify installed package and provenance.
npm shows `@lapismd/design-core@0.13.6`.
[Completion44386299601](https://github.com/lapismd/design-core/actions/runs/44386299601)
passes and logs `verified-current-completion`. Fresh full audit is clean. No
open Core PRs remain.

## Tasks source and current main

Source [31](https://github.com/lapismd/lapis-plugin-tasks/pull/31) merged as
`18f62a4d19dc72942d643dfec99bb3ac1fe1891f`. Exact-main
[CI and npm release44366326460](https://github.com/lapismd/lapis-plugin-tasks/actions/runs/44366326460),
[Pages44366325819](https://github.com/lapismd/lapis-plugin-tasks/actions/runs/44366325819)
and [registry publish44369019013](https://github.com/lapismd/lapis-plugin-tasks/actions/runs/44369019013)
pass after environment approval. Dependency audits succeed; npm latest remains
`0.2.1`. [Completion44369019508](https://github.com/lapismd/lapis-plugin-tasks/actions/runs/44369019508)
passes and logs `verified-current-completion`. The earlier Changesets/picomatch
HIGH hold is obsolete after upstream advisory withdrawal.

## Docs source and current main

Source [21](https://github.com/lapismd/lapis-plugin-docs/pull/21) merged as
`9706847dd2d3a25562898c2290ae5b681080398f`. Exact-main
[CI and npm release44330522283](https://github.com/lapismd/lapis-plugin-docs/actions/runs/44330522283)
and [Pages44330521280](https://github.com/lapismd/lapis-plugin-docs/actions/runs/44330521280)
pass after `npm-production` approval. npm latest remains `0.3.0`.
[Completion44366760952](https://github.com/lapismd/lapis-plugin-docs/actions/runs/44366760952)
passes and logs `verified-current-completion`. Fresh full audit is clean. The
earlier Changesets/picomatch HIGH hold is obsolete after upstream advisory
withdrawal.

## Activation and ordinary repeat

The shared coordinator remains in pilot phase. These independently qualified
sources reuse existing completion IDs and immutable implementation/policy pins.
No new publisher, workflow identity, package range, source recipe or advisory
approval is introduced. Desktop retains its private-archive holdReason; excluded
community/Nostr/Deno hosts stay observation-only.

Prospective GET-only inventory with configured bot identity qualifies all four
exact source heads. Mira and Design Core report status `unchanged` with
qualified acceptance and no holds or waits. Tasks and Docs report qualified
acceptance while honestly retaining one Core branch-ownership hold each, four
Notes/Plugins publication waits, and zero admitted updates; their writer
configurations correctly refuse those held states. Neither wait nor retained
branch is silently discarded.

The [bounded JSON receipt](2026-11-19-mira-core-tasks-docs-activation.json)
records source/policy identities and admission counts without copying
operational inventory. Both requested and effective writable admission remain
false during this local GET-only qualification. Active coordinator approvals
remain empty after the picomatch retirement. Actual policy deployment, live
candidate, release disposition and ordinary repeat remain subsequent
acceptance. Tasks55 and Docs56 remain open until their acceptance receipts are
complete.

## Pre-merge policy qualification

All726 coordinator tests and all three canonical specification lanes pass under
the contracted Node24.15.0 / gh2.102.0 tuple. Doctor has eleven passing checks,
semantic QMD search resolves the owning chapters, and formatter/repository
checks pass. Exact JSON comparison proves that only the four source phases
change; Mira’s emptyChangeset flag and every unrelated policy field remain
unchanged.

Fresh prospective inventory reports19 repositories,42 owners,213 edges, zero
coverage gaps and zero runtime cycles. Coordinator audit admission is
qualified with zero findings and an empty approval list.
