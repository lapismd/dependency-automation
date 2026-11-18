# Agent UI same-run verification recovery

Agent UI's normal tag-push publisher released `@lapismd/agent-ui@0.2.9` and
`@lapismd/repository-ui@0.2.7` from
`cea9cdb3611b314cef1d9f94c084c6d53225fde3`, run44253603892 attempt1.
Original prepare and both publish jobs succeeded; verification134630526126
failed with npm ETARGET. Registry-index propagation was observed separately;
successful recovery alone is not proof of the original failure's cause.
Only the failed verification job was requested for rerun by the operator.
Attempt2 verification134633222071 and consumer notification134633404816 succeed.

The coordinator now supports only an immediately following same-run verification
recovery. It requires failed post-publication verification and retains successful
origin prepare and both publish jobs as independent authority. Both latest-run
and exact-attempt reads must agree on the same successful run, source, stable
tag-push, repository and reviewed workflow. GitHub projects retained successful
jobs under new IDs; original timestamps and complete step evidence must match.
Repacking, republishing, reused verification, missing origin proof, incomplete
coverage, arbitrary dispatch, different-run or later-attempt fallback reject.

Artifact14405220741 remains the original three-file archive, created within
original prepare, with SHA256
`5b93baede3bb9b83c8a16d77c5f1acc0b7228b219ebcc4e4e5aed27e5ff4fb01`.
Both source-bound package manifests, SHA512 tarballs and official registry bytes
must agree. The standard gh2.102.0/Node24.15.0/seed verifier, signatures,
certificate issuer/signer/environment, source, subject, ancestry, complete source
CI/status and current-contract checks are unchanged. Normalized proof retains
origin `runAttempt:1` and `verification.runAttempt:2` distinctly.

Fresh actual observation before implementation returned two unknown publications
with `publication-run-mismatch`. The exact regression command is
`node --test --test-name-pattern='actual Agent UI recovered pair' tests/publication-tagged-recovery.test.mjs`:
one failure before, zero after. The committed real-response fixture authenticates
both genuine packages and rejects adversarial origin/recovery identity, artifact,
publication projection, coverage and cryptographic mutations. It contains public
responses and original bytes, never synthetic signed claims or credentials.

This changes no package, publisher workflow, registry tag, source capability,
permission, advisory binding, baseline or state. Both Desktop capability maps
remain empty. The existing two HIGH runtime approvals retain source9d657a74,
locka3e1f05f and November19 expiry. Requested writes and state writes are false.
Hosted merge, deployment, ordinary settlement and replay remain operator-owned.

## Read-only inventory and independent holds

The fresh standard inventory covers19 repositories,42 packages and212 edges,
with zero graph coverage gaps/cycles; publication collection uses137 requests
and24829268 bytes within unchanged limits. Both new versions authenticate as
normal npm latest, matching current source contracts, origin attempt1 and
same-artifact verification attempt2. Normalized public coordinates/digests are
retained in the adjacent JSON receipt. An independent fresh pair collection also
passes with the final implementation.

The first inventory's cache-only GitHub helper decoded binary output as UTF-8,
correctly producing artifact mismatch holds; preserving Buffer bytes in that
transport helper repairs observation without changing the verifier. The rejected
inventory is retained beside the successful one. Initial canonical validation
also rejected overlong/non-atomic acceptance prose; reorganizing the prose
satisfies the unchanged specification rules.

Unrelated publication holds remain explicit: unreviewed publisher contracts,
missing provenance, oversized static artifacts and unpublished source versions;
`@lapismd/ai` is absent from the registry inventory. The recovery grants no
publisher registration for those packages and waives no channel, source-owned
intake, release-floor, current-CI, private-shape or ownership constraint.
The read-only prospective plan and complete independent-hold details are retained
in the handoff cache; they do not write operational state or prove deployed
settlement. Root owns hosted merge/deployment and ordinary settlement/replay.

The fresh prospective plan reads durable state2e02d5d870d6126ad16bb2e611f5c4e25a7d5bee
without modifying it and admits zero updates. Agent UI is qualified and unchanged;
AI, Terminal, Spec Validator, Visual Delta, Registry and JJ Store are unchanged.
Notes/Notebook/Server retain source-owned unsupported intake holds; Plugins has
an uncertain prior admission requiring explicit reconciliation; Tasks/Docs retain
phase and retained-branch ownership holds; Desktop retains private projection,
unpublished AI and prerequisite/phase holds; Mira/Core remain outside pilot.
Excluded Deno roots remain held. No uncertain operation is cleared and no replay
or ordinary hosted settlement is inferred from this prospective result.

## Final local qualification

All724 tests pass with zero failures/skips on merged PR94 main, including97
focused tagged-publisher tests and both real pinned Renovate execution controls.
The exact regression remains one failure before and zero after. Formatter,
repository check, canonical validation, mdBook and mapped spec-first pass.
Doctor passes11/11 and semantic QMD search succeeds. Actionlint passes; strict
Renovate validation passes generated Agent UI JSON and the CJS wrapper, with the
existing missing-native-RE2 fallback warning retained. Runtime audit preflight
permits exactly the existing two approved HIGH findings under unchanged binding
and expiry. No Docker worker was created by this implementation.
