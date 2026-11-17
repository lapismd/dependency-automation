# Preserve source-owned workspace endings during native intake

Controlled recovery44129153610 succeeds and opens genuine Notebook44 at
cbc7e84d2a9ea0d4f1f267411e94e10ddac63582. Artifact14349611790 has independently
verified ZIP SHA2562e2beee285ec5f5db20764cf5af74f4a8a3b363f6e4da86324e2ee650cc6545a.
Durable generation147 at7f0ed48ebeb7500b3bdb24ed915c2a6c38abe067 retains the
old operation's retry-approved recovery and only the new Core0.13.5 admission,
52b1047c9017217cb6fcb55ed29014e6369ed96205aab2672b245a2f4ba4e756.

The native candidate contains exactly the root manifest, workspace override,
mechanical lock closure and two canonical pages. Review additionally finds
pnpm/Renovate removed one authored final blank line from the workspace file.
Its exact source-owned version-input fingerprint therefore changes from
1ee11996c7e0a434716de23b031f294b602d3c178d1bce45d0bf368a00475bd1 to
9311b2510dedb65d262eca9ac6061eeae586faca325c97abb64b18f11c23de5b. Restoring
only that source-owned newline ending returns the original expected digest.
No guard, qualification policy or consumer source fix is required.

The shared filesystem preparer now preserves the immutable workspace's final
newline sequence after all semantic, source, policy, path and ownership checks.
It retains every other candidate byte and checks all output parents before
writing. Source-managed chapter outputs and their exact native filters remain
unchanged; the workspace is already a governed native input/output path.

The exact regression command is `node --test --test-name-pattern='filesystem
preparation binds' tests/canonical-intake.test.mjs`: one failure before, zero
after. It exercises the real preparation entrypoint and frozen-install command,
preserves no-write behavior on stale source/policy, restores the authored
ending and proves repeat stability. All50 affected canonical/workspace cases,
466 full tests, three specification lanes and Actionlint pass. Fresh GET-only
inventory retains19 repositories,43 owners and220 edges, with zero gaps/cycles
and clean audit; all19 strict structural native configurations validate.

An isolated Jujutsu clone restores actual44's five files onto immutable main
4484fe44. Applying the real shared preparer changes only the workspace ending;
both canonical outputs and all other measured files remain identical. A repeat
is unchanged. Frozen registry installation succeeds with Node24.15.0 and
pnpm10.32.1; the independent Notebook intake check passes. Explicit spec-first
against4484fe44 passes with three protected inputs and both mapped chapters.
The unchanged full version guard accepts installed Core0.13.5/Changesets3.0.3
and reports `hasChangesets=false`, preserving root version0.2.4. This is local
candidate acceptance, without a remote write, publication or new release intent.

Cancellation of the obsolete head's remaining CI44130404079 is requested before
its queued quality guard runs, to avoid spending runners on a known invalid input. No
hosted guard failure or full hosted candidate success is inferred from that
cancelled run. Source deployment, normal bot regeneration and complete fresh
candidate/main/replay acceptance remain pending. Receipts stay in the local
`notebook-single-pilot-20261117` cache; the temporary clone is not a publication.
