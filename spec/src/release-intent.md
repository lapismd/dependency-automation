# Release intent

`scripts/prepare-pr.mjs` runs only from Renovate's branch-scoped context. It
proves the candidate can install without rewriting the lockfile or running
package hooks, compares affected active manifests and delegates deterministic
Changeset writing to `src/changesets.mjs`.

## DA-REL-001 — Candidate install before release intent

**Requirement.** The post-upgrade helper MUST prove the exact candidate frozen install before writing dependency release intent.

### Acceptance details

- Missing or invalid Renovate branch context MUST fail.
- The install MUST use `--frozen-lockfile`, `--ignore-scripts` and `--ignore-pnpmfile`.
- Workspace catalog changes MUST inspect every active affected consumer, including peer contracts.

## DA-REL-002 — Appropriate release targets

**Requirement.** Runtime, optional-runtime and peer first-party manifest changes MUST create release intent only for permitted versioned packages.

### Acceptance details

- Development-only changes MUST NOT trigger package release intent.
- Private packages MUST remain excluded unless the owning Changesets config explicitly versions them.
- Required empty Changesets MAY preserve a repository's release-intent convention without publishing a private application.
- Missing Changesets configuration or base branch MUST fail before release-intent writes.

## DA-REL-003 — Deterministic Changesets

**Requirement.** Repeated updates on the same automation branch MUST update one deterministic Changeset while preserving valid existing intent.

### Acceptance details

- The Changeset path MUST derive from branch scope; package names MUST be unique and sorted.
- Existing valid bump types and authored body MUST be retained; newly affected packages MAY add patch intent.
- Invalid existing frontmatter or bump types MUST fail rather than overwrite uncertain intent.

## Publication boundary

Changesets prepare versions. They do not authorize npm publication, signed
archives, GitHub release assets or registry submission.

DA-TOOL-003 adds a manifest/lock comparison after the existing scripts-disabled
frozen install and before Changeset writes. New unqualified CLI adoption or
incompatible cohort changes fail; unchanged legacy tooling is reported without
forcing a consumer migration. Advisory policy and publication remain source-owned.

## DA-REL-004 — Source-owned canonical intake

**Requirement.** Opted-in dependency preparation MUST carry accurate source-owned canonical facts into the same candidate without exempting main specification checks.

### Acceptance details

- The immutable admitted source MUST authorize a bounded declarative policy, exact canonical paths and unambiguous managed slots; missing or changed policy and manual content MUST remain held.
- The initial profile MUST permit only one compatible development package, its matching existing override and mechanical registry lock closure while retaining public contracts and existing release intent, with exact selected-version boundaries preserving unrelated prefix-sharing identities.
- Preparation MUST preserve authored content and emit deterministic current facts without executing candidate code or asserting unrun qualification.
- Exact output paths MUST survive native Renovate filtering, and stale sources, unexpected changes and unsupported lock deltas MUST fail before writes.

## Independent development admission

DA-WAVE-007 reuses the same development fact validation for independent admission.
Its single forward patch must retain public peers and exact source-owned override
closure. Retaining source policy bytes in the internal public inventory binds
its parsed policy to the original digest; older or changed evidence cannot
activate the capability. Actual candidate preparation still verifies the exact
source, unchanged policy/slots and complete mechanical lock closure before PR writes.
