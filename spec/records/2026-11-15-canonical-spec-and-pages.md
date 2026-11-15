# Canonical specification and Pages qualification

The user requested a canonical specification explaining current functionality
and wiring, and deployment of the generated book to GitHub Pages. This change
adds 35 requirements with explicit verification rows and distinguishes deployed functions
from remaining S1–S6 rollout work. It does not change dependency rollout variables,
target holds, update rules, publication credentials or application behavior.

The repository is public. GitHub Pages was absent at inspection, and the current
operator token has repository administration permission. Only the generated
canonical book is eligible for public upload; operational reports and caches
remain ignored and are not copied into the book.

## Original and repaired boundaries

- Initial `pnpm spec:validate --json`: 45 findings, comprising 35 missing
  verification rows and 10 malformed acceptance-detail sections. Adding the
  exact rows and separating implementation notes repaired those contracts.
- The next validation found one broken link to this supporting record. Creating
  the intended record repairs that reference without suppressing link checks.
- The mapped-source test covers every existing protected implementation entry,
  and checks that a new unknown source path remains unmapped and protected.
- The Pages regression checks main-only publication, verification before upload,
  exact `spec/book` artifact scope, read-only building and isolated deployment
  authority. It does not use a real token or perform a deployment.

## Tooling and source authority

Registry inspection confirmed `@lapismd/spec-validator` 0.2.0 as the current
Deno-free Node release; it is consumed through the normal `^0.2.0` registry
range. Existing consumer templates still retain their separately planned
Changesets/Deno migration. Local mdBook is 0.5.4 and hosted jobs install that
exact version through a pinned action.

QMD indexing and an executed semantic `pnpm spec:search` located the new wiring,
inventory and policy chapters. Search/model work remains outside CI. The
specification map remains repository-owned and fails closed for unknown code.

## Remaining acceptance

Local complete checks, negative spec-first acceptance, hosted PR qualification,
Pages configuration and main deployment/read-back are recorded as they finish.
The verification matrix deliberately keeps the new governance/delivery rows
in progress until their named boundary is qualified. Hosted publication is not
claimed from a local book build.

## Local qualification and Pages provisioning

- `pnpm verify`: formatting, JavaScript/workflow-pin checks, all 42 tests and
  all three specification lanes passed. No existing functional test was removed.
- `pnpm spec:first` with a temporary new unmapped source file failed once with
  `SPEC-FIRST-UNMAPPED DA-GOV-003`; after removing only that probe, the exact
  command passed for 12 protected files and 14 canonical chapters.
- `spec-validator doctor`: 11 passed, zero warnings. The semantic QMD query ran
  against the repository's new collection and returned canonical chapters.
- `actionlint .github/workflows/*.yml` and generated Plugins Renovate config
  validation passed. The existing optional native RE2 fallback warning remains;
  native RE2 capability is not claimed.
- Authenticated read-only inventory passed: 19 repositories, 43 public owners,
  220 consumer edges and zero runtime cycles. The existing unpublished dependency
  and Desktop hold remain. This command used dry-run defaults and changed no
  repository settings or package coordinates.
- A built-book check found that a relative link to the outside-source supporting
  record would not be part of the artifact. The verification page now links to
  the explicit public repository record; no operational directories were copied
  into Pages to repair the link.
- The authorized Pages API setup succeeded with `build_type=workflow`, public
  project URL `https://lapismd.github.io/dependency-automation/`, HTTPS enforced,
  and no custom domain. It does not claim the site is live before main deployment.

Hosted PR, main Pages deployment and production read-back remain the handoff
acceptance steps. The public site must contain the canonical home/wiring pages
and working assets while excluding source reports and credential-bearing files.

## Hosted qualification

PR #13 passed check 43759195434 and merged as
`2bd58ec82d1541db26e58c891d47493c9ec96ef2`. Main check 43759765126 passed,
and Pages run 43759765158 passed both book and deployment jobs. Deployment
7809666306 reports success for that exact source commit at
<https://lapismd.github.io/dependency-automation/>.

HTTPS read-back passed for all 14 indexed chapters. Wiring content includes
the actual source-module and workflow names; policy/publication requirement
IDs render. The dynamic TOC includes the chapter links, and generated CSS and
book JavaScript assets return 200. mdBook 0.5 loads its TOC from an asset, so
the initial read-back's static-home navigation assumption was replaced by
checking the actual TOC asset and linked chapter URLs; the site was unchanged.
Public `reports/inventory.json` and `reports/maintenance-audit.json` paths
return 404. Operational snapshots were not copied into the artifact.

The canonical baseline and delivery requirements are now implemented. This
qualifies the specification/Pages request, not completion of S1–S6 rollout.
