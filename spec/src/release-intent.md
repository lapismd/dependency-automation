# Release intent

DA-WAVE-009 may select only a separately authorized Desktop root SDK development
patch before DA-REL-006 artifact generation. Its exact grant is checked during
configuration and again before generation and artifact copyback. Missing, changed
or revoked scope authority grants no candidate writes. Full private-archive
source/candidate functional and audit gates remain separate and mandatory.

`scripts/prepare-pr.mjs` runs only from Renovate's branch-scoped context. It
proves the candidate can install without rewriting the lockfile or running
package hooks, compares affected active manifests and delegates deterministic
Changeset writing to `src/changesets.mjs`.

Schema2 candidate eligibility uses the existing exact reviewed channel view
for each selected manifest edge before preparation. All targets in the batch
still require source policy/facts, patch compatibility and exact integrity;
missing scope, moved tags or invalid publication proof retain the whole hold.
The ordinary available pool and schema1 independent-development profile remain
unchanged. This does not grant schema2 an independent wait bypass.

## DA-REL-001 — Candidate install before release intent

**Requirement.** The post-upgrade helper MUST prove the exact candidate frozen install before writing dependency release intent.

### Acceptance details

- Missing or invalid Renovate branch context MUST fail.
- The install MUST use `--frozen-lockfile`, `--ignore-scripts` and `--ignore-pnpmfile`.
- Workspace catalog changes MUST inspect every active affected consumer, including peer contracts.
- DA-REL-006 MAY prepare SDK artifacts only after its frozen projection verification; it MUST NOT create runtime release intent or substitute tooling evidence for full private-archive candidate qualification.

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

A repeated schema1 preparation MAY inspect one changed maintenance Changeset only at the exact branch-derived path. It MUST be a regular valid UTF-8 file of at most 8192 bytes with blank or empty-map release metadata; null, arrays, nonempty/malformed headers, preambles, wrong paths/scopes, multiple notes or missing/unsafe files MUST fail before any canonical write.

Canonical preparation MUST NOT generate, overwrite or claim ownership of that note. Existing authored body and product intent remain intact; nonempty schema2 runtime intent retains its separate release-target validation.

**Requirement.** Opted-in dependency preparation MUST carry accurate source-owned canonical facts into the same candidate without exempting main specification checks.

### Acceptance details

- The immutable admitted source MUST authorize a bounded declarative policy, exact canonical paths and unambiguous managed slots; missing or changed policy and manual content MUST remain held.
- The initial profile MUST permit only one compatible development package, its matching existing override and mechanical registry lock closure while retaining public contracts and existing release intent, with exact selected-version boundaries preserving unrelated prefix-sharing identities.
- Preparation MUST preserve authored content and the immutable workspace newline ending while emitting deterministic current facts without executing candidate code or asserting unrun qualification.
- Exact chapter and governed workspace output paths MUST survive native Renovate artifact collection and final commit selection, while stale sources, unexpected changes and unsupported lock deltas MUST fail before writes.

## DA-REL-005 — Workspace canonical preparation

The schema2 workspace profile records actual declared/resolved ranges, locked
versions and integrity fingerprints in each source-owned slot. Its compact
table is current dependency evidence, not a release or functional acceptance
claim. Source-owned paths and policy bytes remain immutable throughout native
generation; the existing schema1 development/override profile retains its
stricter mechanical lock comparison and independent-admission boundary.
Managed workspace slots retain ordinary Markdown formatter output byte for byte,
so formatting never makes a valid source opt-in stale on the next update.
The immutable slot may use exactly the generated one-line digest paragraph or
one newline immediately before its 64-character lowercase digest. Preparation
MUST preserve that source-selected form in each candidate and repeat; arbitrary
whitespace, paragraph, table, hash or marker changes remain held.

Existing source-owned authored chapters may already exceed the renderer’s
ordinary400-line or32KiB bounds. Schema2 may preserve those exact immutable
chapters only when neither line nor byte count increases; ordinary chapters
retain both fixed bounds. This adds no configurable higher budget and changes
no schema1 behavior, source mapping, authored text or managed-slot authority.
A later larger fact rendering remains held for owning-source review.

**Requirement.** Source-owned workspace preparation MUST emit current dependency facts only for explicitly admitted compatible registry updates across its declared importer and chapter scope.

### Acceptance details

- Immutable policy bytes and complete active importer coverage MUST bind chapter slots, declared ranges, registry versions and expected integrity before writes.
- Other manifest fields, direct importer identities, workspace settings, first-party metadata and first-party edges MUST retain their independently governed source contracts.
- Explicit third-party registry closure regeneration MAY follow the scripts-disabled frozen install while retaining tooling, audit and functional gates.
- Manual or stale facts, external resolution, same-version integrity drift and unexpected candidate paths MUST fail without writing any chapter.

## Independent development admission

Native generation MUST admit both the development manifest edge and its exact
same-name workspace override; an admitted manifest alone is not a complete candidate.

DA-WAVE-007 reuses the same development fact validation for independent admission.
Its single forward patch must retain public peers and exact source-owned override
closure. Retaining source policy bytes in the internal public inventory binds
its parsed policy to the original digest; older or changed evidence cannot
activate the capability. Actual candidate preparation still verifies the exact
source, unchanged policy/slots and complete mechanical lock closure before PR writes.

DA-WAVE-008 applies that source capability to normal admission too. A completed
upstream publication chain cannot admit an update set outside the consumer's
declared preparation profile. Unsupported sets remain explicit holds before a
writer token or Renovate execution, instead of creating recurring artifact-error
PRs. Repositories without an opt-in keep their existing behavior; expanding a
source policy or qualifying a product/API migration remains source-owned work.

## DA-REL-006 — Inactive seeded SDK artifact capability

**Requirement.** A private Desktop SDK artifact projection MUST require both an immutable source descriptor and a separate exact trusted coordinator capability, with no live entry enabled by this capability change.

### Acceptance details

- The bounded root-development-only profile MUST freeze all nonselected manifest/workspace/portable-lock fields and exact private source-inventory/CI-docs bytes; only selected SDK identity, importer, existing override and registry integrity may normalize, without masking generic peer hashes or another SDK context.
- Native pinned Node24/pnpm generation MUST seed the actual existing SDK/jiti/TypeScript closure, disable scripts/hooks and credentials, verify the projection frozen and surgically copy only independently proved native SDK blocks; no-op output MUST preserve original full bytes, and unrelated/shared/metadata/closure changes MUST fail before copyback.
- Only the explicitly selected regex manager MAY defer artifacts to the existing trusted preparation hook; its actual extraction, artifact/post-task collection and final commit behavior MUST be qualified against real pinned Renovate, while ordinary npm profiles and all canonical/candidate/native checks remain required.
- Source data MUST NOT clear a private/rollout/CI/publication/audit hold or grant activation; a projection is not full Desktop installation or a production-clean claim, and source-owned eight-archive/audit/product gates plus a separate later eligibility decision remain mandatory.
