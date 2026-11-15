# Coordinator worker audit remediation

The coordinator retains Renovate 44.199.0 and its Node24.15.0/pnpm10.34.5
runtime. This source-owned dependency repair selects upstream glob14.0.6 and
minimatch11.0.8 for vulnerable transitive ranges, with their published integrity
recorded in the frozen lockfile. It adds no package patch or audit suppression.

## Exact qualification

- Before: `pnpm audit --json` exits1, reporting one LOW and four MODERATE
  dependency instances (three unique advisory IDs).
- GHSA-3g3m-2fjr-6pw4 affects glob9 through14.0.1; patched releases start14.0.2.
  The direct Renovate and GCP/gaxios/rimraf paths now resolve14.0.6.
- GHSA-g3hv-75wg-m249 affects minimatch7 through versions below11.0.1.
  Direct Renovate and nested cleanup paths now resolve11.0.8.
- The actual installed-runtime target initially had one harness-resolution
  failure because pnpm links need canonical package paths; after correcting
  that harness, two security floors failed and two API contracts passed.
  After resolution repair all four tests pass, including the actual Renovate
  matcher and real glob/rimraf selection and bounded fixture cleanup.
- All84 coordinator tests and all three specification lanes pass on the initial
  repair source; the exact runtime target passes4/4. Frozen installation,
  generated-configuration and combined-main checks are recorded before push.
- The real patched Renovate executable completed a credential-free local-platform
  discovery/extraction/registry-lookup run. It used its glob fallback, extracted
  one allowed npm package, ignored the fixture's node_modules package, and
  selected Design Core0.13.4 from0.13.3 under the generated central restrictions.
  The first harness attempt incorrectly supplied a repositories list in local
  mode and was rejected; moving that config into local mode's supported global
  shape repaired the same runtime probe. Local mode does not publish branches/PRs.

## Remaining unapproved finding

After the repair, the exact full audit still exits1 with one LOW:
GHSA-gcqx-w48m-w2h4, deepmerge4.3.1, path `.>renovate>deepmerge`.
No patched release is declared. All MODERATE/HIGH/CRITICAL counts are zero.
This is the CI automation runtime, even though Renovate is declared as a
private workspace devDependency; it is not an application release dependency.
No exception is approved here, and the Visual Delta release exception is not
transferred. Raw audit reports remain outside tracked/public book inputs.

Hosted CI, exact approved exception policy if required, current report replay
and restoration of consumer writes remain separate rollout gates.

After rebasing onto the merged Node-tooling foundation
`468d1c91e41d88e705708346bb72e05f6c18b880`, the combined source passes all
95 tests and three specification lanes. Doctor and actionlint pass; the frozen
install reproduces the graph. The patched runner validates all19 real generated
repository configurations, retaining the existing optional native-RE2 fallback
warning. Published deepmerge latest remains4.3.1; this does not establish a fix
or authorize an exception.
