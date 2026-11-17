# Structured Operations attention evidence

The public coordinator report previously retained concrete holds, waits,
qualification and ownership evidence, but Operations consumers had to infer a
single compact reason from unrelated arrays or a flattened operation string.
The live generation therefore exposed real causes while the compact UI reduced
ordinary held rows to `Explicit hold`.

Wave planning now derives a bounded optional `attention` projection from those
same authoritative fields. Entries classify rollout, branch reconciliation,
publication, source preparation, qualification, policy exclusion, product
constraint and residual holds; each includes concise detail, remediation and
only public repository, source, branch, package or manifest coordinates. The
projection is presentation evidence only: it cannot authorize a coordinator or
GitHub command, clear a hold, change rollout phase, publish a package or replace
the underlying report fields.

The exact regression initially failed because `src/wave-attention.mjs` did not
exist. After implementation,
`node --test tests/attention.test.mjs tests/waves.test.mjs` passes 30/30 under
Node 24.10.0, including structured registry, branch, rollout, exclusion and
qualification cases plus the existing wave-admission suite. The same attention
regressions and the canonical specification lanes pass under the required Node
24.15.0 runtime. `actionlint`, Renovate configuration validation, the read-only
registry inventory and `spec-validator doctor` also complete successfully.
The complete local verifier reaches existing native/publication/canonical
fixture lanes that intentionally require Linux x64 and qualified Linux tools;
those unchanged platform gates remain for hosted CI rather than being weakened
for macOS.
