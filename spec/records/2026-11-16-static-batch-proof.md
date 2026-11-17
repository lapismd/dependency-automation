# Static Plugins batch proof repair

DA-PUB-002/004 retain authenticated provenance, exact public source/current CI,
immutable Actions artifact identity, Ed25519 bundle signatures, complete file
hashes and byte-identical published npm archives. Notes' proof/recovery and
8 MiB artifact, 4 MiB tarball and 32 MiB inflation limits stay unchanged.
No writer, signer, permission, channel or operation-CAS authority is added.

## Exact production regressions

Wave generation 80 at `d26034eb06788822c8fc95586db26863d3f259bf` observes all
ten newly published Plugins packages as `publication-artifact-mismatch`, keeping
Notes in upstream-wait. Actual successful publisher `43962605517`, attempt 1,
source `993e53456bf5044bc73c515cf98dc2424625e6c7`, owns static candidate artifact
`14278415524`. Its downloaded ZIP matches the GitHub metadata digest
`sha256:883c6011cd8e08a1d47495395693cc4d0e44564774af390c5f5cc3bbc707e7d6`.
It is 40,983,874 compressed bytes, 41,290,159 aggregate inflated bytes and
56 entries, including qualified npm archives not selected for this publication.
The old 24 MiB aggregate cap rejects this real batch before hash verification.
Several valid plugin bundles and signed files also exceed the inherited 4 MiB
single-file bound; the largest signed file is 7,791,171 bytes.

The explicit static-only profile caps the ZIP and aggregate inflation at 64 MiB,
selected npm archives at 16 MiB and plugin archives/signed files at 8 MiB. Nested
plugin inflation remains 32 MiB. Request/total-fetch-byte bounds, allowed paths,
entry/release counts, source/time-window/digest checks and every signature remain
required. Unknown profiles and oversized batches reject. Notes does not acquire
this profile. Oversized artifact metadata now reports a size-limit hold before
any archive download. The aggregate-boundary regression fails once before the
change and passes afterward, including default-profile and per-file negatives.

After size qualification, five real versions verify and five report
`publication-static-mismatch`: package folders/tags such as `canvas` differ
from runtime IDs/archive names such as `lapis-canvas`. The reader now obtains
runtime ID/version from the source manifest returned as a file at the attested immutable
commit. The directory still owns the release tag; the authenticated runtime ID
owns the signed bundle/archive coordinates. Wrong, unsafe, non-file, different
path or changed-version source identities remain held. A separate exact identity
regression fails before the repair and passes afterward. The History source
manifest fixture is public metadata from its existing reviewed source commit.

## Actual retained-batch acceptance

The read-only real collector now verifies all ten selected versions and their
current source contracts: AI 0.1.16, Bases/Canvas 0.4.2, Bookmarks/Graph/Search
0.1.13, CSV 0.2.10, Markdown 0.3.3, Source Editor 0.1.12 and Transcripts 0.2.9.
It checks real registry ECDSA/Sigstore evidence with the pinned standard CLI,
the retained artifact and Ed25519 bundles, exact tarball bytes, source ancestry
and current source CI. It uses 61 bounded requests and 42,295,048 fetched bytes,
inside the unchanged 64 MiB total budget. Raw artifacts/reports stay ignored;
no rebuild, republish, tag, consumer write or state edit occurs.

The initial broader focused test command also rejected the unpinned system gh
before crypto tests could initialize. Rerunning with the existing verified
Node 24.15.0/pnpm 10.34.5/gh 2.102.0 paths passes without changing tool policy.
Full source/config/inventory verification is recorded before commit. Hosted
collector deployment, real downstream progression and idempotent replay remain
required before S3 completion or schedule/phase expansion.

Final source qualification passes all 345 tests and all three canonical lanes,
workflow actionlint, fresh full audit with zero findings and all 19 freshly
generated native Renovate configurations. Fresh GET-only inventory retains
19 repositories, 43 owners, 220 edges and zero coverage gaps/cycles. The first
canonical run correctly reports three multi-sentence acceptance bullets; those
are split into four atomic details and the exact check plus full verification
pass. Tooling/dependency graph, active advisory decisions and rollout settings
are unchanged. Hosted deployment and wave advancement remain pending.
