# Recover an empty attempt after operational source changes

Ordinary pilot44125843709 completes successfully but skips its writer because
a second historical admission remains unresolved. Operation
0f1650a61286d414664a03f2c0a0e4d2625e8c81319d30ecd4c05cba7ea237eb originated in
completed successful44004351048 at Notebook3712b63c. Its current source has
advanced to4484fe44 through the independently reviewed setup43. The earlier
recovery44119443025 repaired only215bd52c; it did not resolve this second
record. No current dependency branch or open PR is observed.

The original recovery intentionally requires unchanged source, so it cannot
resolve this case. The new optional manual current-source binding compares
complete immutable public trees before allowing an operational-only transition.
Every non-operational blob/submodule identity and mode remains equal. Only
regular Markdown documentation, workflow YAML, version-guard JSON and named
test files may differ. Package/lock/workspace/policy/implementation changes,
symlinks, unsafe or duplicate paths, truncated/unavailable coverage and missing
exact current-source authority fail closed. The existing originating-run,
empty-branch/PR, exact-state CAS and fresh writer qualification gates remain.

The narrow command is `node --test --test-name-pattern='source-advanced recovery'
tests/wave-evidence.test.mjs`: initially one failure, then zero. Expanded focused
source/recovery/workflow checks pass four cases, including stale source proof,
changed input, retained repair branch, unavailable tree and preserved current
qualification controls. The first stale-current fixture correctly remained
qualification-wait; it gains planning admission only after fresh source evidence
is supplied, and writes=false still stores planned rather than writable state.
An initial canonical prose-placement error is repaired without weakening rules.

Actual GET-only tree qualification at3712b63c/4484fe44 produces unchanged
projection SHA256908c03cb55da479e10fb72c44aa340aab0cc191c31fe10eb137365d4bfa0b818.
Read-only recovery/planning against state7be27a06 admits exactly the genuine
Core0.13.4→0.13.5 development patch, with no release intent and no other writer.
Both state and consumer writes are disabled in this local proof. The retained
unsupported API/UI migration is not re-admitted. Full source verification
passes466 tests and three specification lanes; fresh inventory retains
19 repositories,43 owners,220 edges and zero coverage gaps/cycles with clean
audit. Actual hosted recovery, new bot candidate and end-to-end acceptance
remain pending deployment; consumer writes are temporarily disabled again.

Tracker50 already links sixteen separate adoption tasks51–66. This common
recovery repair is needed for the selected pilot, rather than a return to
serial consumer product fixes. Operational receipts remain in the ignored
local `notebook-single-pilot-20261117` cache; no live state is committed.

## Deployment and controlled execution

PR67 merges at94cc8c313ec3adc2046d6d455aa0ee60598e5912 after hosted
44128520910 succeeds. Exact-main check44129038089 and Pages44129038051 also
succeed. The live `rollout.html` returns200 and exposes tracker50 and the
shared adoption runbook, with all sixteen independent tasks already open.

Fresh read-back before dispatch observes state7be27a0669d694b9cdaf48ec38f0233989652543,
the original completed run44004351048, current Notebook4484fe44, zero open PRs
and zero dependency branches. Controlled run44129153610 binds the full exact
operation, state and current-source IDs. Writes are restored with Notebook
alone in `pilot`; the global phase remains `pilot` and schedule remains false.
The run passes source verification and begins authoritative inventory. This
checkpoint does not claim hosted recovery, a new bot PR or completed replay.
