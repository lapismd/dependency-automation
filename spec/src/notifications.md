# Release notifications

The scoped channel and static-publication readers preserve DA-NOT-001/002/003:
notifications remain hints, not publication or channel authority. Independent
fresh registry, signature, source and current-CI evidence owns admission; the
existing completion payload, callbacks and credential boundary are unchanged.

Publishers call the pinned `notify.yml` reusable workflow after their verified
publication boundary. The caller supplies the exact coordinator revision and
original source SHA. Notification failures can be retried independently of
package publication.

## DA-NOT-001 — Verified source notification

**Requirement.** Publication notifications MUST validate an allowlisted source revision and discover its stable public first-party packages before dispatch.

### Acceptance details

- Source revisions MUST be 40-character commit SHAs and package versions MUST be stable semver.
- Private, unversioned and non-first-party packages MUST be excluded.
- Each notified coordinate MUST exist in npm metadata with matching name/version and integrity.
- No matching published packages MUST produce no dispatch; other registry failures MUST fail.

## DA-NOT-002 — Hint and recovery semantics

**Requirement.** `lapis-npm-published-v1` dispatches MUST be hints for registry reconciliation rather than trusted version or publication authority.

### Acceptance details

- The coordinator MUST validate the source, SHA and package payload before inventory.
- The receiver MUST rediscover current registry eligibility instead of applying payload versions directly.
- Missing notification setup MUST leave manual reconciliation and explicitly gated hourly catch-up as recovery paths.
- A failed dispatch MUST identify retrying the notification rather than replaying publication.

## Credentials and checkout wiring

The notifier uses a coordinator-scoped App token for `repository_dispatch` and
the caller's read token for source discovery. Its pinned checkout runs the
requested coordinator commit. The notification key remains encrypted in the
existing workflow secret boundary; this repository stores no key values.

The dedicated reusable `completion.yml` accepts only trusted default-branch
`workflow_run` callers. Its `lapis-dependency-completed-v1` hint contains public
repository/source coordinates and the notifying callback run/attempt identity;
it never qualifies CI by itself. Publication hints use exact public source
discovery; completion hints use public workflow and current-head metadata only,
without fetching candidate trees/files or npm metadata. Publication coordinates
are checked again against registry integrity. Full
scans coalesce by immutable registry identities regardless of arrival order.

Receivers retain only the documented source/version coordinates, discarding
unknown payload fields before writing public artifacts.

## DA-NOT-003 — Verified completion wake-up

Known, non-held consumers may continue supplying verified completion observations
while outside the writable pilot. Callback scope does not grant write admission;
the current phase, candidate and ownership gates still select every writer.
Notebook's source policy admits only its exact active CI, Pages and version
workflow IDs/paths. Registry release and callback self-triggers are not admitted;
the source-owned npm publication notification remains a separate boundary.

Docs and Tasks register only their existing CI/npm and Storybook Pages workflow
IDs/paths/events for the next adoption wave. Versioning is a job inside their CI
workflow, so no separate version workflow is invented. Registry distribution
and callback self-triggers remain excluded. Both entries stay `full`; these
read-only completion identities grant no consumer write or audit authority.

The next small-repository slice registers Spec Validator's existing Check
workflow and Visual Delta's existing CI, PR-specification, Pages and version
workflows by exact IDs, paths and supported events. The read-only App probe
adds only those two exact targets. Tag publishers, native capture, image
publishers and callback self-triggers are not completion sources; verified npm
notifications remain separate. Both repositories retain phase `full` until
their merged source acceptance and a separate per-entry activation/replay.
Spec Validator currently consumes no Lapis npm dependency; no synthetic Core
pin or version recipe is introduced to create an update. Visual Delta consumes
only the Deno-free specification tool in development and retains its existing
audit and compare-only browser gates. The operator requests a final merge pass
and gives standing approval for per-repository activation after passing source
acceptance; advisory exceptions and global full rollout are not implied.

**Requirement.** Completion callbacks MUST verify successful current non-fork source workflow evidence before minting a coordinator-scoped dispatch token.

### Acceptance details

- Trusted pinned coordinator code MUST compare the actual run ID, attempt, SHA, event and exact allowed workflow ID/path with read-only GitHub evidence; unknown, failed, stale or inaccessible coverage MUST withhold dispatch.
- The source MUST be explicitly public, and its head MUST match an open same-repository PR or the current default branch; revalidation immediately before dispatch MUST reject a moved head.
- Default-branch `workflow_run` callers MUST read or execute no candidate files, code, artifacts or caches, retain the existing notification credential boundary, and exclude their own workflow from completion triggers.
- Completion hints MUST leave all-current-head CI, repair ownership, registry discovery and merge/publication authority unchanged.

## Parallel source registration

Exact existing source workflows for Server, Agent UI, AI, Terminal, jj-store
and Plugin Registry are registered for their supported PR/push/manual events.
Unsupported workflow_call/merge_group events, callback self-triggers and nested
image/cache/native/tag/publisher entrypoints are not added. Registry’s top-level
signed deployment is its actual completion boundary, not an invented npm release.
Registration is read/dispatch authority only; each source caller must pin this
reviewed implementation and policy together and pass independent source/main
acceptance before a separate per-entry activation and durable replay.
