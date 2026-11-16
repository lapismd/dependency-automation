# Inventory and registry availability

`src/github.mjs` performs authenticated GitHub GETs and public registry reads.
`src/policy.mjs` selects active manifests, resolves catalog ranges, discovers
runtime cycles and computes eligible stable versions. `scripts/inventory.mjs`
writes ignored local reports and a gated reconciliation matrix.

## DA-INV-001 — Revision-bound discovery

**Requirement.** Inventory MUST discover active workspace manifests at an exact source revision and retain ownership, consumer and portability evidence.

### Acceptance details

- The default branch commit MUST be resolved before tree/file reads; explicit notification revisions MAY select a particular source commit.
- Truncated trees, missing root manifests and duplicate public package owners MUST fail discovery.
- Workspace includes/excludes and catalogs MUST determine active first-party dependency edges.
- Private application manifests MAY be consumers but MUST NOT become public package owners.

## DA-INV-002 — Registry authority

**Requirement.** Registry metadata MUST determine available stable versions; notification payloads MUST NOT authorize a version that the registry cannot qualify.

### Acceptance details

- Only HTTP 404 MAY mean unpublished; other registry failures MUST fail the scan.
- Candidates MUST be stable, non-deprecated and no newer than a valid stable `latest` tag.
- First-party runtime and required peer prerequisites MUST be available recursively until the candidate set converges.
- An optional first-party peer MAY be absent without excluding the candidate.

## DA-INV-003 — Portable target eligibility

**Requirement.** Inventory MUST withhold reconciliation targets whose source cannot support a portable registry update.

### Acceptance details

- First-party `link:` or `file:` dependencies and unpublished external prerequisites MUST hold the consumer.
- Required Changesets onboarding and explicit holds MUST be satisfied before inclusion in the matrix.
- The selected rollout phase MUST restrict the matrix, and each consumer MUST pin an exact pnpm version.
- Reports MUST retain blocked reasons rather than describe held consumers as healthy writable targets.

## DA-INV-004 — Runtime cycle discovery

**Requirement.** Inventory MUST identify runtime strongly connected components so already-compatible cyclic dependencies can avoid repeated release bumps.

### Acceptance details

- Runtime and optional-runtime edges MUST participate, including internal workspace edges.
- Components with multiple members or a self-edge MUST be reported deterministically.
- Cycle-aware rules MUST use lockfile updates for applicable compatible runtime ranges.

## Operational reports

Before planning writable waves, inventory audits the frozen coordinator graph
under DA-OPS-002/003. Denied qualification retains read-only observations but
plans with writes disabled and emits no writable target matrix. State-only
pilot reporting remains separately gated and available.

The report contains `schemaVersion`, exact repository source revisions,
manifests, package owners, consumer edges, cycles, eligible versions and
unpublished names. These operational reports remain under ignored `reports/`
and Actions artifacts; the public specification site does not embed them.

Wave mode additionally reads pnpm lock importers at the exact tree revision via
Git blobs (including large lockfiles), registry integrity/dependency contracts,
and complete current workflow/check/status evidence. Missing lock or observation
coverage remains explicit. Flat mode retains its existing discovery contract.

Qualification collects push and PR workflow contracts separately and observes
all current workflow runs/checks/statuses. Branch evidence retains PR/commit
authors, exact ancestry and candidate lock data; rerun actors are not owners.

Workflow expectations honor exact changed-path and default-branch trigger
filters; non-triggering image/deployment workflows are not invented missing
checks, while unknown path coverage remains fail-closed and every observed
current workflow still participates in qualification.

Tooling observations follow DA-TOOL-002. Production discovery includes root
lock evidence and records the exact source SHA with cohort findings. Those
observations neither add update targets nor turn missing evidence into success.
Reviewed Node CLI bytes remain distinct from whole-recipe capability. Root
Deno formatter declarations are reported as requiring source qualification,
not proof that a generic Node-only contract may replace an existing runtime.

Tooling discovery additionally hashes the exact root manifest and lockfile bytes
under DA-TOOL-004, so historical cohort CI context remains visibly distinct from
changed current source/artifacts and unqualified version recipes.
