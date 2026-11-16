# Operational drift and advisory write admission

The coordinator has two distinct production controls. `pnpm maintenance:audit`
collects bounded source/settings evidence without writes. Inventory runs the
actual coordinator `pnpm audit --json` before selecting writable operations;
reconcile repeats it before minting a writer App token. Reports are ignored
operational artifacts, never public Pages inputs.

## Operational observations

`config/operations.json` owns reviewed version-template action pins, the exact
Node checkpoint, retained monitoring/package exclusions, and single update
class owners. Coordinator Renovate handles first-party npm versions;
Dependabot owns third-party versions and security updates. Consumer preparation
uses explicit first-party **version-update** ignore types and repairs older
untyped entries so they do not suppress security updates. Other existing
blanket ignores remain reported for their source owner to review.

The audit resolves local `action.yml`/`action.yaml` composites recursively from
the same immutable Git tree. It compares known template pins, detects unpinned
references and Node drift, and reports Deno setup as source review rather than
permission to remove a frozen-host runtime. It does not execute scripts or
inspect remote action/reusable-workflow bodies. Cycles, unavailable files and
unsupported bodies remain explicit unknowns. Repeated local-action invocations
are counted individually.

Required branch checks combine protection and effective branch-rule reads.
Static unconditional PR job names are candidates only: matched names do not
prove functional coverage or green current-head checks. Filters, matrices,
reusable jobs, expressions and settings/API failures retain gaps. Source wave
qualification still supplies execution-specific current-head gates.

Only five allowlisted activation variables are retained, restricted to booleans
and phase values. Other values and unexpected API/error bodies never enter the
report. The checkpoint is an observation baseline, not a settings writer or
permission to activate. The current operator checkpoint is writes=false,
phase=pilot, waves=true, schedule=true and wave-state writes=true, as exercised
by state-only hosted run 43772797422. No activation is changed by this slice.

The public GitHub API documentation defines the separate
[branch protection](https://docs.github.com/en/rest/branches/branch-protection)
and [effective branch rules](https://docs.github.com/en/rest/repos/rules)
reads. An inaccessible endpoint remains unavailable, even if another endpoint
responds or source YAML looks correct. Security-update enablement is reported
only when repository metadata exposes a recognized status, otherwise unavailable.

## Exact advisory authority

`config/advisories.json` defaults to an empty approved list. On November 16 the
operator explicitly approved the exact coordinator deepmerge decision proposed
in PR21; the [decision record](approved-coordinator-advisory.md) and policy bind
it to the reviewed dependency source, lock bytes, version, path and expiry.
A raw LOW remains a finding in the automation runtime, which can perform scoped
bot writes. Credential provisioning, ordinary source checks and another
repository's exception cannot create an approval.

Each approval requires all of these fields:

| Field                                                | Exact binding                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `advisory`, `package`, `version`, `path`, `severity` | One GHSA, resolved version and complete pnpm path, without wildcards                 |
| `sourceSha`                                          | Immutable most recent commit changing coordinator `package.json` or `pnpm-lock.yaml` |
| `lockSha256`                                         | SHA256 of exact lockfile bytes                                                       |
| `approvedAt`, `expiresAt`                            | UTC ISO timestamps, at most 30 days apart; expiry is exclusive                       |
| `review`                                             | Explicit coordinator review PR URL                                                   |

Dependency-source binding permits a separately reviewed policy-only approval
without the impossible requirement that a commit contain its own final hash.
Any later manifest/lock commit or lock-byte change invalidates the binding.
The runtime rejects an uncommitted dependency graph. Both hosted Git checkouts
and isolated Jujutsu workspaces resolve their own source boundary.

Full pnpm audit evidence must be parseable, unsuppressed and count-consistent.
Malformed/unknown formats, muted findings, audit failures and unavailable
registry fix evidence deny writes. Registry versions are checked for a stable
published fix or a version outside the advisory's vulnerable range; a known fix
rejects even an otherwise matching approval. No fix is installed automatically.
Extra findings, paths, changed bindings and expired approvals all reject writes.
An approval whose finding disappears creates a bounded `retire-stale-approval`
cleanup finding and continues to hold writes until reviewed removal.

Inventory writes `reports/advisory-preflight.json` and embeds the safe decision
in inventory. A denied requested write plans as read-only and emits no consumer
write targets, so new uncertain/admitted writer operations are not consumed.
Read-only observations and the separately gated state-only pilot remain usable.
`node scripts/audit-preflight.mjs` repeats the real audit before reconcile's App
token step and exits unsuccessfully on a hold. Profile refresh, notifications and
source-owned package publication retain their separate authority and gates;
this control covers dependency reconciliation rather than every repository API
writer.

## Local source qualification

The two original focused targets each failed once with a missing module before
implementation. The repaired advisory/drift/preflight targets pass, including
an actual subprocess audit fixture, dirty source rejection, sanitized failures,
known-fix/extra-path/mismatch/expiry negatives, and production workflow ordering.
The existing consumer integration regression now starts from an untyped ignore
and proves repeatable conversion while retaining functional commands.

The first complete source run passed 102 tests but failed two new specification
shape checks (one atomic bullet and one acceptance-count error); both were
corrected. The next run passed 104 tests and all three spec lanes. Doctor passed
11/11, semantic QMD found the new canonical chapter, and actionlint passed.

A real GET-only read inspected 25 public repositories, resolved 101 local-action
invocations and retained 46 unknown body observations. Required-check reads
reported eight static-candidate matches, fourteen source gaps and three
unavailable settings; these counts do not claim functional/security coverage.
It reported 142 Node-version, 704 unpinned-action, 461 reviewed-template-pin
and 15 Deno-runtime review observations. Update ownership was source-configured
in two, drifting in one and unconfigured in twenty-two repositories. No consumer
configuration was changed during collection.

The registry inventory retained 19 repositories, 43 package owners, 220 edges,
zero cycles and zero coverage holds. This local wave observation omitted bot
identity and therefore is not hosted write-readiness proof. On the unchanged
dependency graph it denied one unapproved LOW deepmerge path and four
known-fix MODERATE glob/minimatch paths. Separate dependency remediation belongs
to PR19; no approval, dependency override or package/lock change is added here.

After PR19 merged as f0e071c0b812366d59eda1a5d468fd148db167ff, PR21 was
rebased while preserving GOV-005 and its worker tests. A fresh frozen install
and real preflight resolved dependency source `7141c2ba56bfc46f620d7020bcc61808d8192ba7`
and lock SHA256 `889c017f647b35c3955e79683c9915d5bfc7e7b660a3b9a1c481b7098d0c5b2c`.
The preflight now reports exactly one unapproved LOW at
`.>renovate>deepmerge`, version 4.3.1, and denies writes; no fixed published
version was available at the observed registry boundary. The
[disabled bounded review proposal](proposals/deepmerge-low-2026-11-21.md)
ends November 21 or at a known fix, whichever comes first. It is not an approval
and is outside the empty runtime approval authority.

Hosted check 43777315092 exposed one new fixture portability failure: Actions
did not have `jj` installed (107 passed, 1 failed before the fixture assertions).
The repaired fixture always exercises the actual hosted Git source-binding path
when Jujutsu is unavailable, using only public Git objects/refs/index data and
never copying checkout credential configuration. Local runs additionally retain
both isolated and colocated Jujutsu coverage. The exact two-test target passes
with normal tooling and with a restricted Node/Git-only PATH, with zero skips.

Hosted qualification/deployment, active consumer guard adoption, actual
consumer recipe portability, additional cohort qualification and source-owner
remediation of drift/unknowns remain required S6 work. This source slice does
not complete S6.

## Hosted activation observations without wider credentials

Hosted audit 43781137104 completed its reads but could not call the Variables
API using the ordinary workflow token. Its activation result was correctly
unavailable. The trusted main audit workflow now supplies the five reviewed
values through GitHub's resolved vars context, retaining contents-read authority.

The collector prefers complete API observations and labels their source as
`repository-variables-api`. If that API is unavailable, the fallback requires
GitHub Actions, the exact coordinator repository, main ref, exact audit workflow
ref, a full source SHA, a manual or scheduled event and all five supplied names.
It labels that evidence `github-actions-vars` with the workflow source SHA.
Values are still bounded to booleans/phase; empty, invalid and missing values
remain explicit. Other environment values never enter the report. Local shells,
untrusted/incomplete contexts and policy defaults cannot prove actual settings.

The original exact `node --test --test-name-pattern 'hosted activation'
tests/operational-drift.test.mjs` regression failed once with unavailable evidence.
The repaired exact target passes two tests and the owning suite passes ten,
including invalid context/value, API precedence and workflow permission/wiring
coverage. Hosted read-back of the source label and actual values remains a
deployment gate. No App token, settings permission, secret or write API is added.

The first full run passed122/123 and exposed the existing exact workflow-env
contract. That assertion now enumerates the original workflow token plus exactly
five public vars; it still rejects every other key and retains no-App/read-only
checks. Its exact target passes1/1. Rebase onto the merged cohort evidence
preserved TOOL-004 and the approved advisory entry; combined verification passes
127tests and all3spec lanes. The only conflict was verification-table formatting.
