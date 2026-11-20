# Durable rolling-candidate observation repair

Server's first ordinary replay after the reviewed-channel repair observed the
bot-owned failed dependency pull request and admitted a newer operation. The
writer then updated that same rolling pull request in place. A later inventory
could no longer reconstruct the older candidate target set from the new head,
so the older operation became uncertain again and held the newer Server work.

DA-WAVE-002 now records the older operation as `observed-on-branch` in the
candidate state before the newer writer is allowed to run. That terminal receipt
is created only by the existing exact repository/path/dependency-type channel,
ownership and candidate-head checks. It does not qualify the candidate for merge
or bypass fresh current-head CI.

The focused regression starts with an older scoped-channel operation, proves the
owned failed candidate, then replaces the rolling candidate with the newer
operation's targets. The next plan remains admitted because the durable receipt
survives replacement. A stale channel policy remains uncertain and writes no
receipt.

The first hosted replay found that Server's rolling pull request had already
been rewritten before this receipt existed. Its durable state nevertheless
contains the later admitted writer operation and strictly later run identity.
Because the planner cannot assign that successor run while the earlier operation
is unobserved, the successor is an exact stored proof of the missing observation.
The migration records the same `observed-on-branch` outcome only from that
same-repository successor-run invariant; planned or held operations without a
writer run do not qualify.
