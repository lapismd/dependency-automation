# Observe published source without admitting a channel

The wave reader now observes public owned versions, latest/next coordinates and
bounded waiting-release baselines independently of `stableVersions`. Candidate
selection remains latest-only. A verified next release supplies publication
facts and an explicit `channel-not-admitted` wait; it cannot satisfy a release
wait, supersede a compound wait or select a new update until existing policy
admits that version. Unknown provenance supplies a separate `provenance-unknown`
wait with a bounded reason. Newer-version, dependency floors, identical compound
support, current-main qualification, repair ownership and operation CAS remain
required.

`config/publications.json` reviews Notes' public release workflow, exact job
boundaries and artifact layout. Other publishers remain contract-unreviewed.
No repository/update allowlist, channel, signing owner or credential changes.
The inspection command is read-only and writes only ignored local evidence:

```sh
node scripts/inspect-publications.mjs @lapis-notes/api@0.6.5 @lapis-notes/file-explorer@0.2.8
```

Use the hosted Node 24.15.0 and owned Lapis CI `setup-gh` action pinned in the
policy/workflows. The command fails closed per observation if their exact
runtime/binary/static public trust seed differs. It never installs replacements.
Production inventory uses the same collector in wave mode; flat rollback does
not require publication-proof collection. Preparing this standard CLI changes
no npm dependency, lock byte or exact advisory approval binding.

Public artifact ZIP downloads require authenticated Actions read access, even
though their metadata is public. Trusted-main wave inventory first checks the existing public App identity
and Actions permission, then may mint only `lapis-notes` contents/Actions read
permissions if that capability and the coordinator preflight qualify.
An actual coordinator audit preflight must qualify before this reader mint.
That token is passed only to publication collection; coordinator discovery/state
retain `GITHUB_TOKEN`, and no write permission is requested. Missing key/access
leaves evidence unknown without blocking read-only collection or widening
credentials. The proof verifier subprocess receives neither token. Hosted
Notes read-token capability remains an explicit qualification after merge.
The actual public App registration currently exposes checks/read, contents/write,
metadata/read, pull_requests/write and statuses/read, with no Actions permission.
The capability check therefore skips minting without exposing the key or changing
registration, and artifact access remains an explicit hold. Unauthenticated
artifact ZIP download returned 401 and FileExplorer has no public release asset.
Signed npm provenance independently binds tarball/source/run, but the source
verification helper installs/exercises packages and does not independently prove
manifest-byte equivalence; it cannot silently replace this artifact gate.
A differently named assurance requires a separate reviewed proof contract.

## Verification boundary

The owned setup action verifies the official gh 2.102.0 archive checksum; the
collector independently checks its executable SHA256 and version. It executes
`gh attestation verify` offline with a fixed public trust root, SHA512 subject,
exact GitHub repository/workflow/source/ref, issuer and hosted-runner policy.
Only bounded public artifact/bundle bytes enter a temporary credential-free
working directory; no candidate scripts, npm lifecycle hooks, local user config
or network token enters that process. Its authenticated certificate claims bind
run/attempt, public repository/owner IDs and deployment environment. A bounded
DER reader reads only the environment extension from the already authenticated
certificate because gh's JSON omits that claim.

Registry ECDSA separately verifies name/version/integrity using reviewed static
public npm signing keys. The npm publish statement supplies coordinate
consistency, not independent signature authority. GitHead is not fabricated or
used as proof. The source contract, attested run/attempt, successful preparation,
qualification/publication jobs and immutable release manifest/tarball must all
agree. A later successful verification may recover a failed post-publication
step only at the same source and with identical published bytes, including a
successful second attempt of the same workflow run.

Historical source CI retirement is narrow: only completed GitHub Actions suites
mapped to an older same-source run of the same workflow may yield to its fully
successful newer run. Pending, unknown/unmapped and external checks remain
holds. This does not change current-main/PR-head qualification.

The Node distribution also contains Sigstore JavaScript affected by
[GHSA-xgjw-pm74-86q4](https://github.com/advisories/GHSA-xgjw-pm74-86q4) and
[GHSA-jfc7-64v2-mr8c](https://github.com/advisories/GHSA-jfc7-64v2-mr8c).
The verifier never imports or executes those modules. It reads only the
hash-pinned static public seed data. The owned standard CLI uses
[sigstore-go v1.3.0](https://github.com/cli/cli/blob/v2.102.0/go.mod), and raw CLI
regressions reject both a DSSE Unicode encoding mutation and a v0.2 proof that
has only unbound integrated time. This is targeted verifier qualification, not
a claim of a complete Go dependency audit. The unchanged coordinator audit has
one LOW deepmerge finding under its existing exact approval and no additional
findings; no exception is transferred to a new dependency graph.

## November 16 read-only qualification

Authenticated GET-only observation qualified API 0.6.5 at source 29577621,
FileExplorer 0.2.8 at 1080bdb4 and LanguageService 0.1.6. FileExplorer's original
[43635116316/1](https://github.com/lapismd/lapis-notes/actions/runs/43635116316/attempts/1)
published successfully but failed post-verification; successful
[43637981701/1](https://github.com/lapismd/lapis-notes/actions/runs/43637981701/attempts/1)
verified identical source/tarball bytes. Recovered
[43800122156/2](https://github.com/lapismd/lapis-notes/actions/runs/43800122156/attempts/2)
qualified API 0.6.6 and Profile 0.2.3 at
1e49d75421899183cb4f0fb14ae613a172872eeb, retaining the original candidate
artifact. No rebuild, republish or new tag was needed. These versions remain
next-channel and are not admitted by latest policy. UI 0.2.1 and Workspace 0.4.6
remain verification-incomplete; an unrelated success cannot repair them.

The bounded Notes scan used 79 requests and less than 8 MB. Raw bundles,
archives, manifests and reports remain ignored/local; public state keeps only
versioned normalized public coordinates/digests. Current observation and the
last verified receipt are distinct, so a missing later observation does not
erase historical proof or turn it into current authority. The deployed
Maintenance v1 parser was exercised directly against all 13 normalized records
and the complete 19-node/159-publication wave report, accepting both without a
consumer schema/source change; existing reason and
wait presentation carries the channel/provenance holds.

## Completion and pilot checkpoint

All four source callbacks have genuine successful runs: Notes
[43800801981](https://github.com/lapismd/lapis-notes/actions/runs/43800801981),
Plugins [43798984826/2](https://github.com/lapismd/lapis-plugins/actions/runs/43798984826/attempts/2),
Mira [43799748568](https://github.com/lapismd/mira-mde/actions/runs/43799748568)
and Core [43799606279](https://github.com/lapismd/design-core/actions/runs/43799606279).
Coordinator receivers
[43799022094](https://github.com/lapismd/dependency-automation/actions/runs/43799022094)
and state-only [43801102868](https://github.com/lapismd/dependency-automation/actions/runs/43801102868)
succeeded. The latter retained Core/Mira unchanged/qualified, Plugins' upstream
wait and Notes' current publication/qualification wait; no duplicate PR was
created. The exact Plugins attempt-two replay is now observed successful.
These hints never replace source publication or all-current-head gates.

The reviewed manual pilot checkpoint is writes=true, phase=pilot, waves=true,
schedule=false, state-writes=true following run 43786666847. The policy records
this already authorized transition; this slice changes no remote setting or
default-off behavior. Hosted collection/admission after merge remains required.
The separate canonical handoff gap is outside this publication-proof slice.

To roll back, disable consumer writes first, restore flat mode only after
reviewing retained repair/operation ownership, and freeze state writes if
needed. Keep prior receipts and branches. Unknown/missing/expired evidence
requires renewed read-only observation or source-owned publication recovery,
never invented gitHead, next-to-latest promotion, signing-key retrieval or a
blind retry of an uncertain write.
