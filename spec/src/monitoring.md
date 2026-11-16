# Monitoring and App readiness

Monitoring is read-only collection, distinct from dependency-update admission.
The current audit identifies direct known PR creators in default-branch
workflow YAML. It is not a complete call-graph or workflow-security analysis.

## DA-MON-001 — Auditable workflow reads

**Requirement.** Maintenance audit MUST inspect exact default-branch workflow revisions using read authority and retain explicit coverage outcomes.

### Acceptance details

- Reports MUST include schema version, collection time, repository source SHA and workflow paths.
- Read, parse or truncated-tree failures MUST produce an unavailable coverage entry and a failing exit status.
- Partial reports MUST still be written and retained by the hosted workflow.
- Unexpected errors, API bodies, tokens and environment values MUST NOT enter reports.

## DA-MON-002 — Bounded authentication findings

**Requirement.** Authentication findings MUST distinguish workflow-token writers, recognized App-token references and unverified references without claiming more coverage than the detector provides.

### Acceptance details

- Direct `gh pr create/edit`, Changesets and known PR-creation actions MUST be inspected.
- Environment token resolution MUST respect workflow, job and step precedence.
- An arbitrary token output MUST NOT prove App authentication.
- Findings MUST remain recommendations; inaccessible coverage MUST remain distinct from a clean audit.

## DA-MON-003 — Read-only readiness probe

**Requirement.** The manual main-only App probe MUST verify exactly one explicit pilot repository with read-only contents/PR authority.

### Acceptance details

- The pilot choice MUST remain constrained to `.github`, `lapis-plugins`, `lapis-notes`, `lapis-ai` and `lapis-server`.
- The token's installation scope MUST contain exactly that repository.
- Repository and PR reads MUST succeed without changing branches, PRs, reviews, settings or secrets.
- Successful reads MUST NOT be reported as proof of write readiness.

## Coverage limits

The audit does not inspect script internals or remote reusable workflow bodies.
DA-OPS-001 adds recursive local composite resolution, reviewed pin/Node source
comparisons, update ownership, exclusions and activation observations. Required
check settings are compared conservatively with static PR job candidates;
missing APIs, filters, matrices and dynamic names retain unknown coverage.
Matching names do not prove functional coverage or green current-head checks.
No persistent issue collector or unattended operator UI is implemented here. Maintenance's separate browser
adapter consumes monitoring defaults while retaining its own credential and
command boundaries.

Changesets creators may reference `with.github-token` as well as the legacy
`GITHUB_TOKEN` environment variable. The detector retains the legacy explicit
environment precedence and recognizes the source's pinned v2 input-only App
reference; unknown outputs remain unverified. It reports references, not actual
token values or proof that a particular action version can execute successfully.
