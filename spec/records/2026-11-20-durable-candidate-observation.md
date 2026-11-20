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
