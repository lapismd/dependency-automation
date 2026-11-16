# Exact older-cohort refresh and reviewed source CI

## Scope

Based on coordinator main 385409096b5d27349184f4ea11a4261bce2f7a96, this slice
refreshes the six older tooling records without changing any of the sixteen
supported tool ranges or pnpm versions. Current immutable source/root-manifest/
lock hashes and resolved versions are retained in config/tooling.json. The
GET-only collector produced 16 eligible review proposals with zero coverage gaps.
It changes no source consumer, runtime recipe, CLI major, activation or write
scope. Excluded roots and Notes' retained frozen setup remain separate boundaries.

## Regressions and qualification

The exact command `node --test tests/tooling-ci.test.mjs` initially reported
six failed cases: nonstandard reviewed paths, skipped/failed/cancelled required
validation, absent/duplicate/incomplete/wrong-source/wrong-attempt jobs, and an
explicit no-path policy silently falling back. All six now pass; a separate
persisted-receipt case rejects missing policy and malformed evidence.

`node --test tests/tooling-refresh.test.mjs` initially failed collection because
the source modules did not exist. Four cases now pass: supported-range/hash
preservation, exact workflow pin without manifest invention, held/excluded/
unknown refresh rejection, and current skipped validation with independent
prior-source successful job evidence.

Node 24.15.0 focused tooling qualification passes 26/26. Complete source verification
passes 179 tests and all three spec lanes, with zero skipped tests. The initial
spec run found two new verification rows outside their Markdown table; placing
them in the existing table repaired both findings. No assertion or validator
was weakened. Formatter and actionlint pass. Doctor and semantic QMD discovery
pass with current Deno-free spec-validator 0.2.0.

Actual global Renovate configuration validates for all 19 inventory targets. The
first repository-file `--no-global` invocation correctly warned about options
owned by self-hosted global configuration; the actual renovate.config.cjs was
then validated separately for every target. Existing optional native RE2 loading
retains its RegExp fallback; no native install or dependency change was added.

## Source CI and package-manager evidence

Reviewed path policies require exact named jobs with complete successful
source/run/attempt metadata. Skipped, duplicate, incomplete, stale-attempt or
wrong-source jobs cannot qualify. Immutable attempt-specific job endpoints
prevent a later rerun from silently supplying a different receipt. An empty
reviewed policy remains unavailable; it does not invoke filename heuristics.
The other ten historical records remain explicitly run-only observations.

Source observations were collected while independently owned pilot caller PRs
were merging. Refreshed Notes 1e49d754 and Plugins 0abf4958 therefore retain
explicit prior-source receipts 40e3e357/46c08176. Notes' earlier PWA 43795264453
passed reusable validation and deployment, retaining its quarantined skipped
interaction job. Plugins' earlier CI 43795232129 passed required functional
lanes and aggregate, with specification skipped under existing policy. Core
9cf94b7c retains same-source CI 43773566523. Later source changes remain drift,
not a false current-source qualification. Mira d681bdd6 remains unavailable:
its release success skipped artifact validation. Notebook 4405b5c6 retains
prior-source success 43615472367; current 43704372870 failed required specification
mappings. Root separately owns that canonical repair. Exact source/run links
and qualification limits are in docs/cohort-evidence.md.

Visual Delta abcb2e6d retains four successful required jobs from 43766653716.
Its root packageManager is still undeclared. Its separate pnpm 10.32.1 observation
binds the exact release.yml version-job `Set up pnpm` step and workflow SHA256
72f9815b603ba1b059d9b50542163f790cc47a421bea7e914918116fcc34023f.
Changed/ambiguous commands and unsupported versions reject fresh provenance.
Inventory still exposes the absent declaration rather than treating this
historical workflow pin as a manifest declaration or live runtime proof.

## Actual read-only inventory and preserved authority

The production inventory command ran with waves/writes false and returned 19
repositories, 43 owners and 220 edges, with zero cycles or coverage holds. All 16
cohorts remain reported, including later source/manifest/lock drift and Visual
Delta's undeclared package manager. GitHub reads used ordinary authenticated
GET commands through a local transport adapter; no token was retrieved or
exported, and no App token, publication, dispatch or repository write occurred.
Generated inventory, native configs and review proposals remain ignored local
reports and are not part of the public Pages artifact.

Raw audit admission reports only the existing exact-approved LOW deepmerge
4.3.1 tuple; every other finding still fails. These bytes remain unchanged:

- package.json SHA256: d8e668dd4eb2cc8db482cca3452bd115ec417ccb7e2ca0ff7c0a8d5fe8e45dc2
- pnpm-lock.yaml SHA256: 889c017f647b35c3955e79683c9915d5bfc7e7b660a3b9a1c481b7098d0c5b2c
- config/advisories.json SHA256: 208e07232f375651b7f87921431754c682f3f13772c0b7b48bfde18d4df91557

## Remaining gates

Hosted source review/CI and Pages/report delivery remain pending. Root's
Notebook PR #37 locally repairs the two missing canonical mappings. Subsequent
trusted dependency PR #36 may recreate that main gap; mapped factual intake or a
verified merge handoff remains a separate S1/S6 source-policy task. PR-only
specification exemption does not waive main spec-first. Eligible Node
consumer guard adoption and source-owned failures remain independently owned;
this slice does not require portability work on excluded AI Controller, AI Host
or Terminal Host, and does not remove Notes prerequisites. Whole-project recipe
qualification remains separate from supported-cohort drift enforcement.

The parent supplied newer all-four caller merge and genuine Plugins completion
facts for PLAN.md. Its receiver had completed inventory but was still settling
wave state at that checkpoint. No end-to-end S3 completion or activation change
is claimed by this source/evidence refresh.
