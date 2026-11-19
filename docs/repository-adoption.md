# Adopt the shared dependency workflow

[Tracker50](https://github.com/lapismd/dependency-automation/issues/50) owns the
remaining adoption work. Notebook is the single end-to-end pilot; every other
eligible repository has a separate assignable issue. Source preparation can
proceed independently. Activation waits for shared pilot acceptance and that
repository's own evidence, rather than completion of every other task.

## Next wave: small plugins first

Docs and Tasks are the closest structural matches to Notebook: one public root
package, an existing Node24/Changesets3 recipe, green historical main and no
open PRs at the November17 review. Their current source is preserved and their
actual CI/Pages identities are registered before installing callbacks.

Docs and Tasks previously reported HIGH GHSA-fc5q-39xc-vjpf through
`.>@changesets/cli>@changesets/config>picomatch`. Upstream withdrew that
advisory; fresh full and production audits are clean. Neither gate is relaxed
or bypassed for adoption. Source merges for tasks55/56 are complete; coordinator
activation still requires reviewed phase change, ordinary settlement and
no-duplicate replay after current-main evidence.

Spec Validator and Visual Delta are merged, enabled and have passing ordinary
no-update settlement/replay. Terminal requires native/macOS
qualification. Larger Core/Mira/Plugins/application and jj-store adoptions stay
later. Agent Redaction requires Deno validation and is outside this Node-only
pass. Monitoring-only repositories do not become npm writers just to inflate
adoption counts.

## Shared contract

The coordinator owns discovery, publication evidence, wave admission, native
Renovate preparation and durable deduplication. Consumers own their public
contracts, canonical facts, independent checks, version recipes, publication
and deployment. Reuse the reviewed shared workflows; do not copy an engine into
each consumer or introduce a consumer workaround for an upstream defect.

The global phase stays `pilot`. Only individually reviewed repository entries
move from `full` to `pilot`. Existing source holds remain independent gates.
Scheduling can therefore recover eligible work without enabling every target.
Community, Nostr and Deno-only packages/repositories remain excluded. Retained
frozen host boundaries are not portability work authorized by adoption.

## Repeatable delivery steps

1. Read the target's tracked AGENTS and canonical specification. Inspect current
   main failures, issues and PRs; reuse prepared adoption work and identify any
   product defect at its owning source. Preserve unrelated work and repair
   ownership. Refresh the live graph rather than assuming this document's
   repository list is a permanent dependency order.
2. Confirm the existing App installation's selected repositories, permissions,
   encrypted secret visibility and current required checks using metadata.
   Do not retrieve GitHub secrets, copy keys or rotate credentials. Qualify
   authentication separately from functional source acceptance.
3. Audit existing integrations before adding files. Reuse immutable reviewed
   coordinator/CI pins and the repository's actual Node, package manager,
   Changesets and formatter contract. Execute the complete real version recipe
   in an isolated frozen registry install with Deno absent from the adopted
   path. Preserve private packages, unrelated lock edges and exact source
   bindings. Record local proof separately from hosted execution/publication.
4. Qualify the appropriate source-owned canonical policy and its independent
   offline functional guard, outside bot specification exemptions. The shared
   preparer may update only reviewed factual slots. Retain all supported
   semver/channel/publication-floor rules. Unsupported migrations remain held.
   The [canonical intake guide](canonical-intake.md) describes the bounded
   profile; workspace consumers must qualify their own schema and owner map.
5. Verify publication hints and completion callbacks against exact workflow
   IDs, paths, names and events. Follow [completion adoption](completion-adoption.md).
   Review any missing source registration in `config/completions.json` and
   publication/tooling policy before installing its callback. The verifier loads
   policy from the same immutable coordinator pin as its implementation: use
   the reviewed registration commit for both reusable workflow and
   `automation-ref`, rather than copying a pin whose policy lacks this source.
   Privileged callbacks execute reviewed shared code only, with no candidate
   checkout/artifact/cache execution. Check verification before App minting,
   final revalidation, actual dispatch and receiver settlement.
6. Complete the owning repository's required checks, independent canonical
   guard, explicit main-range specification checks and all affected browser,
   accessibility, audit, package and build lanes. Reuse signed dependency-image
   producer/resolution where applicable; do not restore image digest PR churn.
   Keep genuine product defects and unavailable infrastructure evidence visible.
7. After pilot acceptance and source review, activate only this repository by
   changing its entry to `pilot` in a coordinator PR. Preserve every other
   entry, exclusion and hold. Keep global phase `pilot` and the single shared
   schedule. No global full-phase cutover is required.
   A target's own hold needs recorded source acceptance before explicit removal;
   changing its phase alone cannot qualify a private projection or migration.
8. Use ordinary reconciliation with a genuine available update. Review the
   actual bot-owned candidate and complete current-head checks before merge.
   Verify main acceptance and the actual version/publication disposition,
   signatures/provenance/registry/deployment where applicable, completion and
   durable replay without duplicate PRs/releases. If no update exists, record
   honest no-op/controlled qualification and every unexercised release branch;
   do not manufacture a release to complete a checklist.
9. Attach immutable source/head/run/artifact references and final activation
   observations to the repository issue. Update tracker50. Close the task only
   when its own acceptance and rollback evidence is complete; blocked product
   work should have a precise owning issue rather than an undocumented waiver.

## Version-input qualification

Shared CI's reviewed development-input contract is available at immutable
commit `d678a21e8bbe2160f20c72d6ec78afe25fde02fe` in
[its source guide](https://github.com/lapismd/lapis-ci/blob/d678a21e8bbe2160f20c72d6ec78afe25fde02fe/docs/development-workspace-input-qualification.md).
Notebook pins the deployed action implementation at
`dd71275c5b2618afceae0b97ee0a071649781971` and completion implementation at
`c1c5ddf184af4166ee11ea3329e7ca85f8333828`. These are reviewed source pins,
not permission to copy Notebook's hashes or override policy to another source.
Each source must qualify its own actual inputs and recipe.

The guard runs in ordinary premerge quality CI and before the main version
writer. A development-only update correctly produces no new release intent,
version PR or publication. That result is distinct from genuine publisher
acceptance; retain existing published-package evidence separately.

## Independently assignable tasks

| Repository      | Task                                                             | Specific starting point                                                            |
| --------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Mira            | [51](https://github.com/lapismd/dependency-automation/issues/51) | Reuse existing version/completion adoption; refresh current source evidence.       |
| Design Core     | [52](https://github.com/lapismd/dependency-automation/issues/52) | Core0.13.5 is already published; do not republish it for adoption.                 |
| Notes           | [53](https://github.com/lapismd/dependency-automation/issues/53) | Reuse PR155; its Cloudflare fetch failure also reproduces on unchanged main.       |
| Plugins         | [54](https://github.com/lapismd/dependency-automation/issues/54) | Preserve signed image reuse, multi-package intent and registry coalescing.         |
| Tasks           | [55](https://github.com/lapismd/dependency-automation/issues/55) | Qualify the active package's canonical and release surfaces.                       |
| Docs            | [56](https://github.com/lapismd/dependency-automation/issues/56) | Qualify the active package's canonical and release surfaces.                       |
| Desktop         | [57](https://github.com/lapismd/dependency-automation/issues/57) | Keep private Profile/API archive-projection hold until source qualification.       |
| Server          | [58](https://github.com/lapismd/dependency-automation/issues/58) | Reuse the private native recipe; retain actual CLI/container release contracts.    |
| Agent UI        | [59](https://github.com/lapismd/dependency-automation/issues/59) | Qualify both discovered public owners and their consumers.                         |
| Lapis AI        | [60](https://github.com/lapismd/dependency-automation/issues/60) | Preserve the actual private Node/Rust release contract.                            |
| Terminal        | [61](https://github.com/lapismd/dependency-automation/issues/61) | Reuse native guard; inspect current macOS capacity/main qualification.             |
| Spec Validator  | [62](https://github.com/lapismd/dependency-automation/issues/62) | Keep the latest Deno-free CLI and validate public consumer acceptance.             |
| Visual Delta    | [63](https://github.com/lapismd/dependency-automation/issues/63) | Reuse recipe proof; retain browser/audit gates and current advisory facts.         |
| Agent Redaction | [64](https://github.com/lapismd/dependency-automation/issues/64) | Qualify the active public owner's actual source and release wiring.                |
| Plugin Registry | [65](https://github.com/lapismd/dependency-automation/issues/65) | Adapt to signed registry artifacts/deployment rather than an invented npm release. |
| jj-store        | [66](https://github.com/lapismd/dependency-automation/issues/66) | Inspect/reuse source PR90 before duplicating its acceptance work.                  |

Repository-level references may be cyclic because different packages and tools
live in the same repository. The active package graph and verified publication
floors determine update ordering; the table is an assignment list. Infrastructure
that is monitored but is not an npm update target does not automatically gain
writer admission through this tracker.

## Rollback and uncertain writes

Return only the affected repository to `full` or a reviewed source hold. Preserve
manual repairs, pending operations and signed artifacts. An uncertain writer
requires authoritative exact source/branch/PR/run read-back and the existing
controlled recovery procedure. Never hand-edit durable state or blindly retry
an ambiguous write. Disabling a source callback rolls back that event route;
manual reconciliation and the shared scheduled recovery gate remain available.

## Batched source preparation and final merge pass

Docs21 and Tasks31 are merged; their earlier HIGH Changesets/picomatch audit
holds cleared after upstream advisory withdrawal. Track remaining coordinator
activation in tasks55/56 rather than inheriting any retired coordinator
approval. Prepare other sources independently, then merge each qualified
source under existing branch rules.
The operator's standing activation approval applies after merge and passing
acceptance, followed by a reviewed one-entry phase change, ordinary settlement
and no-duplicate replay. It grants neither a new advisory exception nor global
full rollout. Source registration alone remains read-only.

Spec Validator currently has no Lapis dependency edges and a verified tag/OIDC
publisher, with no Changesets writer. Its adoption retains that shape. Visual
Delta's only Lapis edge is the Node-only development specification validator;
its native/manual tag, audit, panel/manager/browser and baseline rules remain.

## Parallel assignments

The remaining Node-eligible sources are split into independent foundations/plugin,
native/server and application/registry batches. Reuse existing green source
integration before changing code. Central registration and activation remain in
one owning coordinator checkout; each source retains its own guards and full
acceptance. Agent Redaction64 is excluded because of its public Deno adapter and
required Deno validation, leaving thirteen eligible adoption tasks.
