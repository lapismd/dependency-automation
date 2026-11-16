# Expanded tooling cohort evidence

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

No consumer guard implementation is copied in this slice. Lapis CI source
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
