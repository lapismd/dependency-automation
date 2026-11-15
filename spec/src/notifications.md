# Release notifications

Publishers call the pinned `notify.yml` reusable workflow after their verified
publication boundary. The caller supplies the exact coordinator revision and
original source SHA. Notification failures can be retried independently of
package publication.

## DA-NOT-001 — Verified source notification

**Requirement.** Notifications MUST validate an allowlisted source revision and discover its stable public first-party packages before dispatch.

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
- Missing notification setup MUST leave hourly catch-up as the recovery path.
- A failed dispatch MUST identify retrying the notification rather than replaying publication.

## Credentials and checkout wiring

The notifier uses a coordinator-scoped App token for `repository_dispatch` and
the caller's read token for source discovery. Its pinned checkout runs the
requested coordinator commit. The notification key remains encrypted in the
existing workflow secret boundary; this repository stores no key values.
