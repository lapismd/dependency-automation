# Server private empty-note repair

Coordinator reconciliation `44641131258` durably partitioned the earlier
Server admission and generated genuine dependency-bot PR 112 for only Notes
Workspace `0.4.9` and Design Core `0.13.6`. The candidate frozen install and
canonical dependency coordinates were correct, but exact-head Server
Specification job `135975123966` failed at the source-owned private-root guard:
the managed note incorrectly declared `@lapismd/lapis-server: patch`.

Server already had the reviewed `emptyChangeset: true` repository capability
and its source contract correctly returned no package release intent. Candidate
preparation nevertheless activated the empty convention only when a public
manifest changed. The existing Renovate retry branch also carried stale
generated bump metadata that generic deterministic-note preservation would have
retained on another attempt.

Preparation now distinguishes actual first-party runtime, optional-runtime and
peer changes from package release intent. An explicitly configured private root
selects its empty managed note for those changes while remaining excluded from
version intent, including when its ordinary Changesets policy has
`privatePackages.version` enabled. Empty-note retry removes incompatible
generated bump metadata from the deterministic bot-owned note and preserves its
body. Development-only private changes still create neither package intent nor
a forced empty note.

Focused and hosted coordinator qualification, repaired Server PR checks,
completion settlement and repeat no-duplicate evidence are recorded in the
rollout issue after they occur; this source record does not pre-claim them.
