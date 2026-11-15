# Rollout and remaining work

The detailed [maintenance plan](https://github.com/lapismd/dependency-automation/blob/main/PLAN.md)
owns delivery steps and dated receipts. This page explains scope without
embedding live operational data in the public book.

| Slice                      | Current boundary                                                                                                                                                                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 Policy/authentication   | Shared monitoring, read-only audit/probe and isolated profile writer exist. Profile App-created CI/no-op behavior and scheduling are qualified. Plugins version authentication is deployed; Notes/remaining consumer migrations and next real generated candidates remain pending. |
| S2 Image churn             | Lapis CI input identity, signed resolver and shared publisher are merged. Plugins adoption is in review; source publication and full cold/warm acceptance precede Notes. Existing image-pin PRs have not yet been eliminated.                                                      |
| S3 Dependency waves        | Wave admission, durable coordinator state, registry coalescing and repair ownership are implemented behind default-off gates. Hosted pilot, real release-chain acceptance and activation remain pending.                                                                           |
| S4 Maintenance integration | Monitoring defaults are adopted by the separate Maintenance app. Wave details, issues, decision history and eligible batch actions are planned.                                                                                                                                    |
| S5 Publication recovery    | Registry batching, qualified-artifact reuse and resumable partial publication remain planned. Current package publishers retain their own authority.                                                                                                                               |
| S6 Tooling/drift           | Deno-free consumer versioning, tested tool cohorts and centralized exception/drift enforcement remain planned. The coordinator's new specification toolchain is already Node-only.                                                                                                 |

No row in this table authorizes additional writes, activates a parked host or
waives a product/audit gate. Current source qualification is recorded in the
verification matrix; hosted and downstream evidence remains separate.
