# Lock-stabilized empty-operation recovery

Plugins operation `966f36186aa6076ea3fd66bd4fa8a5c9e989ab0ab56aee25edb76327732411da`
was admitted by dependency-automation recovery run
[`44842401697`](https://github.com/lapismd/dependency-automation/actions/runs/44842401697).
Renovate correctly failed visibly with `lockfile-error`: pnpm refreshed unrelated
CodeMirror and React peer contexts while preparing the first-party cohort, and
the Plugins canonical intake rejected that mixed lock change before a branch or
pull request was created.

Plugins prerequisite [#171](https://github.com/lapismd/lapis-plugins/pull/171)
separately qualified and merged those registry-only lock resolutions at source
`32b1680b478e8094716c94cdc89a4854660bf4d8`. Exact replay then retained all
eleven admitted first-party importers without CodeMirror or React drift. The
source advance intentionally changed `pnpm-lock.yaml`, so the earlier
byte-identical target-surface recovery could not safely authorize a retry even
though no admitted target had reached main.

The operation-bound lock-stabilization projection closes that recovery gap. It
requires the root/workspace/canonical policy and every targeted manifest blob
and mode to remain identical. It reads both exact Git lock blobs, verifies their
Git identities and bounded YAML encoding, and compares a deterministic
projection of every admitted package edge, package/snapshot record, integrity,
catalog entry, patch entry, transitive reference and lock metadata. Only an
independently qualified current source with empty PR, dependency-branch and
orphan evidence may record the receipt. Fresh ordinary planning and every
consumer CI, merge, version and publication gate remain unchanged.

Focused regression evidence starts at one failure before implementation and
passes four source-advance/recovery cases after implementation. Hosted recovery,
the generated Plugins pull request and final successor replay are recorded after
the exact-main coordinator change qualifies.
