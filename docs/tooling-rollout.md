# S6 tooling rollout and remaining gates

This runbook retains the source foundation and current remaining S6 gates.
It does not claim completion of every consumer recipe or excluded Deno portability.
Existing source-owned version recipes, CLI majors, frozen hosts and publication
approvals remain authoritative. Re-read exact main revisions before adoption.

## Verified runtime evidence

On 2026-11-15, official npm metadata and SHA-512-verified tarballs identify
Changesets 2.31.1 and 3.0.3 as Node executables. Their executable SHA-256 values
also match upstream source commits a897bb8a and c9269c01 respectively.
Changesets 3.0.3 declares Node engines ^22.11 || ^24 || >=26; 2.31.1 has no
Node engine declaration, so its supported Node 24 contract comes from execution.
No shipped file in either CLI tarball references Deno. This describes the CLI
executable, not every project recipe: CLI 3's transitive formatter can select
Deno from intentional project configuration.

- [CLI 2.31.1 registry metadata](https://registry.npmjs.org/@changesets%2fcli/2.31.1)
- [CLI 3.0.3 registry metadata](https://registry.npmjs.org/@changesets%2fcli/3.0.3)
- [Formatter 0.1.3 registry metadata](https://registry.npmjs.org/@changesets%2fformat/0.1.3)
- [Reviewed 2.31.1 executable](https://github.com/changesets/changesets/blob/a897bb8ac115fa65343a8bfe53654040c1542a80/packages/cli/bin.js)
- [Reviewed 3.0.3 executable](https://github.com/changesets/changesets/blob/c9269c01af5f3f7463adc648890fc3a8a729dd18/packages/cli/bin.js)

Run the explicit local acceptance from this repository with Node 24 and its
pinned package manager. Each fixture uses public npm, a fresh frozen install,
an executable PATH without Deno, status output, version/changelog mutation and
an independent clean dependency audit. No publisher or credential API is called.

```sh
node scripts/qualify-tooling.mjs 3.0.3
node scripts/qualify-tooling.mjs 2.31.1
```

Both supported Prettier-only contexts passed on Node 24.19.0: status and prepared version changed
from 1.2.3 to 1.2.4, changelog was written, CLI major stayed unchanged, and each
fixture audit had zero findings. A separate CLI 3 negative control adds
deno.json beside Prettier: official format 0.1.3 selects Deno and raw version
preparation fails with spawn-deno ENOENT. The production guard rejects that
mixed context before App minting and before version mutation. The raw negative
control runs only in a disposable fixture; no formatter is disabled or forced.
Exact hosted Node 24.15.0/consumer recipes
still require their own qualification. Receipts remain ignored operational
artifacts under reports/tooling-qualification-<version>.json.

Root Deno inputs were observed for Notes, AI Controller and AI Host. They are
explicit source-qualification holds for the generic contract, not proof that
every such legacy recipe needs the same formatter or may be changed.

At the historical November 15 foundation audit, the then-current Renovate
graph had one LOW and four MODERATE instances across three advisories:

- GHSA-gcqx-w48m-w2h4: deepmerge 4.3.1 through Renovate.
- GHSA-3g3m-2fjr-6pw4: glob 13.0.6 directly through Renovate and 10.5.0 through its GCP detector, gaxios and rimraf chain.
- GHSA-g3hv-75wg-m249: minimatch 10.2.6 directly through Renovate and 9.0.9 through the same GCP chain.

Subsequent source remediation and the separate November 16 exact approval
supersede that historical graph. The current unchanged dependency graph reports
only the existing exact-approved LOW deepmerge tuple. This evidence refresh
changes no package/lock bytes or advisory bindings and creates no exception.

## Exact consumer version boundaries

This read-only snapshot covers all fifteen declared CLIs in the nineteen-repo
inventory. It inspects direct workflow steps only; image contents, reusable
workflows and script internals require source-owned acceptance. The graph still
has 43 owners, 220 edges, zero runtime cycles and zero source coverage holds.
At this historical foundation checkpoint six tool cohorts were recorded;
thirteen repositories were then unconfigured. Current sixteen-cohort coverage
and remaining recipe/source gaps are described below.

| Repository                           | Exact source                                                                                                                                      | Workflow / job                                   | Direct Deno setup | Action version command      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------- | --------------------------- |
| lapismd/mira-mde                     | [11d37629](https://github.com/lapismd/mira-mde/blob/11d376297c84247161ff80d80bc3fe7a489a21c8/.github/workflows/release.yml)                       | .github/workflows/release.yml / version          | None              | pnpm release:version        |
| lapismd/design-core                  | [c1e19ba1](https://github.com/lapismd/design-core/blob/c1e19ba19fda5d608d7ab788694056b5425b4856/.github/workflows/release.yml)                    | .github/workflows/release.yml / version          | None              | pnpm release:version        |
| lapismd/lapis-notes                  | [4d9e01e6](https://github.com/lapismd/lapis-notes/blob/4d9e01e61eed701febe76c4899df63a09aa45b08/.github/workflows/release.yml)                    | .github/workflows/release.yml / changesets       | None              | pnpm release:version        |
| lapismd/lapis-plugins                | [a9b94974](https://github.com/lapismd/lapis-plugins/blob/a9b949745829ec5ba727118ebbf5ced21d9e053b/.github/workflows/version-packages.yml)         | .github/workflows/version-packages.yml / version | None              | pnpm release:version        |
| lapismd/lapis-plugin-tasks           | [f3f87dab](https://github.com/lapismd/lapis-plugin-tasks/blob/f3f87dab570bfb0b1f88d74a3ed37c1395ccf8d4/.github/workflows/ci.yml)                  | .github/workflows/ci.yml / changesets            | None              | pnpm release:version        |
| lapismd/lapis-plugin-docs            | [27555cf4](https://github.com/lapismd/lapis-plugin-docs/blob/27555cf430736422732f6afbbdd66b3ac8644411/.github/workflows/ci.yml)                   | .github/workflows/ci.yml / changesets            | None              | pnpm release:version        |
| lapismd/lapis-plugin-notebook        | [4405b5c6](https://github.com/lapismd/lapis-plugin-notebook/blob/4405b5c61768d3537708c8fed7d0b11d7b8e7b91/.github/workflows/version-packages.yml) | .github/workflows/version-packages.yml / version | None              | changeset version           |
| lapismd/lapis-server                 | [7efbdca6](https://github.com/lapismd/lapis-server/blob/7efbdca64b47635bb07814f80d82a89490a99ca1/.github/workflows/release.yml)                   | .github/workflows/release.yml / changesets       | None              | pnpm release:version        |
| lapismd/agent-ui                     | [6e9a0086](https://github.com/lapismd/agent-ui/blob/6e9a0086a20abdfcf22f8e003d9bc156dd5c178a/.github/workflows/changesets.yml)                    | .github/workflows/changesets.yml / changesets    | None              | pnpm exec changeset version |
| lapismd/lapis-ai                     | [eb66737f](https://github.com/lapismd/lapis-ai/blob/eb66737f09a923d3e7b901abb98bfd0b03166e3a/.github/workflows/changesets.yml)                    | .github/workflows/changesets.yml / version       | None              | pnpm release:version        |
| lapismd/lapis-terminal               | [8055f7a7](https://github.com/lapismd/lapis-terminal/blob/8055f7a732b3baa2acdfdcbc7227c4a7b71318c0/.github/workflows/changesets.yml)              | .github/workflows/changesets.yml / version       | None              | pnpm release:version        |
| lapismd/storybook-addon-visual-delta | [abcb2e6d](https://github.com/lapismd/storybook-addon-visual-delta/blob/abcb2e6d7698594d162a418419a737486a2fc019/.github/workflows/release.yml)   | .github/workflows/release.yml / version          | None              | pnpm release:version        |
| lapismd/ai-controller                | [cf632cac](https://github.com/lapismd/ai-controller/blob/cf632cacb24fb71b34a0375f91eef7d747660111/.github/workflows/version-packages.yml)         | .github/workflows/version-packages.yml / version | v2.9.7            | pnpm release:version        |
| lapismd/ai-host                      | [5a323bc5](https://github.com/lapismd/ai-host/blob/5a323bc5435eb82f682ff89d285fb0258b3470a4/.github/workflows/release.yml)                        | .github/workflows/release.yml / version          | None              | pnpm release:version        |
| stevejuma/jj-store                   | [086def18](https://github.com/stevejuma/jj-store/blob/086def182eae2ab6e5dc39aba030390d7ea8612c/.github/workflows/release.yml)                     | .github/workflows/release.yml / version          | None              | pnpm release:version        |

Only the AI Controller version-only job above has a direct Deno installer.
Its retained portable update entry does not activate the monitoring-excluded
host. Actual acceptance of its genuine pending note at c40dedb9 proved status
can succeed without Deno while version preparation fails: its intentional
deno.json selects Deno formatting. Retain the installer under that current
source policy. A source-owned portable-task/formatter boundary and full recipe
qualification are required before any installer removal; CLI metadata alone
does not authorize a change.

Notes release.yml / changesets reaches Deno indirectly through
[ci-setup/action.yml at the same exact source](https://github.com/lapismd/lapis-notes/blob/4d9e01e61eed701febe76c4899df63a09aa45b08/.github/actions/ci-setup/action.yml).
That shared composite installs and verifies Deno 2.9.7; web-acceptance also has
a direct setup. Preserve both until an owning followup separates and proves
the portable version recipe from frozen-host prerequisites. The Notes recipe
includes release checks and plugin-host generation beyond the generic CLI
fixture, so CLI qualification alone does not authorize composite removal.
Notebook also has no direct version-job Deno setup. Its pinned Changesets v2
action explicitly selects `version-script: pnpm release:version`, guarded by
its source release-pipeline regression. Review that named source recipe; the
v1 input spelling does not determine this v2 action's command.

Generic onboarding now refuses different source-owned version recipes or
Changesets configuration, preserves a supported existing CLI major, and holds
Deno declarations in the formatter lookup ancestry. Runtime verification binds
the qualified Changesets configuration and rejects mixed contexts before App
minting. Existing consumers need explicit integration and whole-recipe
acceptance; a reviewed Node CLI is not a Deno-free capability receipt.

## Current remaining S6 work

- [x] Record all sixteen eligible public cohorts with exact source/manifest/lock/resolved-tool evidence; preserve supported constraints and report drift.
- [x] Deliver the shared source-owned version-runtime guard and actual Plugins/Core/Mira recipe proofs separately from source CI.
- [x] Refresh the older six source observations with reviewed CI paths/required-job receipts and honest package-manager provenance.
- [ ] Qualify and deploy this refresh PR and confirm the resulting inventory/report read-back.
- [ ] Finish eligible Node consumer guard adoption under each exact source-owned recipe; retain existing CLI majors and all functional gates. Core/Mira adoption and source-owned failure repairs remain independently reviewed work.
- [ ] Address Notebook's source-owned missing canonical mappings before claiming current-source CI success; retain Mira's unavailable source-pipeline context until actual eligible validation exists.

Frozen AI Controller, AI Host and Terminal Host are excluded. Notes' root Deno
and frozen setup remain an explicit separate boundary, not a required migration
or permission to remove prerequisites. Supported-cohort drift enforcement and
whole-recipe portability are different exit conditions. CLI metadata alone
qualifies neither arbitrary project recipes nor all consumer adoption.

Current source/recipe receipts, default/existing refresh commands, failure
limits and Visual Delta's undeclared-manifest/workflow-pin distinction are in
[the cohort evidence ledger](cohort-evidence.md). Source advisory approval and
activation remain unchanged; this slice does not add a waiver or writer scope.

Candidate preparation is already production-wired: it compares previous and
candidate manifest/lock evidence after the existing scripts-disabled frozen
install and before release-intent writes. Unknown/new runtime bytes, implicit
CLI major changes and newly incompatible cohort changes fail closed. Unchanged
legacy tooling remains visible without forcing a migration. Dependabot retains
security coverage; the coordinator retains first-party update ownership.

## Historical foundation operator checkpoint

The parent's reviewed S3 cutover uses writes=false, phase=pilot, waves=true and
schedule=true, with wave-state writes absent/off. Read-only hosted pilot
43769439228 was queued from main 519e6cd9 at the recorded checkpoint.
Do not treat that queued run, the old flat settings or local S6 results as
durable state-write/consumer-write acceptance. Root owns subsequent receipts.
