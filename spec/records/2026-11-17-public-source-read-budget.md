# Bounded public source reads and HTTP diagnostics

Recent hosted reconciliation `44019935515` and `44021552932` fail with HTTP403
while reading the coordinator's durable state ref. The first gets through
discovery before a later state read fails; the next fails at its first state
read. Existing errors retain neither quota headers nor the server request ID,
so those receipts alone do not prove a quota or permission cause. No credential,
permission, phase or schedule change is inferred.

## Source boundary

DA-INV-005 moves the production inventory's public source-file reads from
authenticated contents/blob API calls to exact-revision raw GitHub URLs.
Repository/default-branch/tree metadata remains authenticated and authoritative.
Both public visibility fields must agree before any raw source read. Every
requested path must exist in the tree with an immutable Git blob SHA. Exact
response bytes reproduce that blob identity before parsing; no changed bytes,
redirect, missing identity, unsafe path or HTTP error falls back to the API.

Raw requests carry no Authorization or cookies. Each response is bounded at
4MiB/30 seconds, each repository reader at256 files/16MiB total. Repeated path
reads share only an invocation-local result. No additional repository, private
source, installation or update authority is granted. Package registry and
publication-proof budgets, independent integrity/provenance checks and source
admission remain unchanged. Production discovery still uses current default
branches; frozen revisions below are disposable read-only validation inputs.

DA-INV-006 retains sanitized HTTP status, numeric quota/reset/retry values and a
bounded hexadecimal GitHub request ID. Credential-bearing URL parts, query
strings, arbitrary headers and response bodies remain absent. Confirmed quota
exhaustion is distinct from an unclassified permission failure. Diagnostics
grant no retry, fallback or write admission.

## Evidence

Two exact regressions initially fail: production-style public discovery still
calls the file API, and a failed read loses sanitized quota context. They pass
after the source change. The expanded19 focused tests cover byte substitution,
UTF-8/empty blobs, local cache scope, unsafe/mutable coordinates, unknown/private
visibility, redirects, HTTP denial, per-response/aggregate/request bounds and
credential/body redaction.

An authenticated GET-only comparison runs both transports against the same
19 frozen public source trees with complete workflow and tooling discovery.
Every returned discovery object is equal. Authenticated API calls fall from275
to63;212 source reads use the public raw host. The full comparison and immutable
source coordinates are retained outside source at
`~/.cache/coordinator-public-source-read-20261117/frozen-comparison-final.json`.
This measures discovery transport, not all subsequent publication/CI API calls.

Final local acceptance passes all398 tests, three specification lanes,
Actionlint and19 fresh native Renovate configurations. Doctor passes11/11 and
semantic QMD discovery succeeds. A fresh GET-only production inventory retains
19 repositories,43 public owners,220 edges and zero gaps/cycles, with writes
disabled and zero audit findings. The final frozen comparison also binds the
actual source-module hashes and retains equal results with all bounds enabled.

Hosted normal reconciliation remains required before completion.
The original HTTP403 cause, durable publication retirement and repeated no-op
acceptance remain unproven until the hosted receipts establish them. Existing
Community/Nostr/Deno exclusions, Notebook capability holds and disabled
scheduled/full rollout remain binding.
