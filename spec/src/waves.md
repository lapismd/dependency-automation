# Dependency and release waves

Wave admission is implemented behind `LAPIS_DEPENDENCY_WAVES=true`, default off.
Hosted pilot qualification and activation remain separate operator decisions.

The reviewed Profile0.2.4 publication-only binding retires only its own genuinely
newer, fully verified and currently qualified release. It does not admit Profile
consumer updates or bypass dependency floors, channel drift or replay/CAS gates.

## DA-WAVE-001 — Derived admission

**Requirement.** Wave admission MUST derive update and public release chains from exact manifest, lockfile and registry evidence before selecting consumer targets.

### Acceptance details

- Runtime, optional-runtime and peer changes use the existing release-intent contract; dev-only updates do not create publication waits.
- Every required publisher must qualify and publish a newer registry version carrying the intended dependency contract before its downstream wave proceeds.
- Explicit holds, excluded packages, unknown locks, unavailable prerequisites and cyclic release chains remain visible and fail closed.
- Package/path admission MUST move catalog references jointly while retaining the existing compatible rolling PR and breaking-family drafts.

## DA-WAVE-002 — Durable reconciliation

**Requirement.** Versioned wave state MUST reconcile registry observations, source revisions and operation identities independently of notification delivery order.

### Acceptance details

- Registry-verified version/integrity identities coalesce duplicate hints; complete scheduled scans recover missed events without treating payloads as authority.
- Persistent operations retain exact targets, source/policy revisions, publication baselines and blocked/failed/uncertain outcomes for future operator UI use.
- State lives only on the dedicated coordinator state branch, with optimistic concurrency and read-back after uncertain writes; conflicting state is never overwritten or blindly retried.
- Exact manual recovery MAY re-admit only a completed originating run with unchanged public source and proven empty branch/PR state; reports remain ignored artifacts; no live state enters main or public book output.

## DA-WAVE-003 — Qualification and repair ownership

**Requirement.** Reconciliation MUST preserve manually repaired branches and require complete current revision qualification before advancing release chains.

### Acceptance details

- Repair/orphan holds MUST apply to their exact rolling or publisher compatibility family while ambiguous history remains held.
- Genuine PR creators and every branch commit author MUST establish ownership independently of rerun actors.
- Auto-merge MUST require complete current workflow/check/status qualification for the exact existing candidate on current source.
- Per-consumer failures MUST retain independent progress without weakening product, audit, publication or compatibility gates.

## DA-WAVE-004 — Gated workflow integration

**Requirement.** The production reconcile matrix and generated allowed versions MUST enforce wave admission only under explicit rollout and state-write gates.

### Acceptance details

- Default-off wave mode preserves the existing flat reconciliation rollback path and pending state.
- Trusted-main state publication uses a separate contents-write job scoped to the coordinator; consumer credentials remain per repository and cross-account installations remain separate.
- Writable wave reconciliation requires successful durable admission before consumer writes, then fresh per-target source/ownership validation immediately before execution.
- Hourly/manual/publication reconciliation provides recovery without activating settings, publishing packages or modifying protections.

## Public operational storage

Public storage contains only explicitly public repository coordinates. Unavailable
or non-public source coverage is held and represented by opaque IDs/counts;
public repository artifacts and the state branch are not private storage.

DA-PUB-004 supplies a separate bounded static-plugin batch profile for genuine
multi-package publication evidence. The selected package still requires its
authenticated provenance, exact artifact digest, signed bundle and published-byte
agreement before downstream admission. Archive-size holds remain explicit;
the profile does not waive current-source checks, publication prerequisites,
channel restrictions, ownership or operation CAS.
The full-inventory collector uses the shared 128 MiB/256-request resource gate
and observes all current owned versions before other tag/baseline probes.
Reject-only claim preflight and the static verifier's 16 MiB npm cap do not
qualify a publisher or alter release floors; incomplete or oversized publication
evidence remains held even when its download fits the total budget.
The atomic state commit also includes public-safe `report.json`, consumed by
Maintenance through GitHub Contents at the branch's immutable revision.

## DA-WAVE-005 — Completion timing and source isolation

**Requirement.** Completion-triggered reconciliation MUST settle the exact notifying callback before observing qualification and MUST retain default-branch graph authority.

### Acceptance details

- The receiver MUST validate the public source and callback workflow/run/attempt identity, then wait read-only for successful run and exact check-suite completion with a bounded explicit failure rather than silently accepting pending or unknown evidence.
- The callback's own current check MUST remain part of existing qualification; no product, audit, deployment or compatibility lane may be exempted to avoid a notification race.
- PR-head hints MUST NOT replace the default-branch inventory, select unmerged dependency targets or assert qualification; duplicate and stale arrivals MUST remain ordinary authoritative scans.
- Manual scans and gated scheduled recovery MUST remain available for missed events or failed callback settlement without changing rollout settings.

## DA-WAVE-006 — Compound support ranges

**Requirement.** Admitted compound runtime ranges MUST preserve their supported release lines while qualifying their exact lockfile update.

### Acceptance details

- Targets already inside a compound support range MUST retain that range and use native `update-lockfile` rules for the admitted path and dependency type.
- Targets outside compound support MUST remain held for source-owned compatibility review rather than silently narrowing the public contract.
- The exact existing candidate MUST resolve the admitted target under the preserved range and pass its own current CI before auto-merge.
- Earlier compound publication waits MAY be superseded only after qualified current main locks satisfy every target under identical registry-verified published support; a genuinely newer mixed release MAY retain that same compound-lock evidence only when all remaining ordinary/peer publication floors also pass, without claiming a new publication for compound-only retirement.

## Publication evidence boundary

DA-PUB-001/002 separate authenticated publication facts from latest-only update
eligibility, with only the explicit DA-PUB-003 cohort exception. Waiting releases expose channel-not-admitted/provenance-unknown
without relaxing newer-version, compound-support, current-main or CAS rules.
Legacy publication records remain readable; fresh receipt/channel evidence
owns any new release advancement.

Reviewed channel projections retain default stable availability and apply only to
exact active consumer scopes. Release retirement still requires the same
newer-version/floor or identical compound-contract proof, current qualification,
operation identities and CAS; an approved channel is never a release or CI waiver.

## DA-WAVE-007 — Independent canonical development intake

**Requirement.** A source-opted-in compatible development patch MAY advance independently of unrelated publication waits only within its exact canonical preparation contract; every other hold and wait MUST remain binding.

### Acceptance details

- Admission MUST verify immutable source policy bytes/digest and exact existing development, override and lock facts for one policy-named forward patch with no release intent.
- Missing or changed evidence, additional targets, catalogs, runtime coupling and peers needing changes MUST remain held under ordinary registry/channel eligibility.
- A wait for the selected dependency MUST still block it while unrelated waits MUST remain visible and block their own updates.
- Complete current source qualification, rollout scope, ownership, cycles, optimistic concurrency and frozen candidate/canonical-lock validation MUST remain required without widening public contracts or clearing publication evidence.

## DA-WAVE-008 — Source preparation before writer admission

**Requirement.** Opted-in source preparation MUST constrain normal wave admission even after publication waits clear. Unsupported update sets or missing source-policy evidence MUST remain held before consumer writer admission.

### Acceptance details

- The existing bounded profile MUST require its complete source-bound single-development patch facts, not merely a matching package name or a successful upstream release.
- Mixed families, unsupported development/runtime/peer updates and unavailable or inconsistent policy/override/lock evidence MUST stay visible without generating incompatible PRs.
- Supported source-owned patches and ordinary repositories without an opt-in MUST retain their existing admission paths and every qualification, ownership, registry, rollout and publication gate.
- Candidate preparation MUST still validate the complete frozen install and mechanical lock/canonical closure; pre-admission evidence MUST NOT assert unrun candidate qualification or authorize a product migration.
