# Terminal and Registry activation acceptance

Terminal and Registry remain enabled as individual `pilot` entries under global
`pilot`. No other phase, hold, advisory decision or exclusion changes here.
The [bounded source receipt](2026-11-18-terminal-registry-live-replay.json)
contains only these two public source observations and the Terminal transition;
operational inventory reports are not copied into the public book.

## Terminal: genuine update through current-main settlement

Source adoption [27](https://github.com/lapismd/lapis-terminal/pull/27) merged
`50d1bb9fa41a4eed6636b7f7bf10c93a398d2534`. Activation
[81](https://github.com/lapismd/dependency-automation/pull/81) deployed as
`d188a5e42217538f7cfc692d9ef361efe22e4c03`; its Check and Pages passed.
Ordinary [reconcile 44203065501](https://github.com/lapismd/dependency-automation/actions/runs/44203065501)
admitted the real Core 0.13.4 to 0.13.5 development update, created
[Terminal28](https://github.com/lapismd/lapis-terminal/pull/28), and produced
inventory artifact `14382177907`.

Current-head CI passed at `74b8858fe153ab3126d2d93a1441f03e0f4f01f0` before
ordinary merge `151dc0f525651cbf852c4b02c649b3fff37a5cad`. The exact declared,
overridden and locked Core versions change from 0.13.4 to 0.13.5. Main
[CI 44205866427](https://github.com/lapismd/lapis-terminal/actions/runs/44205866427),
[Pages 44205866434](https://github.com/lapismd/lapis-terminal/actions/runs/44205866434)
and [version 44205866479](https://github.com/lapismd/lapis-terminal/actions/runs/44205866479)
pass. The actual version job reports false genuine intent and skips both the
App mint and Changesets writer. Cargo run `44207447504` likewise skips publish
and dispatch. No public version or release is invented for this development update.
Completion run `44207448253` reports `verified-current-completion`.

The original operation becomes `accepted-on-main` in immutable generation192,
[commit 8e7bfee7](https://github.com/lapismd/dependency-automation/blob/8e7bfee7f6ea9f5055a3c4a43ddaf27529c12c5b/waves.json),
observed at 00:23:13 UTC and committed at 00:24:02, after the merge at 00:12:09.
Generation191 still says admitted. Historical operation metadata retains its
original source/run/admission observation; that timestamp is not the acceptance
transition time. Exact GitHub source files and persisted history confirm this
ordering, so no implementation change is needed.

## Registry: qualified no-update replay with its real prerequisite

Source [184](https://github.com/lapismd/plugin-registry/pull/184) merged
`69d8c06375f8fed507bc7443d265405ea255f021`. All exact-main Checks, preparation,
registry publication, version-disposition and completion jobs passed, including
`verified-current-completion` in run `44194500900`. Its private/API 0.1/no-npm-
version contract and signing authority remain source-owned.

Both the activation inventory and the ordinary repeat observe a qualified
Registry, zero updates and zero source holds, while retaining the existing
`@lapis-notes/api` upstream qualification/publication wait. No genuine compatible
update is available to exercise a new signed dependency release; that branch
remains unexercised. This correct no-op does not waive the prerequisite or
manufacture an npm publisher, signature or registry release.

## Ordinary repeated reconciliation

[Run 44208057432](https://github.com/lapismd/dependency-automation/actions/runs/44208057432)
passes inventory and durable wave-state writing; its reconcile writer job is
skipped because no update is admitted. Artifact `14385505814`, observed at
00:34:32 UTC under policy `2e0d1616e595c0b87083e29409837d0f7e2a2f85`, records
Terminal main151 as qualified/unchanged with zero updates, holds and waits, and
Registry main69 as qualified/upstream-wait. Both repositories have no open PRs
at final read-back. No duplicate PR, version, release or writer is generated.

Tasks61 and65 can close for adoption acceptance; their upstream product and
security work is not erased. Parent50 and every other repository remain tracked
independently. Existing unrelated holds and the coordinator's exact November19
HIGH expiry remain unchanged.
