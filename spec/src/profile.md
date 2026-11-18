# Organization profile refresh

This is the coordinator's qualified generated-PR writer. The source-owned
`.github` script generates npm-status Markdown without App credentials. A
separate coordinator job accepts only the generated README artifact from that
same workflow run and publishes a narrowly checked rolling PR.

## DA-PR-001 — Isolated generation and publication

**Requirement.** Profile generation MUST execute without App secrets, and publication MUST run only trusted coordinator code against the same run's candidate artifact.

### Acceptance details

- Both jobs MUST run only from main; scheduled generation MUST require its explicit rollout variable.
- Checkout credentials MUST NOT persist.
- Only the publication job MAY mint an App token, scoped to `.github` contents and PR writes.
- Publication MUST NOT execute generator code or artifact-provided scripts.

## DA-PR-002 — Exact allowed diff

**Requirement.** Profile publication MUST accept only configured npm-status cell changes for the exact current source revision.

### Acceptance details

- Non-table text, repository/build cells, package order/count and unconfigured cells MUST remain unchanged except permitted table padding.
- Status cells MUST match the generated package/version grammar; size, line count and duplicate/missing rows MUST be checked.
- Source changes before validation or final publication MUST stop the write and require regeneration.

## DA-PR-003 — Rolling branch and repair safety

**Requirement.** The profile writer MUST preserve branch history and manual repairs while deduplicating already pending candidates.

### Acceptance details

- Open rolling reviews MUST belong to the expected repository and known bot; unexpected files or manual commits MUST stop automation.
- Updates MUST use fast-forward-only ref writes and retain the previous branch head as a parent.
- An identical App-owned candidate already based on current main MUST perform no writes.
- A retained branch without an open PR MUST match an exactly merged bot review before reuse.

## DA-PR-004 — Handover and uncertain writes

**Requirement.** Legacy profile PR creator handover MUST occur only after validated branch publication, and uncertain writes MUST require reconciliation instead of blind retries.

### Acceptance details

- The one-time legacy bot PR MAY close only after validation and branch update, then be replaced by an App-created PR.
- Ordinary candidate CI and repository merge policy MUST remain required.
- An orphaned branch after an uncertain PR write MUST stop automatic overwrite.
- API failures MUST avoid response-body or credential logging.

## DA-PR-005 — Profile review context

**Requirement.** A legitimate changed profile candidate MUST describe its bounded public npm-cell changes, exact source/candidate revisions, validation boundary and real review/recovery links in a managed PR-body section.

### Acceptance details

- Context MUST distinguish completed source/diff validation from ordinary candidate CI and maintainer review; it MUST NOT imply publication authority or completed candidate checks.
- Rolling updates MUST preserve maintainer text outside the managed section and reject ambiguous markers before writes; the exact legacy generated description MAY be upgraded.
- An identical pending or unchanged candidate MUST retain its GET-only no-op behavior, including when its description predates the managed section.
- Only existing manual workflow/review links MAY be offered; no refresh checkbox MAY appear without an implemented backend.

## Scheduling and merge boundary

The scheduler is hourly with manual recovery. It does not automatically merge
the profile PR, approve reviews or change branch protection.

DA-WAVE-009 changes only dependency-PR context. Organization profile generation,
its managed message, native diff preservation, confirmation and source-bound
writer contract remain unchanged; scoped dependency authority cannot trigger a
profile refresh or authorize another publication.
