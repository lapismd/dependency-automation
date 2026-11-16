# Public specification delivery

The source-qualified validator update uses released Node-only0.2.1 and its
normal frozen registry lockfile. DA-DOC-001/002 retain the same verification,
book-only artifact and Pages permission boundary. The changed dependency graph
does not inherit the prior exact-lock advisory exception; writable automation
remains held until that new binding has its own operator decision.

The public book is documentation. It does not publish operational reports or
replace the repository's source/deployment authorization boundaries.

## DA-DOC-001 — Deterministic book source

**Requirement.** The specification book MUST build from indexed committed canonical Markdown with a pinned Node/pnpm/mdBook toolchain and the released Deno-free validator.

### Acceptance details

- Local and hosted validation MUST run the same `pnpm verify` entrypoint.
- Frozen dependency installation MUST precede hosted verification.
- QMD indexes and semantic model downloads MUST NOT be required by CI/book build.
- Generated output MUST remain ignored rather than committed.

## DA-DOC-002 — Restricted Pages deployment

**Requirement.** Pages deployment MUST publish only a successfully verified main-branch specification book through a separate minimal-authority deploy job.

### Acceptance details

- Pull requests MUST build/validate without Pages writes; manual publication MUST require main.
- The upload path MUST be exactly `spec/book`, never the checkout, reports or arbitrary artifacts.
- The build job MUST have read authority only; the deploy job MAY have only Pages and OIDC deployment writes.
- Deployment MUST wait for successful verification/build and use the `github-pages` environment with serialized publication.

## Build and deployment wiring

The book is hosted under the repository's GitHub Pages project path. `pages.yml`
builds the exact main revision, runs all checks, uploads its book-only artifact
and deploys it. It does not read source secrets, mint a dependency App token,
perform inventory/audit collection or enable dependency writes.

Book verification and reconciliation install the same frozen coordinator graph.
DA-GOV-005 qualifies patched upstream glob/minimatch resolutions against the
retained Renovate runner; Node, pnpm and mdBook pins remain independently fixed.
An unchanged LOW deepmerge finding is not a clean full audit or a transferred
exception from a consumer release.

Source and book checks also prepare the pinned standard GitHub CLI for offline
public provenance regressions. It receives no credentials; only immutable test
inputs and static public trust material enter those subprocesses.
