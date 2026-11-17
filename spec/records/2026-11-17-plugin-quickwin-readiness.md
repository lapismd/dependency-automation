# Small-repository adoption readiness — November 17

Docs8aa7886e and Tasks5a76dda1 have successful exact-main CI/Pages and no open
PRs. Both use Node24 and actual `node scripts/release.mjs version` with
Changesets3.0.3; whole-recipe validation and source-owned guard bindings already
exist. Their completion callers and canonical intake still require source
adoption, and neither is activated by these registrations.

The existing encrypted private-key secret name is visible in both source repos;
no value is retrieved/copied and no credential is rotated. The App-only
installation API is unavailable to the current user credential, so that response
is not labelled installation-not-found. Actual trusted callback/probe execution
must establish current installation permission separately.

Live workflow identities are Docs CI402067767 /Pages412363368 and Tasks
CI402046918 /Pages402877534. CI supports PR/push/manual and contains the version
job; Pages supports push/manual. The registry publisher and callback itself are
excluded. New observers remain outside writer scope while source phases stay
full; global phase and Notebook's hourly schedule are unchanged.

Before any source edit, exact `pnpm audit --json` on both current sources reports
one HIGH GHSA-fc5q-39xc-vjpf: picomatch4.0.7 at
`.>@changesets/cli>@changesets/config>picomatch`. Current official npm metadata
has picomatch latest4.0.7, Changesets CLI3.0.3/config4.0.1 and no known patched
release. Historical green runs precede this observation. Both required CI audit
boundaries remain blocking. Docs' policy permits exact LOW decisions only;
Tasks runs raw audits. The coordinator's approved Renovate paths do not cover
this source/version-tooling exposure and no new exception is activated.

Agent Redaction requires Deno validation and is excluded from this Node-only
pass. Spec Validator lacks the common Changesets recipe, Terminal needs native
macOS qualification, and the larger applications/multi-package repositories are
later adoption work. Prepared source work must not manufacture publication or
relax existing checks to claim a quick win.

The initial full verification catches one stale positive test fixture that
listed only the five original completion sources (465pass/1fail). Use the
authoritative source allowlist for that positive load while retaining every
outsider/held/path/event/self-loop negative. The App readiness workflow adds
only Docs and Tasks to its explicit read-only target list; its exact one-repo
token, three GETs, no checkout and no write boundary remain asserted.

After the fixture repair, all466 full tests and46 affected completion/workflow
cases pass. Spec-first catches the parallel policy chapter map; add that
chapter without changing code, then rerun all three document lanes. Both actual
production audits report zero findings; no consumer HIGH exception is inferred.

Final mapped specification validation, mdBook and spec-first pass after the
policy chapter update. Actionlint, doctor11/11, strict native configuration
validation and fresh GET-only19/43/220 inventory pass with zero coverage/cycle
gaps. Coordinator audit still qualifies only its two approved Renovate paths;
requested/effective consumer writes and state writes are disabled for this
local qualification. Source callbacks and hosted App probes remain pending.
