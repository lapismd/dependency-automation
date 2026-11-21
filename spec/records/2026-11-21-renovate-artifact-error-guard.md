# Renovate artifact-error result guard

Coordinator run
[44852972396](https://github.com/lapismd/dependency-automation/actions/runs/44852972396)
created Plugins pull request
[#172](https://github.com/lapismd/lapis-plugins/pull/172), then emitted a
nonempty native `artifactErrors` event because canonical intake rejected
unadmitted first-party package metadata. Renovate retained the native pull
request warning but finished with repository result `done` and process exit 0.
The coordinator therefore appeared successful even though the candidate lacked
its required Changeset and canonical specification outputs. Plugins functional
CI independently failed that incomplete head.

DA-REC-004 now treats the nonempty native event as a terminal coordinator
result, independently of Renovate's later repository summary. The runner still
forwards the complete native log and warning; it records only the bounded
repository identity and `artifact-errors` classification in its final error.
Empty artifact arrays, ordinary log rows and successful repository summaries
remain non-failures. The exact regression failed 1 of 2 cases before the guard
and passed 2 of 2 after it. The existing workflow wiring test continues to prove
that every writable reconciliation invokes Renovate only through this guarded
runner.

This result guard does not admit the rejected Plugins metadata transition,
rewrite its branch or waive consumer CI. That source-owned prerequisite and a
fresh exact-head candidate remain independently required before merge.
