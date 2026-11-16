# Published source evidence and channels

Publication observations are independent of update eligibility. The latest-only
policy remains the default for candidate selection; observing a next-tagged
version alone does not admit it or change registry tags.

## DA-PUB-001 — Verified publication identity

**Requirement.** Published-source acceptance MUST bind package/version/integrity to authenticated provenance, the reviewed public publisher workflow and exact successful source qualification.

### Acceptance details

- Registry signatures and Sigstore provenance MUST verify with the reviewed runtime trust material, exact signer identity, issuer, certificate source/invocation and subject digest; gitHead alone MUST NOT qualify publication and the npm publish statement MUST supply consistency only.
- Exact public source/package contracts and publisher release-manifest/tarball hashes MUST agree; recovery MAY supply successful post-publication verification only for the same source and immutable bytes.
- Complete current source workflow/check/status coverage, exact run attempts and the publisher's qualification/publication/verification gates MUST remain required; unknown or mismatched evidence MUST remain held.
- Newer-release baselines, required dependency floors, compound-contract rules, current-main acceptance and operation CAS MUST remain unchanged.

## DA-PUB-002 — Bounded read-only normalization

**Requirement.** Publication evidence MUST be normalized independently of version eligibility through bounded read-only observation without executing candidate data.

### Acceptance details

- Current public owned versions MUST remain observable outside latest eligibility; channel-not-admitted and provenance-unknown MUST be explicit independent reasons.
- Exact Node runtime, owned setup action, standard GitHub CLI binary and static public trust-seed bytes MUST match the reviewed contract before verification; missing, changed or unsupported tools MUST fail closed without installing replacements or changing the approved package graph; bundled npm Sigstore JavaScript MUST NOT execute.
- Fetches, counts, bytes, timeouts, redirects and archive inflation MUST be bounded; source visibility MUST be verified before source/artifact reads, and artifact reads MUST reuse existing read-only workflow authority for explicitly public sources without App minting or added permissions; no candidate scripts, signing credentials or private API bodies may enter execution or public state.
- Versioned receipts MAY persist only normalized public coordinates/digests and assurance, never raw bundles/artifacts; legacy state remains readable and persisted facts never replace fresh channel/current-head checks and prior verified receipts MUST remain available after unknown fresh observations.

## DA-PUB-003 — Reviewed channel cohort

**Requirement.** Wave mode MAY admit only exact reviewed channel identities within explicit active consumer scopes; default and flat reconciliation MUST remain latest-only.

### Acceptance details

- Source policy MUST bind each package, version, integrity, public publisher and attested source; fresh channel, verified publication and exact source-contract evidence MUST agree.
- Direct admission MUST match repository, manifest path and dependency type; prerequisite closure MUST use only the reviewed cohort allowed at that manifest path, without widening unrelated consumers.
- Unknown policy, missing scope, deprecated or moved channel, incomplete proof and changed identity MUST fail closed; immediate target revalidation MUST refresh registry identities before consumer writes.
- Raw publication channel facts MUST remain unchanged; reports MUST retain remaining channel, source, release-floor, compatibility and ownership holds, with unchanged durable/report schemas and CAS.

## DA-PUB-004 — Static plugin publisher proof

**Requirement.** Plugins static publication MUST use its separate reviewed workflow, environment, job and artifact contract with authenticated npm provenance and exact published-byte agreement.

### Acceptance details

- Exact successful public nonfork main workflow/run/attempt and all current source qualification MUST agree with the authenticated certificate, registry signature, subject digest and source package contract.
- The bounded immutable candidate artifact MUST bind the selected package/version, source release plan, npm manifest, tarball digest/size and published registry bytes; ambiguous, expired, mismatched and different-byte skip outcomes MUST remain unknown.
- The reader MUST inspect only permitted public archive paths without candidate execution, signer access or publisher writes; Notes proof, artifact bounds and recovery rules MUST remain unchanged.
