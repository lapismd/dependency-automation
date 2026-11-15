# Verification

| Requirement | Status      | Evidence                                                                                                                                  |
| ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| DA-OWN-001  | Implemented | Source boundaries in `src/`, generated PR rules and `tests/automerge.test.mjs`; no npm publisher entrypoint.                              |
| DA-POL-001  | Implemented | `loadAllowlist`/`loadPolicy` in `src/github.mjs`; `tests/github.test.mjs` and `tests/policy.test.mjs`.                                    |
| DA-POL-002  | Implemented | `monitoringRepositories`; `tests/maintenance-policy.test.mjs`; qualified Maintenance policy adapter recorded in PLAN.md.                  |
| DA-POL-003  | Implemented | Workspace filtering, excluded-package rules and hold matrix in `src/policy.mjs`, `src/renovate.mjs`, inventory; policy/consumer tests.    |
| DA-INV-001  | Implemented | Revision-bound `discoverRepository` and duplicate-owner guard; `tests/github.test.mjs`.                                                   |
| DA-INV-002  | Implemented | Registry-only availability closure and error semantics; `tests/policy.test.mjs` and `tests/github.test.mjs`.                              |
| DA-INV-003  | Implemented | Portability/onboarding/hold matrix in `scripts/inventory.mjs`; unpublished-private-consumer regression.                                   |
| DA-INV-004  | Implemented | `runtimeCycles` and cycle-aware generated rules; SCC and update-policy cases in `tests/policy.test.mjs`.                                  |
| DA-REC-001  | Implemented | Restricted `repositoryConfig` plus central `renovate.config.cjs`; generated configuration validation.                                     |
| DA-REC-002  | Implemented | Compatible/breaking Renovate rules; `tests/automerge.test.mjs` and `tests/policy.test.mjs`; repository merge rules remain external gates. |
| DA-REC-003  | Implemented | Explicit environment/variable gates in `reconcile.yml`, `scripts/inventory.mjs` and `renovate.config.cjs`.                                |
| DA-REC-004  | Implemented | Per-target token permissions, single allowed post-upgrade command and environment whitelist; source/config tests.                         |
| DA-REL-001  | Implemented | Branch-context and exact frozen install in `scripts/prepare-pr.mjs`; generated post-upgrade contract.                                     |
| DA-REL-002  | Implemented | `releaseIntent`, catalog handling and onboarding guard; `tests/policy.test.mjs`.                                                          |
| DA-REL-003  | Implemented | `writeChangeset`; repeated compatible-update regression in `tests/policy.test.mjs`.                                                       |
| DA-INT-001  | Implemented | Author-based bot policy and retained aggregate lanes; `tests/policy.test.mjs`, `tests/consumer.test.mjs`.                                 |
| DA-INT-002  | Implemented | Scoped App template in `templates/version-packages.yml`; workflow/version tests. Consumer rollout remains separately pending.             |
| DA-INT-003  | Implemented | Docker host context forwarding; standalone flat-worker regression in `tests/consumer.test.mjs`.                                           |
| DA-INT-004  | Implemented | Repeatable integration and retained Dependabot security coverage; `tests/consumer.test.mjs`.                                              |
| DA-NOT-001  | Implemented | Source/registry checks in `scripts/notify.mjs`; notification identity tests in `tests/policy.test.mjs`.                                   |
| DA-NOT-002  | Implemented | Receiver validation, reusable notifier and scheduled recovery; policy tests and workflow wiring.                                          |
| DA-MON-001  | Implemented | GET-only `scripts/audit-maintenance.mjs`; hosted partial-report retention contract in `tests/workflows.test.mjs`.                         |
| DA-MON-002  | Implemented | Detector precedence and arbitrary-token negative cases in `tests/maintenance-policy.test.mjs`.                                            |
| DA-MON-003  | Implemented | Main-only read probe; `tests/workflows.test.mjs`; all three hosted pilots qualified in PLAN.md.                                           |
| DA-PR-001   | Implemented | Separate source-generation/publication jobs; `tests/workflows.test.mjs`; App-created hosted PR qualification.                             |
| DA-PR-002   | Implemented | `validateProfile` grammar/diff boundary and stale-source checks; `tests/profile-writer.test.mjs`.                                         |
| DA-PR-003   | Implemented | History-preserving update, duplicate, manual repair and retained-branch tests in `tests/profile-writer.test.mjs`.                         |
| DA-PR-004   | Implemented | Ordered legacy handover, no blind write retries and orphan guard; profile writer tests and hosted replay.                                 |
| DA-WIRE-001 | In progress | Current source/workflow map and parsed workflow tests; Pages wiring awaits hosted deployment acceptance.                                  |
| DA-GOV-001  | In progress | Canonical chapter coverage and `pnpm spec:validate`; bootstrap qualification in the supporting record.                                    |
| DA-GOV-002  | In progress | Single-ID verification validator; missing rows fail the original bootstrap target.                                                        |
| DA-GOV-003  | In progress | Mapped spec-first rules, QMD configuration and negative path tests; host/CI qualification recorded separately.                            |
| DA-GOV-004  | In progress | Ignore rules and book-only Pages artifact boundary; Pages contract regression.                                                            |
| DA-DOC-001  | In progress | Deno-free validator and pinned mdBook CI; local book/hosted acceptance pending in the supporting record.                                  |
| DA-DOC-002  | In progress | Main-only isolated Pages workflow and artifact-permission test; deployment acceptance remains pending.                                    |

Detailed bootstrap commands, failure counts and hosted handoff live in
[the specification/Pages qualification record](https://github.com/lapismd/dependency-automation/blob/main/spec/records/2026-11-15-canonical-spec-and-pages.md).
