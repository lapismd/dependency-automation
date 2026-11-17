# Formatter-stable workspace canonical slots

Notes adoption reproduced a source-owned shared-renderer defect: ordinary
Markdown formatting changed marker spacing and table alignment, so the next
preparation rejected accurate facts as stale. The exact regression
`node --test --test-name-pattern='workspace slots survive' tests/canonical-workspace.test.mjs`
reported one failure before repair and one pass afterward.

The shared renderer now emits formatter-stable marker spacing and a table-only
Prettier directive. Whole-page formatting and repeated preparation preserve
identical slot bytes. No manual-edit check, output scope, admission decision or
dependency-integrity check is relaxed. Existing v1 slots remain unchanged.

The complete source suite passes462 tests; all three specification lanes pass.
Actionlint and doctor pass with zero findings.
Fresh read-only registry inventory and all19 standalone native Renovate
configuration validations retain19 repositories,43 owners and220 edges, with
zero coverage gaps/cycles and an allowed clean audit. This is source acceptance;
Notes' hosted adoption, wider consumer rollout and scheduling remain separate.
