# Desktop private archive hold wording

Owners: DA-POL-001 and DA-NOT-004.

## Observed state

The public Notes package tags were rechecked after promotion:

- `@lapis-notes/api` exposes only `latest` at `0.6.11`.
- `@lapis-notes/app-profile` exposes only `latest` at `0.2.8`.
- `@lapis-notes/ui` exposes only `latest` at `0.2.8`.
- `@lapis-notes/workspace` exposes only `latest` at `0.4.10`.

Desktop `main` at `5f7c785af2856c5738a9552bdd91620614817efb`
declares the corresponding portable ranges `^0.6.9`, `^0.2.6`, `^0.2.5` and
`^0.4.6`. The previous hold text still named private Profile/API `0.2.3`, so
the dashboard could imply that the repaired npm tags were still the blocker.

The independent boundary remains real. Desktop source preparation builds
first-party sibling archives, including `@lapismd/ai`; that package returns
registry `E404` to an unauthenticated public npm read. Registry-only automation
therefore cannot safely prepare and qualify the complete private runtime.

## Decision

The repository policy retains Desktop at phase `full`, retains a nonempty
dependency-write hold and retains the held metadata observer. Only the wording
changes: it now describes the private archive/source-qualification boundary
without pinning the explanation to a transient public package version.

This change does not admit dependency writes, publish a package, grant private
registry access, remove a completion hold or widen any workflow authority.

## Verification

- The held-observer regression requires the exact durable hold text and passes
  5/5.
- Formatting, repository policy/syntax/workflow-pin checks, specification
  validation/build/spec-first, doctor, semantic QMD search, Actionlint and the
  read-only 19-repository inventory pass. Inventory reports the same Desktop
  hold and only `@lapismd/ai` as an unpublished registry dependency.
- The complete local Node `24.15.0` test run reaches 13 existing host-only
  failures: six Linux-native frozen artifact cases reject the macOS target and
  seven publication cases cannot load the pinned external verifier. Hosted
  Linux CI owns qualification of those unchanged lanes.
- A fresh coordinator reconciliation must publish the new explanation before
  Maintenance can display it.
