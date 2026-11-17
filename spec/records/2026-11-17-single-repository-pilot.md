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
