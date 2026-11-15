# Overview and ownership

This repository is the LapisMD dependency coordinator. It discovers active
first-party npm consumers, verifies registry availability and drives the
existing Renovate runner. It also owns monitoring scope, workflow-authentication
reports and the isolated organization-profile PR writer.

Canonical requirements live in this book. Source and tests prove their current
implementation; README and the rollout plan explain operation and delivery.
[Rollout and remaining work](rollout.md) separates deployed functions from
planned dependency waves, operator UI, publication recovery and tooling work.

## DA-OWN-001 — Source ownership

**Requirement.** The coordinator MUST own discovery, update policy and coordination while application behavior, package publication, signing and deployment authority remain with their owning repositories.

### Acceptance details

- First-party package defects MUST be fixed in the owning source repository and consumed through released registry ranges.
- This coordinator MUST NOT publish npm packages or use package-signing credentials.
- Consumer tests, audits, compatibility decisions and repository merge rules MUST remain effective.

## System boundaries

| Owner                 | Responsibility                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Dependency automation | Discovery, stable-version eligibility, Renovate rules, release intent, notifications, monitoring policy, profile writer |
| Package repositories  | Package behavior, tests, release decisions, provenance and publication                                                  |
| Lapis CI              | Shared toolchain and dependency-image identity/provenance helpers                                                       |
| Lapis Maintenance     | Browser UI, live GitHub adapters, operator commands and session/cache boundaries                                        |
| GitHub                | Installations, encrypted secrets, checks, branch rules and deployment environments                                      |
| npm registry          | Available published package versions and prerequisite metadata                                                          |

The coordinator's private npm workspace is tooling, not a publishable package.
Its runtime is Node 24 with pinned pnpm. The specification validator is the
Deno-free Node release. Some retained consumer-version templates still install
Deno for Changesets 3; replacement remains explicit rollout work.
