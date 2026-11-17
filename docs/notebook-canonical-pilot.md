# Notebook canonical development pilot

## Current preparation boundary — November 17

The bounded Core intake and Node version guard are already deployed. After
upstream publications complete, Notebook's unchanged source policy still admits
only its single compatible Core development patch. It does not authorize an
API/UI migration or arbitrary other development updates.

Normal wave admission now checks this source capability before adding a consumer
writer. The exact hosted generation83 replay previously admitted nine unsupported
updates and generated three artifact-error PRs; the repaired replay retains all
nine as visible holds and admits none, while preserving Notes' seven updates.
The supported Core patch and ordinary repositories without an opt-in remain
covered by positive controls. Candidate frozen-install/canonical validation and
all other source/ownership/publication gates remain required.

This fixes admission to the existing bounded pilot. Generic preparation and
Notebook's product/API compatibility upgrade remain separate source-owned work.
Deploy and inspect normal reconciliation before closing unsupported bot-created
PRs40–42; preserve their evidence and any manually repaired branches.

## Earlier pilot admission and qualification

This source slice adds only Notebook to the existing pilot entries. It does not
change hosted variables, global rollout phase, scheduling, publisher contracts,
package exclusions or service/Deno boundaries. The tracker commit beneath this
slice remains independent review evidence. Deployment and normal bot acceptance
are pending source review.

The read-only deployed-policy observation found one compatible root development
update, Core `0.13.3` to `0.13.4`, with no package release intent. Six unrelated
Notes/Plugins waits shared `package.json`; a phase-only change remained blocked.
DA-WAVE-007 permits that single source-opted-in development target independently,
while retaining each wait and every other gate. It cannot advance the selected
dependency through its own upstream wait or group another discovered update.

## Source boundary

The source policy bytes and their digest must agree at the immutable current
consumer revision. Development selection, workspace and lock overrides, locked
integrity and all active peer contracts must qualify under the existing profile.
Runtime/optional coupling, other development importers, catalogs and ambiguous
override selectors hold. Candidate preparation still checks the complete frozen
install, exact inputs, mechanical peer-context closure and unambiguous managed
slots before writing either canonical page or a PR.

Only the source policy's two chapter paths join the ordinary managed Changeset
filter. The consumer's existing offline guard remains a normal functional check
outside PR specification exemptions. No new consumer command is executed.

## Operator acceptance after source review

1. Obtain fresh read-only inventory on the deployed source. Confirm Notebook's
   current default-branch revision and complete CI, unchanged source policy,
   sole compatible Core development target, no release intent and all six
   unrelated waits still visible. Any new target or hold requires review.
2. Keep the existing pilot settings and scheduling decision. Let one ordinary
   trusted manual or genuine completion/publication reconciliation use normal
   durable CAS admission, repository-scoped App authority and fresh ownership
   revalidation; do not force a branch or fabricate a completion event.
3. Inspect the existing rolling PR's new head. It must retain only the permitted
   manifest/override/lock closure and two canonical slots, preserving authored
   content and existing release intent. Its old head and old green checks grant
   no merge authority; the separate retained compatibility branch stays held.
4. Require the new head's entire current functional, audit, package and browser
   graph, the owning offline canonical guard and explicit main-range spec-first
   comparison. Do not infer publication or create a package bump for this
   development-only change.

Rollback is a reviewed source change returning only Notebook to `phase: full`;
keep pending operations and every manual repair intact. An uncertain write uses
the existing exact operation/state recovery procedure after authoritative
read-back, never an unqualified rerun or forced push. Raw live graph/state reports
remain ignored operational artifacts rather than book content or committed data.
