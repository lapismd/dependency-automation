# Deno-free tooling and cohort drift

Central tooling controls qualify versioning contracts and record supported
source-bound cohorts. Consumer recipe adoption remains separate; evidence
refresh does not upgrade consumers, remove frozen-host prerequisites or activate writes.

## DA-TOOL-001 — Reviewed versioning runtime

**Requirement.** Newly generated version preparation MUST execute only a reviewed Node-based Changesets contract before acquiring App write authority.

### Acceptance details

- Exact CLI version, npm integrity, Node engine metadata, executable hash and qualified Changesets configuration must identify the reviewed contract.
- Both existing Changesets majors must remain supported without implicit major migration.
- The generated runner must reject changed executables, unreviewed configuration and Deno formatter inputs before App minting; it must not install Deno or force another formatter.
- A fresh generated consumer must prove version and changelog mutation with Deno absent; publication remains outside the recipe.

## DA-TOOL-002 — Revision-bound compatibility cohorts

**Requirement.** Inventory MUST report explicit repository-specific Node, pnpm and browser-test tool cohorts using the inspected source revision and lockfile.

### Acceptance details

- Missing lock evidence and unconfigured repositories must remain coverage gaps, never qualification.
- Playwright/test and Vitest/browser pairs must remain compatible; recorded Vite and Storybook families may differ between repositories.
- Observed cohort constraints must not be described as complete consumer qualification or used to manufacture dependency edges.
- Cohort policy must not contain advisory exceptions or waive functional, visual, accessibility or audit gates.

## DA-TOOL-003 — Candidate drift guard

**Requirement.** Production candidate preparation MUST reject newly introduced unqualified versioning runtimes and incompatible tool-cohort changes before writing release intent.

### Acceptance details

- The guard must compare the candidate with its exact previous manifest and lock evidence after the frozen install with scripts disabled.
- Unchanged legacy tooling may remain visible without forcing a migration; changed CLI bytes, unreviewed versions and implicit major switches must fail closed.
- Existing excluded hosts, source-owned advisory bindings, expiries and security update ownership must remain unchanged.
- Rollout and write authority must remain governed by existing operator gates.

## DA-TOOL-004 — Cohort evidence and recipe separation

**Requirement.** Expanded cohort records MUST retain exact manifest/lock and successful source-CI context separately from whole-recipe runtime qualification.

### Acceptance details

- Records MUST bind exact source, manifest/lock SHA256, resolved tool versions and the latest observed successful default-branch source-pipeline run, with prior-source or unavailable evidence explicit.
- A successful source-CI run MUST NOT qualify a version recipe as Deno-free, and an absent manifest command MUST NOT imply an absent workflow recipe.
- Inventory MUST report source/lock drift and missing evidence without turning historical source success into current qualification.
- Collection MUST remain GET-only within eligible public allowlist entries, preserving holds, excluded hosts, frozen tasks and all existing consumer gates.

## DA-TOOL-005 — Reviewed source workflow outcomes

**Requirement.** Reviewed source-CI evidence MUST select only reviewed repository-specific workflow paths and successful required jobs bound to the same source, run and attempt. Missing, skipped, duplicate, incomplete or unavailable job evidence MUST NOT qualify a run. An explicitly empty workflow policy MUST remain unavailable without filename fallback.

### Acceptance details

- Successful release or deployment metadata alone MUST NOT replace required validation outcomes.
- Historical records without job receipts MUST remain explicitly run-only observations.
- Prior-source success and current-source failures MUST remain distinguishable; source CI MUST NOT establish whole-recipe portability.

## DA-TOOL-006 — Exact package-manager provenance and refresh

**Requirement.** Existing-cohort refresh MUST preserve supported tool ranges and package-manager versions. An undeclared root package manager MUST remain undeclared; a reviewed workflow pin MAY be recorded separately using exact source bytes and step coordinates. Collection MUST propose evidence only within existing eligible public scope and MUST NOT change policy, source, activation or advisory authority.

### Acceptance details

- Changed or ambiguous workflow commands, unsupported resolved versions and changed package-manager versions MUST fail closed.
- Refresh MUST report declared-range differences separately without silently widening supported cohorts.
- Excluded or held sources, frozen tasks and missing whole-recipe qualification MUST retain their boundaries.

## DA-TOOL-007 — Reviewed development input coordinates

**Requirement.** A source-reviewed version recipe MAY bind one pinned first-party development override as compatible patch data. Every other workspace byte, installed versioning executable, configuration, command and runtime constraint MUST remain bound before writer admission. Existing consumers without this opt-in MUST retain exact file binding.

### Acceptance details

- The opt-in MUST name one development-only package, a stable major/minor series, a minimum patch and the workspace fingerprint with only that exact override value normalized.
- The manifest development pin, installed package identity and unique direct workspace override MUST agree.
- Runtime dependencies, patches below the reviewed minimum, prereleases, ambiguous/missing selectors and other workspace changes MUST fail closed; forward-only update admission remains independently required.
- Source-owned whole-recipe proof, frozen installation, candidate functional/audit gates and no-intent handling MUST remain separate requirements.

## Registry evidence and rollout limits

The planning assumption that Changesets 3 requires Deno is corrected by the
integrity-verified npm 3.0.3 tarball: its executable uses Node and its engine
requires "^22.11 || ^24 || >=26". Both 2.31.1 and 3.0.3 ship no Deno references.
The redundant upstream version-only template setup can therefore be removed.
Notes' separately owned frozen-host tooling remains untouched.

Changesets 3 can invoke Deno through its transitive formatter. Format 0.1.3
detects deno.json/deno.jsonc ahead of Prettier in the same directory. A Node
executable does not prove arbitrary project recipes Deno-free. The generic
contract conservatively holds Deno declarations in its formatter lookup
ancestry and changed Changesets configuration for source-owned qualification.

## Reviewed validator patch in the existing pilot

DA-TOOL-003 admits the separately reviewed Deno-free spec-validator0.2.1 patch
alongside0.2.0 in the existing Plugins, Mira, Core, Notes and Notebook pilot
cohorts. This exact two-version set does not admit future patches or minors,
force any consumer migration or change Node/pnpm/CLI/browser constraints.
Historical evidence remains attached to its original source, lock and resolved
versions. It is not rewritten to claim new candidate or recipe qualification.

The post-upgrade hook still requires the frozen scripts-disabled candidate
install and all original drift checks before release-intent preparation.
Missing required intent or an artifact error MUST NOT establish a completed
release chain, regardless of a successful coordinator workflow exit. Native
Renovate artifact-error review and current-head consumer gates remain binding.
No excluded hosts, phase, scope, advisory approval or permissions change.

## Reviewed owner-cohort policy repair — November 17

GET-only refresh continues preserving supported constraints and reporting
declaration differences for review. The reviewed policy now records the
source-qualified Docs, Agent UI and Terminal Storybook10.6.7 cohorts, paired
Vitest4.1.12 where changed, Docs Vite6.4.6 and Visual Delta Spec Validator0.2.1.
These twelve exact constraint changes retain Node, pnpm, Changesets majors,
runtime bytes, source recipes and all other owner constraints. Docs, Agent UI
and Terminal also gain exact required-job receipts from their existing complete
source workflows; no filename fallback replaces reviewed selectors.

Mira's previously empty selector is explicitly replaced with its reviewed
`mira-spec-first.yml` workflow and all three governance, package and browser
jobs. This policy decision accepts actual required-job receipts; an empty
selector elsewhere continues to mean unavailable, without fallback.

All sixteen observations bind their inspected public source, manifest, lock
and resolved tools. All sixteen have same-source successful CI observations;
reviewed job receipts and historical run-only observations stay distinct.
Recipe qualification
continues to be reported separately from source/cohort evidence and the ten
deployed whole-recipe guards. Existing Deno-root exclusions remain explicit
dependency-write holds under DA-POL-003, including during full-phase simulation.
