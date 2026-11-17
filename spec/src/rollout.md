# Rollout and remaining work

## Single-repository completion

The current objective is to complete and enable Notebook end to end before
expanding adoption. Other repositories no longer gate that milestone. Notebook
is the only source `pilot` entry; the global phase stays `pilot`, including
after scheduling is enabled. Promoting one reviewed entry from `full` to
`pilot` enables that repository independently, without a global full rollout.

Acceptance requires a genuine compatible Core update, shared canonical
preparation, current PR and main qualification, source-owned version/release
disposition, Pages, automatic completion/catch-up and idempotent repeat runs.
A development-only update must retain no publication intent; it cannot stand
in for evidence that an npm publication occurred. Existing genuine publication
evidence and any unexercised release branch remain explicitly distinguished.

Remaining repository adoption belongs in separate assignable tasks with the
same checklist, exact source evidence, repository-specific blockers and
activation/rollback steps. Community, Nostr and Deno-only packages stay excluded.

The detailed [maintenance plan](https://github.com/lapismd/dependency-automation/blob/main/PLAN.md)
owns delivery steps and dated receipts. This page explains scope without
embedding live operational data in the public book.

| Slice                      | Current boundary                                                                                                                                                                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 Policy/authentication   | Shared monitoring, read-only audit/probes and the isolated scheduled profile writer are qualified. All eligible version writers have migrated and passed their main App/Changesets jobs; genuine Plugins and profile candidates also started CI and merged.                      |
| S2 Image churn             | Shared signed producer/resolver is qualified in Plugins and Notes, including full warm/repeated-producer acceptance and Notes production deployment. Both obsolete image-pin PRs are closed.                                                                                     |
| S3 Dependency waves        | Wave admission, durable public-safe state, registry coalescing and repair ownership are deployed. State and writable pilots are qualified. All four pilot completion callers are qualified; the genuine release-chain/replay gate and steady-state scheduling remain pending.    |
| S4 Maintenance integration | The deployed app reads monitoring policy, waves and open issues and supports confirmed eligible batches. Real report parsing and a disposable live command/preflight test are qualified; visual review remains separate.                                                         |
| S5 Publication recovery    | Registry preparation and publication are separate. Immutable artifact reuse, unchanged replay and rejection before writer minting are hosted-qualified; a genuine three-plugin batch is deployed and its public signatures verified. Package publishers retain source authority. |
| S6 Tooling/drift           | Node CLI contracts, initial source cohorts, candidate guards, operational drift reporting and exact advisory admission are deployed. Additional cohorts and consumer whole-recipe guard adoption remain in progress.                                                             |

No row in this table authorizes additional writes, activates a parked host or
waives a product/audit gate. Current source qualification is recorded in the
verification matrix; hosted and downstream evidence remains separate.

S6 now has a source implementation for Node-only version preparation, central
cohort observations and candidate drift rejection. Hosted qualification and
consumer adoption remain separate; existing frozen Deno host sources and all
advisory exception rules remain unchanged.

S6b adds production maintenance drift reporting and exact coordinator advisory
admission before dependency write planning and App minting. Its initial approval
list was empty; the operator subsequently approved one exact source/lock/path
decision with November 21 expiry, recorded under DA-OPS-002. Consumer adoption
and source-owner treatment of reported unknowns remain separate; a matching
static check name is not a complete security qualification.

The bounded canonical-intake preparer and Notebook source opt-in are deployed.
Normal bot regeneration and its downstream acceptance remain pending, within
the selected rollout phase. Source verification preserves unrelated peer edges
and holds ambiguous contexts; local preparation is not hosted intake acceptance.

Successful same-source package recovery preserves retained signed artifacts and
verifies existing registry bytes before resuming failed qualification. Automatic
registry install-metadata readiness remains a concrete S5 maintenance follow-up;
manual recovery is not completion of that automation. The bounded Notebook
pilot source proposal under DA-WAVE-007 retains every unrelated publisher wait;
normal bot regeneration and downstream acceptance remain pending source review.
