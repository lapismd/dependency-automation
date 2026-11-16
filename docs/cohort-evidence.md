# Tooling cohort evidence and refresh

## Current evidence contract

All sixteen recorded cohorts now bind exact source, root manifest/lock SHA256
and resolved tool versions. Supported ranges and pnpm policy versions remain
unchanged. A wider source declaration is reported separately; it does not widen
the supported cohort. No source pipeline observation establishes whole-version
recipe portability.

The six older records have explicit reviewed workflow/job policies. Their
required-job receipts bind the source, run and attempt; skipped, missing,
duplicate, incomplete and mismatched jobs are rejected. Existing ten records
without these receipts remain labelled `historical-run-only`. Empty reviewed
workflow selection is explicitly unavailable rather than a filename fallback.

| Repository   | Exact inspected source                     | Source CI evidence and limit                                                                                                                                                                               |
| ------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plugins      | `0abf495865443859760929d55c6d7a97fb20d3b9` | [43795232129](https://github.com/lapismd/lapis-plugins/actions/runs/43795232129): prior source `46c08176`: required functional jobs and aggregate passed; specification was skipped under existing policy. |
| Notes        | `1e49d75421899183cb4f0fb14ae613a172872eeb` | [43795264453](https://github.com/lapismd/lapis-notes/actions/runs/43795264453): prior source `40e3e357`: reusable validation and deployment passed; quarantined interaction job remained skipped.          |
| Mira         | `d681bdd6b9f500a554f18e8ac3c4c9cdfa24eed5` | Eligible source CI unavailable. Release 43770750188 succeeded only at version-PR preparation; artifact validation was skipped and is not accepted.                                                         |
| Core         | `9cf94b7ce62d679aca77d6d5c65fe84405f086b9` | [43773566523](https://github.com/lapismd/design-core/actions/runs/43773566523): same-source required jobs and aggregate pass.                                                                              |
| Visual Delta | `abcb2e6d7698594d162a418419a737486a2fc019` | [43766653716](https://github.com/lapismd/storybook-addon-visual-delta/actions/runs/43766653716): same-source package, panel, browser matrix and manager jobs pass.                                         |
| Notebook     | `4405b5c61768d3537708c8fed7d0b11d7b8e7b91` | Current 43704372870 failed specification mappings. Accepted 43615472367 is explicitly prior source 1e2f0f84; no current-source qualification is inferred.                                                  |

These are immutable historical observations. Later source changes remain drift
in inventory; current-head functional gates still govern dependency admission.
Core/Mira's separate shared-action recipe proofs 43795242917/43795245438 and
Plugins' adopted source guard remain distinct evidence. The cohort recipe field
retains `unqualified`; this refresh does not create a new portability claim.

## Package-manager provenance

Five refreshed roots declare their existing pnpm versions. Visual Delta does
not declare `packageManager`; its existing policy version 10.32.1 comes from the
reviewed `release.yml` version-job step `Set up pnpm`:
`corepack enable` followed by `corepack prepare pnpm@10.32.1 --activate`.
The evidence binds that step and workflow SHA256
`72f9815b603ba1b059d9b50542163f790cc47a421bea7e914918116fcc34023f`.

The source manifest remains undeclared in inventory. The recorded workflow pin
is separate provenance, not an invented manifest field or live runtime proof.
Source drift remains visible; changed/ambiguous commands or a different version
cannot produce a fresh accepted pin. Notes retains its root Deno input and
shared frozen-host prerequisites. Excluded AI Controller, AI Host and Terminal
Host require no portability work under this slice.

## GET-only refresh

```sh
node scripts/inspect-tooling-cohorts.mjs --refresh
node scripts/inspect-tooling-cohorts.mjs --refresh lapismd/lapis-notes lapismd/storybook-addon-visual-delta
```

Without arguments the collector still proposes only missing eligible cohorts.
Refresh selects existing monitored, unheld sources; excluded/unknown explicit
requests reject before source reads. It writes only ignored review candidates
under `reports/`, never tracked policy, branches or settings. Public source reads
use immutable revisions and the existing read credential when supplied.

Each proposal preserves supported tool ranges and pnpm versions, records actual
declaration differences and exact hashes, and keeps recipes unqualified. CI
reads inspect at most 100 push-run summaries and ten reviewed-path attempts;
required jobs must match exact source/run/attempt and complete payload coverage.
API failures and partial job coverage remain unavailable. No workflow polling,
new writer credential, release or deployment is part of collection.

## Remaining source-policy handoff

Notebook repair [PR #37](https://github.com/lapismd/lapis-plugin-notebook/pull/37)
repairs the two current missing canonical mappings without changing its graph.
The next trusted Core dependency intake, PR #36, can recreate that main-only gap
unless owning preparation carries mapped factual evidence or a verified merge
handoff. A PR specification exemption does not qualify main. Root owns this
separate S1/S6 policy repair; the cohort refresh neither waives spec-first nor
manufactures qualification or release intent.

## Earlier ten-cohort expansion (historical)

This source slice adds ten previously unrecorded eligible public repositories to
`config/tooling.json`, taking recorded cohorts from six to sixteen. Every new
record binds the current source SHA, exact root manifest/lock SHA256 and resolved
tool versions. The existing six records remain historical constraints and do
not gain new CI or recipe claims from this slice.

The read-only collector is
`node scripts/inspect-tooling-cohorts.mjs`. It proposes missing cohorts under
`reports/tooling-cohort-candidates.json` without updating policy or repository
settings. Scope is the monitored dependency allowlist, excluding explicit holds
and nonportable/private/unavailable source. Community/Nostr and intentional
AI Controller/AI Host frozen roots are excluded; held Desktop remains unchanged.
No Deno-only package, package version or dependency edge is activated.

CI context is bounded to the latest observed successful default-branch **push**
pipeline among the first 100 runs, using standard check/CI/test/validate/verify
workflow filenames. It is historical evidence from that exact run, not a
complete workflow-coverage assertion. Failed, PR-only, other-branch, malformed
and documentation/deployment-only observations cannot qualify this context.
Unknown or older source remains visible. Run completion does not establish
whole-version-recipe portability, CI's actual Node runtime or current-head
functional qualification after the recorded source changes.

| Repository      | Source CI evidence                                                                    | Relation to inspected source                              | Manifest version command                                                 |
| --------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| Tasks           | [43776791410](https://github.com/lapismd/lapis-plugin-tasks/actions/runs/43776791410) | Same source                                               | `node scripts/release.mjs version`                                       |
| Docs            | [43773572649](https://github.com/lapismd/lapis-plugin-docs/actions/runs/43773572649)  | Same source                                               | `node scripts/release.mjs version`                                       |
| Server          | [43766382664](https://github.com/lapismd/lapis-server/actions/runs/43766382664)       | Prior source; current-source success not established here | Changesets version, lock-only install and Prettier                       |
| Agent UI        | [43776785797](https://github.com/lapismd/agent-ui/actions/runs/43776785797)           | Same source                                               | No `release:version` manifest command inspected                          |
| Lapis AI        | [43772596174](https://github.com/lapismd/lapis-ai/actions/runs/43772596174)           | Same source                                               | `node scripts/changeset-version.mjs`                                     |
| Lapis Terminal  | [43773578011](https://github.com/lapismd/lapis-terminal/actions/runs/43773578011)     | Same source                                               | `node scripts/changeset-version.mjs`                                     |
| Spec Validator  | [41314596478](https://github.com/lapismd/spec-validator/actions/runs/41314596478)     | Same source; older observation                            | No `release:version` manifest command inspected                          |
| Agent Redaction | [43525551529](https://github.com/lapismd/agent-redaction/actions/runs/43525551529)    | Same source                                               | No `release:version` manifest command inspected                          |
| Plugin Registry | [43779004943](https://github.com/lapismd/plugin-registry/actions/runs/43779004943)    | Same source                                               | No `release:version` manifest command inspected                          |
| jj-store        | [43773584601](https://github.com/stevejuma/jj-store/actions/runs/43773584601)         | Same source                                               | Changesets version, source metadata sync, lock-only install and Prettier |

Tasks and Docs' latest source pipelines completed after the parent's existing
npm-production approvals. The collector records the actual successful runs;
earlier held-run observations remain historical. This adds no deployment or
publication authority.

Inventory consumes these records through `assessTooling` and the existing
production candidate drift guard. New manifest/lock hashes expose when current
artifacts or source differ from recorded context. Missing artifacts stay
unavailable; a prior green pipeline never becomes a current recipe guarantee.
The browser/Vite/Storybook tuple remains repository-specific: for example,
Docs retains Vite6/Vitest4/Storybook10.5 while Server retains Vite6/Vitest5/
Storybook10.6, without upgrading either repository. An empty root tool set in
Spec Validator is recorded as observed absence rather than invented tools.

Every new recipe has `qualification:"unqualified"`, including entries whose
source CI succeeded. A null manifest command does not mean the source's workflow
has no version action/default command. The actual workflow and any custom helper,
configuration, formatter, hook or frozen task still need source-owned review and
a genuine pending-changeset mutation with Deno absent before portable adoption.

At the earlier expansion checkpoint no consumer guard implementation was copied. Lapis CI source
`78d6293116258a20f9942a9ffbc4ba644a3dc336` has shared image/tool actions but no
reusable version-runtime guard. The next bounded slice should add that shared
owner first, then qualify an existing Changesets2 Plugins recipe while preserving
its exact custom command/config and major. A successful generated fixture or
source pipeline cannot substitute for that acceptance. Notes and the intentional
AI frozen runtimes retain their existing prerequisites.

The original new evidence test failed once with a missing module. The repaired
focused tooling/discovery targets pass, including exact-byte hashes for a
large lock blob, source/lock drift, malformed bindings, prior/unknown source CI
and rejection of a claimed Deno-free recipe. One direct invocation used host
Node26 and correctly failed the existing Node24 contract; rerunning the exact
target on Node24 passed. The first full run passed123 tests and failed one new
specification-section placement check; the section was corrected and all three
spec lanes then passed. Final full qualification is recorded in PLAN.md.

This slice does not change dependency resolutions, advisory authority, rollout
activation, workflow approvals, frozen-host source, product tests or baselines.
Shared-helper delivery, actual consumer adoption and remaining historical
cohort refresh are still separate S6 work.
