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
