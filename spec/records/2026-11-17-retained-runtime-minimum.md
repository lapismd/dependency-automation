# Retained runtime minimum after an incidental lock update

## Reproduction and source ownership

The coordinator owns derived dependency/release planning. A retained Profile
intent requires Core minimum0.13.4. Notes source4d9e01e6 declares^0.13.3 and
locks0.13.3; source92f1cdbf still declares^0.13.3 but locks0.13.4. Dependency
PR146 raised five runtime package ranges plus two root development ranges, but
not this Core minimum. Profile0.2.4 is genuinely published and verified; its
public dependency contract still admits Core0.13.3.

The ordinary planner skips every dependency whose lock has reached the eligible
target. That incorrectly makes the retained manifest minimum unactionable while
the independent publication-floor gate correctly refuses retirement. A new
minimum repair must update the source manifest and carry normal release intent;
no state hand-edit, floor relaxation, fake release or republish is authorized.

## Implemented boundary

Only an existing waiting release for the same public package/repository and exact
runtime or optional-runtime dependency target may retain the repair. The target
must still be currently eligible and equal the installed lock. A direct simple
caret/tilde range must admit that target but start below it. Preserve its operator
and propose the existing required target through the ordinary writer.

Missing/settled/other-owner intent, changed required target, private packages,
development/peer fields, catalogs, compound/custom ranges and a newer installed
version cannot invent this repair. Complete source qualification, branch
ownership, phase/exclusion/cycle gates, frozen candidate installation and genuine
newer publication with the intended minimum remain required. No channel,
repository, advisory, credential, schedule or phase authority changes.

Both operation-completion paths now require the retained manifest minimum as
well as its lock target. An unobserved admitted repair cannot become accepted
from an unrelated main commit or be retried blindly. Once the intended manifest
is observed on newer main, ordinary operation completion is permitted. Retained
publication channel/provenance diagnostics stay visible during an actionable
repair; newly planned intents retain their previous diagnostic behavior.

## Source evidence

Before editing, fourteen narrow cases report twelve passes and two failures:
missing actionable minimum and no native Renovate target. They pass after the
planner change. An added operation/CAS regression initially fails17/18; both
completion paths are corrected without changing state schemas or identity keys.
Twenty final regression cases cover caret/tilde and optional runtime targets,
negative scope/lock/ownership/CI cases, unchanged publication floors and replay.
Native Renovate's current-version resolver, version filter, range generator and
package rules prove the same target remains actionable despite the newer lock.
A green old-range candidate still cannot auto-merge; a repaired candidate needs
its own complete current-head qualification.

Expanded native/wave/channel/publisher/canonical admission tests pass154 cases.
The first full run reports430 pass/one failure: overly broad publication
visibility also added a diagnostic to a newly created Notebook intent. Narrow
that behavior to previously retained intents; preserve the existing canonical
admission assertion and every unsupported Notebook hold. Final full verification
passes431 tests and all three specification lanes; Actionlint passes. Doctor
passes11/11, QMD semantic discovery succeeds and0.2.1 remains the latest
Deno-free specification validator.

## Fresh read-only acceptance

A fresh GET-only inventory retains19 public repositories,43 owners,220 edges and
zero coverage gaps/cycles/audit findings. Replan its actual observations with the
final planner source SHA256
`e3e6c78e74c60d4084e056ca60961a722dd56b827293e365c53d9b39b764b7f7`.
Exactly one Notes update is admitted: Profile's Core manifest^0.13.3→^0.13.4,
with lock/current/target all0.13.4 and normal Profile release intent. The existing
Profile publication wait remains open. Repeated dry planning retains identical
release objects and operation IDs; no consumer/state write occurs.

Validate19 ordinary native Renovate configurations plus the actual admitted
Notes wave configuration. The optional native RE2 module uses its existing
fallback; no dependency/runtime adjustment is made for that warning. Qualification
receipts remain outside source under
`~/.cache/coordinator-runtime-minimum-20261117/`.

Hosted deployment, native candidate generation, source-owned canonical evidence,
owner qualification, genuine release and post-publication retirement/replay are
still required. This source slice does not complete S3 or S6 or enable full rollout.
