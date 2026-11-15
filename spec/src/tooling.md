# Deno-free tooling and cohort drift

This first S6 slice qualifies version preparation and records tool cohorts. It
does not upgrade consumers, remove frozen-host prerequisites or activate writes.

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
