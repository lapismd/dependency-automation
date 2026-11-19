# Schema2 same-manifest wait isolation

## Live failure

Post-merge reconciliation
[44592352182](https://github.com/lapismd/dependency-automation/actions/runs/44592352182)
observed Notes source `bcddd51d1ed2fdbca9fa701b3cc7a8c18de4e1f3` as qualified and
bot-owned, but operation
`15d548daac0a3ef5585142e8f4fbe345bcdfa7bd67aaea501406007d075b7490`
contained only five of the seven policy-selected Design Core edges. Artifact
`14563163660` has SHA256
`76a29ef8391730a7d0affb9888360bf45b9d085ba8baa4e0594c31061d91cde3`.
Its report retained `@lapis-notes/search` publication waits on the root and App
Profile manifests and the separate Agent UI wait/hold. Path-only wait matching
incorrectly suppressed the Design Core edges in those two manifests even though
the waits named another dependency. The generated Notes PR was therefore
incomplete and is not merge evidence.

## Repaired boundary

Schema2 admission now evaluates a complete selected edge against its immutable
canonical workspace cohort. A scoped wait blocks that edge only when it names
the selected dependency; an unscoped wait remains conservative and also blocks.
A different package's same-manifest wait stays in the report and continues to
block that package, but it no longer contaminates the selected edge through path
coincidence. Schema1 independent-development behavior and every source,
qualification, ownership, registry, candidate and optimistic-concurrency gate
remain unchanged.

The exact regression constructs the observed root and App Profile search waits
alongside all seven Notes Design Core edges and the held Agent UI edge. Before
the implementation it failed once because only five Design Core edges were
admitted. After the repair all seven are admitted while both search waits and
the Agent UI hold remain visible. A paired negative adds a Design Core wait and
proves all seven Design Core edges remain blocked.

## Qualification

The canonical workspace regression passes after the implementation. The four
directly affected suites (`canonical-admission`, `canonical-channel-admission`,
`canonical-workspace` and `waves`) pass together. Repository check, all three
canonical specification lanes and actionlint pass under the contracted Node 24
lane. Doctor 11/11 and indexed QMD discovery for DA-WAVE-008 pass under the
installed host ABI. The complete local macOS test command retains only the known
platform-owned Linux SDK projection, native-path and missing native
publication-tool failures; hosted Linux `pnpm verify` remains the broad merge
gate. A fresh coordinator reconciliation and the resulting seven-edge Notes
operation remain post-deployment acceptance.
