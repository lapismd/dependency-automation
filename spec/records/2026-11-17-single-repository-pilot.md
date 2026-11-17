# Single-repository workflow completion

The operator changed the completion order on November17: finish and enable one
real repository workflow, then create separate adoption tasks for other repos.
Notebook is selected. Its actual Node recipe/intent guard is already merged at
3712b63c through PR39, with hosted proof43987271519 and complete source CI. It
has a genuine released Core0.13.4→0.13.5 development update to exercise.

Source selection now retains Notebook alone as `pilot`; all other entries are
`full`, with existing exclusions/holds preserved. The coordinator global phase
remains `pilot`. Later adoption promotes one source entry after its own checks;
enabling the hourly schedule cannot activate the other entries.

Existing verified completion observations must remain available outside the
writable pilot. The exact regression fails once before separating that read/
dispatch authority from write phase, and passes afterward; held roots remain
rejected. Notebook's exact active CI401183623, Pages401183626 and version
403592523 workflow IDs are added to the source completion policy. Registry
workflow/self-trigger scope is not widened.

Notebook's retained closed PR16 is independently inspected: its only bot commit
08f7818af8b956f6ef737e7ca92bafec432159a1 changes Visual Delta0.0.7→0.1.0 and
the lockfile, while unchanged main3712b63c already selects0.1.5. The exact ref
is rechecked and that superseded branch removed; PR16 preserves the original
commit. No manual change or newer source was deleted.

Source verification passes464 tests and all three specification lanes. The
single-pilot selection test also proves a second otherwise-ready consumer
remains held until its own entry is promoted. Doctor and Actionlint pass.
Fresh GET-only inventory retains19 repositories,43 owners and220 edges, with
zero gaps/cycles and a clean audit. All19 standalone Renovate configurations
validate; Notebook is the only configured pilot and no other writer is admitted.
The obsolete ref's absence is independently confirmed by a404 read-back.

This source slice does not enable scheduling or claim end-to-end completion.
Remaining gates are the deployed callback, safe exact-operation recovery,
genuine bot candidate/current CI/merge/main/Pages, correct release disposition,
completion and repeat-run proof, then the separate adoption tracker.

## Deployed pilot setup and parallel handoff

Coordinator49 merges260b817ae9bb418baec50ee9fce7647c12535d30. Its exact-main
check44114336243 and Pages44114335710 succeed. The old empty Notebook
operation215bd52c16f965b635684a10ec7e7cd1f0efec6a5a4d303927ed938f41b32a94
is recovered only through the existing controlled workflow44119443025 while
consumer writes are disabled. Durable statef32db5f0 records retry-approved with
the original run43997513897; no state is hand-edited and no unsupported target
is re-admitted.

Shared CI28 mergesd678a21e after301 source tests. Its optional reviewed direct
development override preserves exact recipe/settings binding. The actual
Notebook version command passes on a frozen released Core0.13.5 install with
Deno absent, preserving private packages and the lock graph; this is isolated
local whole-recipe proof, not a new npm publication. Its receipt remains in the
local `notebook-single-pilot-20261117` cache. Existing hosted whole-recipe
43987271519 remains separately attributed to its original source/inputs.

Notebook43 merges4484fe4440f7ae5febc947b5db9b8c1f348f32ad. Its complete main
CI44124089823, Pages44124089176 and version44124089171 succeed. The ordinary
quality lane runs the guard before merge; main versioning accepts the same
guard and correctly skips App minting/Changesets with no release intent.
CI's publication branch also skips. Callback44124857164 verifies current
completion and sends its exact-source coordinator wake-up. Restore only the
already reviewed Notebook writer and dispatch ordinary44125843709. The hourly
schedule stays off pending genuine intake and replay acceptance.

Tracker50 and16 child tasks51–66 now separate remaining repository adoption.
Each task includes graph-derived owner/upstream context, current source
inspection, shared integration, independent canonical/recipe qualification,
functional checks, publication/completion, per-entry activation and rollback.
Notes155's existing Cloudflare main failure and Desktop's explicit projection
hold remain visible; these are not new serial pilot gates. The source runbook
is `docs/repository-adoption.md`. Genuine intake, settled replay and scheduled
acceptance are still pending at this checkpoint.
