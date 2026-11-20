# Server reviewed-channel retry recovery

Coordinator reconciliation `44641131258` generated Server dependency-bot PR
112 for reviewed Notes Workspace `0.4.9` and latest Design Core `0.13.6`.
The candidate was bot-owned, based on current Server source and carried both
exact manifest/lock targets, but its first head failed the Server-owned empty
release-intent guard.

After the guard repair merged, reconciliation `44644170656` retained the old
operation as uncertain and skipped the writer. Candidate observation had checked
both resolved targets only against the raw `latest` pool even though ordinary
admission correctly selected Workspace `0.4.9` from the exact reviewed `next`
channel projection. Workspace therefore appeared unavailable despite its
verified publication, immutable channel identity and exact Server runtime scope.

Retry observation now uses the same exact repository, path and dependency-type
channel projection as admission. It still requires the owned branch family,
exact candidate/head identity, public source, valid manifest range and matching
lock target. Stale policy and out-of-scope channel evidence remain rejected.
A failed PR may establish that the earlier writer created the owned branch, but
does not qualify that head for merge or waive refreshed current-head CI.

Hosted coordinator qualification, repaired Server head, merge, completion
settlement and repeat no-duplicate evidence are recorded in rollout issue 58
after they occur; this source record does not pre-claim them.
