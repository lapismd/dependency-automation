# Rollout and remaining work

The detailed [maintenance plan](https://github.com/lapismd/dependency-automation/blob/main/PLAN.md)
owns delivery steps and dated receipts. This page explains scope without
embedding live operational data in the public book.

| Slice                      | Current boundary                                                                                                                                                                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 Policy/authentication   | Shared monitoring, read-only audit/probes and the isolated scheduled profile writer are qualified. Most eligible version writers have migrated and passed App minting on main; Server and additional genuine candidate acceptance remain pending.                                |
| S2 Image churn             | Shared signed producer/resolver and Plugins adoption are deployed. Plugins has cold, full warm and repeated-producer acceptance; Notes adoption and obsolete image-pin PR retirement remain pending.                                                                             |
| S3 Dependency waves        | Wave admission, durable public-safe state, registry coalescing and repair ownership are deployed. The state-only pilot is qualified; consumer writes and the genuine release-chain/replay gate remain separately controlled.                                                     |
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
