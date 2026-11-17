# Retain the governed workspace through native artifact collection

Normal44134079685 succeeds on deployed source8d9c6aca and regenerates Notebook44
to422e3cab93c42c867ff49ba6fe2f7c8c9ffecabc. The native rebase checkbox is consumed.
Artifact14351217855 has verified ZIP SHA256
f9cdd866b115ce662659b0a6bad1f525edb8eacb3bb5421209fb39d40e5a6e3a and admits
only Notebook's Core0.13.5 development target at generation148, without release
intent. This is successful regeneration, not successful candidate qualification.

The remote workspace still lacks the authored final blank line. Actual CI
44135375420 fails its quality guard with `Version workspace policy changed;
requalify in its owning source`. The root failure is one exact byte-binding
failure; a dependent aggregate check cannot grant merge authority. Source68's
local filesystem test was incomplete: native Renovate retains post-upgrade
changes only through its configured artifact filters. The workspace repair was
not in that filter, so the original native package-file bytes survived into
the commit. No after-hook serialization or consumer guard relaxation is needed.

The source fix adds exact `pnpm-workspace.yaml` only for canonical opt-ins,
alongside their exact reviewed chapter paths. Ordinary sources retain only
their deterministic Changeset filter. Existing workspace semantic/scope checks,
immutable policy, output-parent verification, candidate ownership and every
functional/version gate remain unchanged. No broad manifest/source/specification
wildcard or new consumer source change is introduced.

The exact command is `node --test --test-name-pattern='native Renovate
post-upgrade filters|filesystem preparation binds' tests/canonical-intake.test.mjs`.
It fails twice before the filter fix and passes both cases afterward. The
expanded fixture executes Renovate44.199.0's actual post-upgrade collector and
commit selector in an isolated process, with only Git status, command transport
and remote SCM replaced by controlled ports. It still executes the real trusted
preparation command. The test proves the final commit payload retains the
source ending, both canonical outputs remain selected and unrelated source
paths remain excluded. Ordinary-source output filters stay exact.

All54 affected preparation/runtime cases and all466 full tests pass, along with
three specification lanes and Actionlint. Existing exact schema1/schema2
filter expectations gain only the governed workspace path; stale failed PRs
still cannot auto-merge. No assertion is replaced with a broader match. The
fresh read-only/configuration qualification is recorded before source handoff.

That fresh audit now denies admission on two HIGH picomatch paths for
GHSA-fc5q-39xc-vjpf. Official advisory metadata records no patched version and
npm latest remains4.0.7. This is newly observed advisory drift on unchanged
dependency bytes, not a dependency update in this preparation change or an inherited exception.
Writes are placed off and scheduling stays off; the active approval list remains
empty. A disabled exact proposal is prepared for operator review. No writable
pilot regeneration can proceed while this separate security gate is denied.

Actual candidate422e3cab is also run through that native collector/commit path
in the isolated Notebook clone, using a real frozen registry install. All five
final files match the previously qualified repaired fixture. The unchanged
workspace fingerprint is1ee11996c7e0a434716de23b031f294b602d3c178d1bce45d0bf368a00475bd1.
Independent Notebook intake, explicit main-range spec-first over three protected
inputs/two chapters and the full unchanged version guard pass. Root version stays
0.2.4, Core is0.13.5 and actual intent detection remains false. No remote write,
new release, consumer qualification rebind or advisory change occurs in this
local proof.

Source deployment, another ordinary native regeneration and complete fresh
candidate/main/completion/replay acceptance remain pending. Live scheduling is
still off; its separately prepared checkpoint is not deployed. Operational
receipts remain in the local `notebook-single-pilot-20261117` cache, including
`native-artifact-actual/receipt.json` and the retained remote quality log.
