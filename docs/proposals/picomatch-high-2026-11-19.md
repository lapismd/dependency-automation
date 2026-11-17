# Approved exact coordinator picomatch exception

**Status: explicitly approved by the operator and deployed through PR70.**
Approval recorded at `2026-11-17T18:15:39.194Z` for exactly the two bindings below, reviewed in
[PR69](https://github.com/lapismd/dependency-automation/pull/69).
`config/advisories.json` is the sole active approval authority. This decision
does not inherit the retired LOW deepmerge decision. Deployed audit admission
qualifies exactly these two paths before the already-reviewed Notebook pilot
writer is restored. Scheduling and broader rollout remain separate gates.

Fresh audit at2026-11-17T17:34:18.479Z reports HIGH
[GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) on the two
exact paths below. GitHub records no patched version; current official npm
metadata resolves picomatch `latest` to `4.0.7`, which is affected. The advisory
describes regular-expression denial of service from repeated extglobs. No
reachability exemption or absence of risk is claimed.

| Binding                  | Approved value                                                     |
| ------------------------ | ------------------------------------------------------------------ |
| Advisory                 | GHSA-fc5q-39xc-vjpf                                                |
| Severity                 | HIGH                                                               |
| Package/version/path1    | picomatch 2.3.2 at `.>renovate>@yarnpkg/core>micromatch>picomatch` |
| Package/version/path2    | picomatch 4.0.7 at `.>renovate>re2>node-gyp>tinyglobby>picomatch`  |
| Dependency-source commit | `9d657a7458e40ca84962a12c9b8e361534b3470f`                         |
| Exact lockfile SHA256    | `a3e1f05fe6a25925d61b6af7baf5316c24156a0b71319611f6e3298bbca61b8b` |
| Exclusive expiry         | 2026-11-19T00:00:00.000Z                                           |
| Earlier termination      | A known published fix, whichever occurs first                      |
| Approval time/review     | `2026-11-17T18:15:39.194Z`; reviewed proposal PR69                 |

This is the deployed Renovate 44.199.0 automation runtime, which acquires
repository-scoped GitHub App write credentials to create or merge dependency
PRs. Manifest classification as a development dependency does not make this
a development-only exposure. A malicious glob can stall the Node event loop
and automation. Current scope and job timeouts do not prove the vulnerable
calls unreachable, and are not substitutes for a fixed release.

The approved decision admits only these two exact advisory/package/version/
path/severity/source/lock identities until the stated boundary. Raw audit
still reports the HIGH; this is not a clean dependency graph. Any extra
finding/path, source or lock change, expired/future approval, unavailable or
muted audit, unknown fix evidence or known published fix remains blocking.
Existing source ownership, current-head checks, compatibility, branch rules,
package/signature/provenance and per-repository activation gates remain intact.

No Notebook or other consumer exception is included. A separate audit of the
actual Notebook candidate finds the same advisory in its development tree;
its production audit is clean. This proposal changes no consumer audit policy
or required check. Community, Nostr and Deno-only exclusions remain unchanged.

The operator explicitly approved this precise temporary scope. The policy records
the approval time and reviewed proposal PR69 on both entries. Actual audit
qualification must pass before consumer writes are restored. Keep raw HIGH
findings visible, retire approvals when fixed or stale, and never extend the
expiry or transfer this decision to new source or lock bytes.

[Issue71](https://github.com/lapismd/dependency-automation/issues/71) tracks
remediation and retirement before the fixed expiry or earlier known fix. Pilot
success cannot renew, extend or rebind this authority.
