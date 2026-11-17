# Reviewed source cohorts and excluded-root holds

The live policy keeps full rollout and scheduling disabled while the controlled
pilot exercises genuine downstream updates. A read-only full-phase simulation
finds AI Controller and AI Host without permanent holds, each exposing a
Spec Validator development update. Current qualification happens to block their
matrix admission, but monitoring exclusions alone do not prevent future writes.

Both retained Deno roots now have explicit hold reasons in the existing update
entries. Their public package metadata remains available to prerequisite
discovery. The exact simulation rejects before the repair and passes afterward:
both nodes are held and neither enters the admitted writer list. Candidate
updates remain visible for explanation; they do not constitute write admission.
The existing Desktop hold and all other repository/package exclusions remain.

The prior tooling policy also reports twelve outdated exact constraints across
four source owners. Current immutable owner CI verifies their existing complete
validation lanes, including browser/accessibility and packaging where owned:

| Owner        | Source                                     | Successful source run | Reviewed exact constraints                             |
| ------------ | ------------------------------------------ | --------------------- | ------------------------------------------------------ |
| Docs         | `8aa7886eed72cf6c4df0dc18e1851afe0292702f` | `43947708172`         | Storybook/addon10.6.7, Vite6.4.6, Vitest/browser4.1.12 |
| Agent UI     | `1643b8dad19f6da57873899a6f60d8f8de9a1515` | `43852677751`         | Storybook/addon10.6.7, Vitest/browser4.1.12            |
| Terminal     | `f93e854a34a2abab22869e42806dac7670385978` | `43973344590`         | Storybook/addon10.6.7                                  |
| Visual Delta | `1d01be1b8d928841f6cc91e1ddfaabddb2997af9` | `43985171431`         | Spec Validator0.2.1                                    |

The owner declarations and actual lock resolutions are checked before producing
the reviewed policy candidate. Changes are limited to these twelve exact
constraints; Node, CLI registry integrity/executable bytes, pnpm versions and
all other supported constraints remain identical. Docs' ten, Agent UI's eight
and Terminal's one complete validation jobs become reviewed CI selectors with
exact source/run/attempt/job receipts; Visual Delta retains its four existing
selectors. Terminal's monolithic macOS ARM64 job runs spec/check/unit/build,
dark Storybook interaction/accessibility, packaging and cold WebView/PTY lanes.

All sixteen eligible records receive exact source, manifest/lock digests,
resolved tools and package-manager provenance from GET-only collection. All
sixteen have same-source successful CI observations. Mira's deliberately empty
selector previously made its source CI unavailable. Review of immutable source
`03f6500c5bb44d0032c7a3ae93db75b4c04b05b6` now explicitly selects
`.github/workflows/mira-spec-first.yml` and all three required jobs:
Specification and release intent, Packages and repository gates, and Storybook
build and browser acceptance. Actual run43949564683/attempt1 passes those jobs,
including complete package/audit/packed-host and interaction/accessibility/e2e
commands. No heuristic or green release/deployment run is substituted, and
empty selectors elsewhere retain their fail-closed meaning. Other historical
run-only observations remain distinct from reviewed required-job receipts.
Every generic cohort recipe field remains unqualified, independently
of the separately deployed source-bound whole-recipe guards. Raw GitHub
payloads and collector reports remain ignored local evidence.

No consumer source, dependency graph, runtime installer, registry tag, App
permission, advisory decision, schedule or live rollout phase changes. Normal
hosted source validation and inventory read-back remain required after merge.

## Local qualification

Final `pnpm verify` passes all371 tests and all three specification lanes on
Node24.15.0. Doctor passes11/11, semantic QMD discovery finds the owning
chapters and the latest released Deno-free validator remains0.2.1. Formatting
and actionlint pass. Native Renovate validation accepts nineteen default
configurations and both actually admitted generation83 consumer configurations.
The full dependency audit reports zero findings at every severity.

The fresh GET-only inventory observes19 repositories,43 owners and220 edges,
zero coverage gaps or cycles, and all eleven selected Plugins contracts verified
against current source. Publication collection stays within its existing bounds
at178 requests/84,177,028 bytes. Both excluded Deno roots retain their explicit
holds in the actual collected graph. The exact full-phase replay passes with
neither root in the admitted writer list. No live state or consumer is written
by these source qualification commands.
