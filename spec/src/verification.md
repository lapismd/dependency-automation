# Verification

| Requirement | Status      | Evidence                                                                                                                                                                 |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DA-OWN-001  | Implemented | Source boundaries in `src/`, generated PR rules and `tests/automerge.test.mjs`; no npm publisher entrypoint.                                                             |
| DA-POL-001  | Implemented | `loadAllowlist`/`loadPolicy` in `src/github.mjs`; `tests/github.test.mjs` and `tests/policy.test.mjs`.                                                                   |
| DA-POL-002  | Implemented | `monitoringRepositories`; `tests/maintenance-policy.test.mjs`; qualified Maintenance policy adapter recorded in PLAN.md.                                                 |
| DA-POL-003  | Implemented | Policy/consumer tests; real-snapshot full-phase exclusions and exact holds in2026-11-17-reviewed-cohorts-and-exclusions.md.                                              |
| DA-INV-001  | Implemented | Revision-bound `discoverRepository` and duplicate-owner guard; `tests/github.test.mjs`.                                                                                  |
| DA-INV-002  | Implemented | Registry-only availability closure and error semantics; `tests/policy.test.mjs` and `tests/github.test.mjs`.                                                             |
| DA-INV-003  | Implemented | Portability/onboarding/hold matrix in `scripts/inventory.mjs`; unpublished-private-consumer regression.                                                                  |
| DA-INV-004  | Implemented | `runtimeCycles` and cycle-aware generated rules; SCC and update-policy cases in `tests/policy.test.mjs`.                                                                 |
| DA-INV-005  | Implemented | `tests/github-public-files.test.mjs`; exact-main44027266295 and accepted normal generations99/100 qualify bounded public transport.                                      |
| DA-INV-006  | Implemented | `tests/github-public-files.test.mjs`; sanitized failures pass; normal hosted recovery44027276770/44028620105 succeeds without attributing the old403 cause.              |
| DA-REC-001  | Implemented | Restricted `repositoryConfig` plus central `renovate.config.cjs`; generated configuration validation.                                                                    |
| DA-REC-002  | Implemented | Compatible/breaking Renovate rules; `tests/automerge.test.mjs` and `tests/policy.test.mjs`; repository merge rules remain external gates.                                |
| DA-REC-003  | Implemented | Explicit environment/variable gates in `reconcile.yml`, `scripts/inventory.mjs` and `renovate.config.cjs`.                                                               |
| DA-REC-004  | Implemented | Per-target permissions, one allowed command and environment whitelist; native artifact reporting regression retains errors without status-write authority.               |
| DA-REL-001  | Implemented | Branch-context and exact frozen install in `scripts/prepare-pr.mjs`; generated post-upgrade contract.                                                                    |
| DA-REL-002  | Implemented | `releaseIntent`, catalog handling and onboarding guard; `tests/policy.test.mjs`.                                                                                         |
| DA-REL-003  | Implemented | `writeChangeset`; repeated compatible-update regression in `tests/policy.test.mjs`.                                                                                      |
| DA-INT-001  | Implemented | Author-based bot policy and retained aggregate lanes; `tests/policy.test.mjs`, `tests/consumer.test.mjs`.                                                                |
| DA-INT-002  | Implemented | Scoped App template in `templates/version-packages.yml`; workflow/version tests. Consumer rollout remains separately pending.                                            |
| DA-INT-003  | Implemented | Docker host context forwarding; standalone flat-worker regression in `tests/consumer.test.mjs`.                                                                          |
| DA-INT-004  | Implemented | Repeatable integration and retained Dependabot security coverage; `tests/consumer.test.mjs`.                                                                             |
| DA-NOT-001  | Implemented | Source/registry checks in `scripts/notify.mjs`; notification identity tests in `tests/policy.test.mjs`.                                                                  |
| DA-NOT-002  | Implemented | Receiver validation, reusable notifier and scheduled recovery; policy tests and workflow wiring.                                                                         |
| DA-MON-001  | Implemented | GET-only audit and partial-report retention tests; operational-drift tests cover sanitized observed Actions vars with exact workflow provenance.                         |
| DA-MON-002  | Implemented | Detector precedence and arbitrary-token negative cases in `tests/maintenance-policy.test.mjs`.                                                                           |
| DA-MON-003  | Implemented | Read-only main probe: original three hosted pilots qualified; AI/Server pending; `tests/workflows.test.mjs`.                                                             |
| DA-PR-001   | Implemented | Separate source-generation/publication jobs; `tests/workflows.test.mjs`; App-created hosted PR qualification.                                                            |
| DA-PR-002   | Implemented | `validateProfile` grammar/diff boundary and stale-source checks; `tests/profile-writer.test.mjs`.                                                                        |
| DA-PR-003   | Implemented | History-preserving update, duplicate, manual repair and retained-branch tests in `tests/profile-writer.test.mjs`.                                                        |
| DA-PR-004   | Implemented | Ordered legacy handover, no blind write retries and orphan guard; profile writer tests and hosted replay.                                                                |
| DA-WIRE-001 | Implemented | Explicit source/workflow map and parsed tests cover the contents-read audit context; deployed book qualification is tracked separately.                                  |
| DA-GOV-001  | Implemented | Canonical 35-requirement baseline, local validation and hosted check 43759765126 passed.                                                                                 |
| DA-GOV-002  | Implemented | Single-ID matrix and original missing-row rejection; complete local/hosted spec validation passed.                                                                       |
| DA-GOV-003  | Implemented | Mapped source negative probe, doctor 11/11, actual QMD search and main spec-first acceptance.                                                                            |
| DA-GOV-004  | Implemented | Ignore rules, book-only artifact regression and deployed output; public operational-report paths return 404.                                                             |
| DA-GOV-005  | In progress | Installed floors and API compatibility: `tests/renovate-runtime.test.mjs`; hosted checks pending.                                                                        |
| DA-DOC-001  | Implemented | Released Node validator, pinned mdBook, 42 tests and all three spec lanes; Pages book job 43759765158 passed.                                                            |
| DA-DOC-002  | Implemented | Main-only isolated deployment 7809666306 succeeded; all indexed chapters, navigation, CSS and JavaScript read back over HTTPS.                                           |
| DA-WAVE-001 | Implemented | `tests/runtime-minimum-repair.test.mjs`: retained minimum, native candidate and operation/replay gates; wave, catalog and compound regressions remain passing.           |
| DA-WAVE-002 | Implemented | Exact empty-attempt/CAS recovery; source-advance tree proof rejects changed inputs and preserves current qualification; hosted acceptance remains separate.              |
| DA-WAVE-003 | Implemented | 80-test source qualification, wave/evidence/CAS regressions and production admission wiring; hosted pilot pending.                                                       |
| DA-WAVE-004 | Implemented | 80-test source qualification, wave/evidence/CAS regressions and production admission wiring; hosted pilot pending.                                                       |
| DA-TOOL-001 | In progress | tests/tooling.test.mjs; Node-only generated fixture; hosted/consumer qualification pending.                                                                              |
| DA-TOOL-002 | In progress | Source/lock cohort observations and pairing regressions; production inventory integration.                                                                               |
| DA-TOOL-003 | In progress | guardToolingChange in prepare-pr; validator-pilot-cohort regressions admit only reviewed0.2.1 and retain runtime, integrity, major and cohort rejection.                 |
| DA-REC-005  | Implemented | Native-body preservation, escaped/bounded renderer and wave/CI qualification regressions in `tests/pr-messages.test.mjs`.                                                |
| DA-PR-005   | Implemented | Managed profile context, maintainer-text preservation, ambiguous-marker and GET-only duplicate regressions in profile/message tests.                                     |
| DA-TOOL-004 | In progress | Revision/lock/CI bindings and recipe separation in tests/tooling-evidence.test.mjs; production inventory.                                                                |
| DA-OPS-001  | In progress | Operational-drift regressions cover local composites, settings gaps and trusted activation context; hosted context read-back remains pending.                            |
| DA-OPS-002  | Implemented | Advisory tests, PR34 exact preflight and 2026-11-16 retirement record prove bindings, rejection and stale cleanup after official withdrawal; active approvals are empty. |
| DA-OPS-003  | In progress | Inventory pre-admission audit and repeated pre-App preflight; read-only/state-only behavior preserved; hosted acceptance pending.                                        |
| DA-NOT-003  | Implemented | Completion/workflow regressions reject stale/fork/unknown evidence; actual CLI metadata-only test permits one dispatch and forbids candidate files and npm reads.        |
| DA-WAVE-005 | Implemented | Callback settlement, pending-check timing and graph isolation tests; all four pilot callers and repeated Plugins dispatch are hosted-qualified (PLAN.md).                |
| DA-WAVE-006 | Implemented | Compound/mixed release-floor and lock regressions plus the bound generation82 replay in `spec/records/2026-11-17-scoped-publisher-retirement.md`.                        |
| DA-TOOL-005 | In progress | Source/job/attempt controls; reviewed cohort record binds Docs/Agent UI/Terminal/Mira jobs and16 same-source observations; hosted refresh pending.                       |
| DA-TOOL-006 | In progress | GET-only refresh16/16 preserves ranges/provenance; reviewed twelve-constraint repair and full-phase exclusion proof; hosted refresh pending.                             |
| DA-TOOL-007 | In progress | CI28: exact1→0,29 focused/301 full cases and frozen Core0.13.5 recipe proof; Notebook43 main CI/version guard pass at4484fe44.                                           |
| DA-PUB-001  | Implemented | Real crypto/mutation/source/recovery tests plus reject-only claim preflight; full-inventory proof is recorded in `spec/records/2026-11-17-publication-budget.md`.        |
| DA-PUB-002  | Implemented | Current-first collection, bounded shared 128 MiB/256-request budget and exhaustion/cache negatives; no App inventory credentials or source/channel relaxation.           |
| DA-REL-004  | In progress | Actual Notebook and Notes152 fixtures; workspace scope/target/lock/manual-edit negatives and native preparation filters; new workspace adoption remains pending.         |
| DA-REL-005  | In progress | Notes152 seven-owner fixture, target/integrity/lock and filesystem negatives, formatter/repeat preparation pass; consumer adoption pending.                              |
| DA-WAVE-007 | In progress | 59 admission regressions; actual Notebook1→0; fresh GET-only19/43/220 plan retains six waits; hosted regeneration pending.                                               |
| DA-PUB-003  | In progress | Scoped/transitive-peer negatives; hosted generation83 retires ten published waits/one obsolete wait; Notes146 publication/replay pending.                                |
| DA-PUB-004  | Implemented | Hosted generation82 (43989934897) verifies all ten selected packages plus History against current source-bound static contracts; size/ID/signature negatives pass.       |
| DA-WAVE-008 | Implemented | Eight focused/379 total tests; hosted generation89/90 holds unsupported targets before writers; source-preparation-admission record retains candidate closure evidence.  |

Detailed bootstrap commands, failure counts and hosted handoff live in
[the specification/Pages qualification record](https://github.com/lapismd/dependency-automation/blob/main/spec/records/2026-11-15-canonical-spec-and-pages.md).
