# Non-growing source-owned workspace chapters

Mira source03f6500c5bb44d0032c7a3ae93db75b4c04b05b6 exposes a legitimate schema2
preparation boundary: an unchanged, accurate source chapter is larger than the
renderer’s ordinary400-line/32KiB limit. The real source-owned no-op fixture
was rejected with `canonical chapter exceeds size bound` before any update.
Renderer counts for the three immutable chapters are281/538/303 lines and
22093/50765/28609 bytes. No candidate version or publication is fabricated.

The owning coordinator now carries an already oversized immutable authored
chapter only if neither its line count nor byte count increases. Ordinary
chapters retain both fixed limits; schema1 is unchanged. This adds no higher
configurable cap, output path or policy field. Exact admitted source/head,
policy bytes, prior facts, managed slots, current/manual content, manifests,
workspace/lock closure and every downstream functional/audit/release gate
remain required. A growing fact rendering still needs source-owned review.

## Regression and acceptance

The original focused suite had4 expected positive failures under the old bound.
All10 cases now pass: no-op and actual released Core0.13.4→0.13.5 preparation
with line/byte legacy inputs, rejection of growing legacy output in either
dimension, ordinary400-line/32KiB caps and rejection of authored repairs.
The real Mira no-op returns all three chapters byte-identical. The already
existing filesystem test continues to prove all validation precedes writes.

Full verification passes477 tests and all three specification lanes; workflow
syntax/pins, doctor11 and strict native Renovate config pass. The unchanged
local RE2 native fallback warning remains recorded. Fresh GET-only inventory
passes with writes/state writes disabled. No dependency, lock, advisory, phase
or activation changes accompany this source fix.

## Local infrastructure failure and recovery

The first full attempt had25 setup failures after `/tmp` exhausted its inode
limit, including an exact mkdtemp ENOSPC at the App owner-map regression.
That exact target passes after selecting a task-owned disk-backed TMPDIR,
and the complete477 suite then passes unfiltered. No assertion, timeout,
parallelism setting, product behavior or visual baseline was changed to
accommodate the infrastructure failure. Only verified inactive generated
package trees were cleaned; active jobs, caches and source records remain.
