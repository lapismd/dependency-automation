# Specification governance

S6 operational drift and advisory admission are mapped to DA-OPS-001 through
DA-OPS-003. Normal source checks validate both policy schemas, retained runtime
exclusions and upstream version-template pins; live audit success is a separate
write preflight, never inferred from syntax/spec qualification.

The authority order is workspace/repository guidance, canonical requirements,
source/public contracts and tests, then operational README and rollout records.
QMD search is discovery; the returned canonical file remains authoritative.

The repository description, About website and README specification badge link
to the [published book](https://lapismd.github.io/dependency-automation/)
governed by DA-DOC-002. Canonical source remains under `spec/src`.

## DA-GOV-001 — Canonical functionality

**Requirement.** Protected coordinator behavior MUST have concise canonical requirements and mapped source ownership before or with implementation changes.

### Acceptance details

- `SUMMARY.md` MUST index every canonical chapter.
- Requirements MUST have unique `DA-<AREA>-NNN` identifiers, one normative statement and two to four acceptance bullets.
- Planned rollout work MUST remain distinct from implemented and verified behavior.
- Supporting records and generated books MUST NOT replace canonical authority.

## DA-GOV-002 — Verification evidence

**Requirement.** Every requirement MUST have exactly one verification row with an allowed status and concrete evidence.

### Acceptance details

- Missing, duplicate or orphan requirement rows MUST fail validation.
- Status MUST be `Implemented`, `In progress` or `Planned`.
- Local, hosted and consumer qualification MUST be reported separately.

## DA-GOV-003 — Spec-first and discovery

**Requirement.** Protected changes MUST update every mapped canonical owner, and unresolved change discovery or unmapped protected paths MUST fail closed.

### Acceptance details

- Local checks MUST use Jujutsu when available and Git otherwise; CI MUST inspect its complete source range.
- Tests and generated artifacts MUST NOT stand in for owning chapter changes.
- Maintainers MUST run `pnpm spec:search` before broad canonical scans; conceptual queries MAY use `--semantic`.
- `spec-validator doctor` and QMD checks MUST verify host wiring without entering CI's network-independent canonical checks.

## DA-GOV-004 — Generated and private state

**Requirement.** Generated book output, QMD databases, operational reports, caches and credentials MUST remain outside tracked canonical source and public site input.

### Acceptance details

- Ignore rules MUST cover `spec/book/`, `.qmd/index.sqlite*`, `reports/`, `.renovate/` and local state.
- Only committed specification source MAY determine the public book.
- Secrets, tokens, private API bodies and live report snapshots MUST NOT be copied into the book or its artifact.

## DA-GOV-005 — Patched worker dependency resolutions

**Requirement.** The coordinator MUST use patched glob and minimatch resolutions while preserving the reviewed Renovate worker's file-selection and cleanup contracts.

### Acceptance details

- Installed direct and transitive resolutions MUST use glob at least 14.0.2 and minimatch at least 11.0.1 for GHSA-3g3m-2fjr-6pw4 and GHSA-g3hv-75wg-m249 respectively.
- Compatibility tests MUST exercise the actual Renovate matcher and the resolved glob/rimraf selection and bounded-cleanup behavior.
- Other audit findings MUST remain visible without inheriting waivers from another repository or release.

## Source change map

`spec-validator.config.mjs` is executable authority for path classification.

| Protected area                                             | Canonical owner                                                                              |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Discovery, registry closure, inventory                     | Inventory                                                                                    |
| Repository/monitoring scope                                | Repository policy                                                                            |
| Generated Renovate configuration / runner                  | Reconciliation                                                                               |
| Post-upgrade release intent                                | Release intent                                                                               |
| Consumer workflows, wrappers and templates                 | Consumer integration                                                                         |
| Audit and authentication detector                          | Monitoring                                                                                   |
| Profile validator and writer                               | Organization profile refresh                                                                 |
| Notification entrypoint                                    | Release notifications                                                                        |
| Hosted workflows                                           | Owning function plus workflow wiring; check/Pages additionally govern specification delivery |
| Spec config, book/QMD wiring, guidance, repository checker | Governance                                                                                   |
| Package manifest / lockfile                                | Governance and specification delivery                                                        |

The repository uses the released Deno-free `@lapismd/spec-validator` range.
`pnpm verify` retains formatter, syntax/workflow-pin checks and the complete
functional test suite, then runs canonical validation, book build and spec-first.
Rollout status-only edits in `PLAN.md` do not require unrelated canonical edits.

Wave planning/evidence/state and their CLI entrypoints map to `waves.md`.
The coordinator state branch is operational storage, never canonical book input.

The wave pilot/recovery runbook is operational guidance linked from README;
canonical wave requirements and workflow gates remain authoritative.

Tooling policy, runtime checks and qualification map to tooling.md.
Expanded cohort evidence and its GET-only inspection entrypoint share that
owner; ordinary validation rejects unsupported evidence and runtime claims.
The ordinary repository checker validates the central contract as well as the
version template, so a Deno-only or unreviewed template cannot silently enter
normal verification. Registry qualification remains separate from offline tests.

The bounded PR-message renderer maps to reconciliation and profile requirements;
operational previews and real source snapshots remain untracked.

Completion policy, verifier and reusable workflow are mapped to notifications
and waves, with source-inventory isolation and explicit workflow wiring.

Tooling CI, provenance and refresh modules map to DA-TOOL-005/006 in the tooling
chapter; selectors and source evidence grant no write or portability authority.

Publication verifier/transport/source observation and its policy map to
publications.md. The reviewed Node runtime, owned setup-gh standard CLI pin and bundled
public trust data do not change package manifests, lockfiles or advisory
approval bindings. Public immutable crypto fixtures are test inputs, never
operational snapshots or production fallback evidence.

Shared canonical-intake preparation and its immutable-source filesystem adapter
map to release intent and consumer integration. Declarative source opt-ins add
only exact reviewed canonical output paths; no executable consumer code or
blanket main specification exemption is introduced.

The independent canonical development admission module maps to dependency waves
and release intent. Its source-policy byte binding remains an internal inventory
contract; Maintenance report and durable state schemas remain unchanged.

The channel policy/projection and static publisher reader map to publications
and waves. Only source-reviewed cohort coordinates/scopes are committed; live
proofs and operational artifacts remain ignored and outside public book uploads.
