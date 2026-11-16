# Adopt completion wake-ups

The coordinator accepts publication hints today. The shared completion source
adds verified wake-ups; actual source callers must be reviewed and merged
separately. It grants no merge, release, signing, deployment or settings authority.
A successful relevant workflow wakes a full authoritative scan even when another
lane is still running. The final successful lane supplies the next wake-up.
Failures retain their existing qualification holds.

GitHub runs `workflow_run` workflows from the default branch and gives them
privileged access. Follow its [event contract](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run)
and [security guidance](https://docs.github.com/en/actions/reference/security/secure-use):
execute only reviewed pinned coordinator code; never check out candidate code,
download artifacts or restore candidate caches into this notification boundary.

## Notes pilot caller

After the shared coordinator source is reviewed and merged, replace both
`REVIEWED_COORDINATOR_COMMIT` occurrences below with its exact 40-character
commit SHA. Add `.github/workflows/dependency-completed.yml` in Notes with its
own mapped specification/verification and parsed workflow regression. Preserve
existing publication notifications and every functional CI job.

```yaml
name: Notify dependency completion
on:
  workflow_run:
    workflows:
      - Lapis CI
      - Publish Storybook Pages
      - Publish PWA to Cloudflare
      - Release
      - Publish verified dependency image
    types: [completed]
permissions:
  contents: read
  actions: read
  pull-requests: read
jobs:
  notify:
    if: github.event.workflow_run.conclusion == 'success'
    uses: lapismd/dependency-automation/.github/workflows/completion.yml@REVIEWED_COORDINATOR_COMMIT
    with:
      automation-ref: REVIEWED_COORDINATOR_COMMIT
    secrets:
      app-private-key: ${{ secrets.LAPIS_DEPENDENCY_APP_PRIVATE_KEY }}
```

Use only the explicitly named secret; do not inherit unrelated secrets. The
existing App is scoped only to coordinator dispatch after source evidence
qualifies. Its source `GITHUB_TOKEN` remains read-only for contents, Actions and
PR metadata. The script verifies actual workflow IDs and exact paths against
`config/completions.json`, plus run ID/attempt/status/SHA and current public
same-repository head. It repeats verification immediately before dispatch.

Do not add a concurrency cancellation group: each independent successful lane
must retain its wake-up. Do not include `Notify dependency completion` or the
reusable workflow's name in `workflows`; their own completion cannot recurse.
No `push` or PR trigger is added to this notification workflow.

## Mira, Core and Plugins follow-up

Use the same file/job/permissions and reviewed pin, replacing only `workflows`:

| Source  | Exact workflow names                                                                                        |
| ------- | ----------------------------------------------------------------------------------------------------------- |
| Mira    | `Mira CI`, `Publish Storybook to GitHub Pages`, `Release public packages`, `Verify existing public release` |
| Core    | `CI`, `Publish Storybook to GitHub Pages`, `Release public packages`                                        |
| Plugins | `CI`, `Publish verified dependency image`, `Publish approved plugin releases`, `Version packages`           |

These are current public workflow identities verified through GitHub's API.
The policy binds each name's actual ID/path and permitted event types; source
renames/recreation require review rather than silently broadening matching.
The Nostr publisher is excluded. Coordinate Plugins source ownership before
adoption; no Plugins files are changed by the shared source slice.

## Qualification and recovery

1. Merge the reviewed shared source and source-owned callback. Let a genuine
   current PR or default-branch validation finish; do not invent a version bump.
2. Inspect the callback's pre-App result, exact source run/attempt/SHA and its
   coordinator dispatch. Forks, stale heads/attempts, failures and unknown
   coverage must skip before App minting. A head moving after that check must
   prevent dispatch at the final revalidation.
3. Inspect reconciliation's completion settlement and full inventory. Settlement
   verifies the callback run and its exact check suite, including delayed check
   API completion; unknown/incomplete coverage fails closed. Its
   source graph must still use current default branches. Other current lanes
   and manually repaired branches remain holds; no early platform automerge is
   enabled. Verify the exact final candidate receives only its normal merge
   authority once all current evidence qualifies.
4. Replay by rerunning only the notification callback where appropriate. Hints
   remain idempotent scans, with durable operation/registry deduplication. An
   older attempt's hint may fail closed after a newer callback rerun; inspect
   the new run then dispatch ordinary manual reconciliation if needed.
5. If callback settlement fails/times out, inspect that callback. Once its state
   is understood, dispatch ordinary manual reconciliation. Do not rerun source
   publication or retry an uncertain consumer write blindly.

Remove/disable the source callback to roll back event adoption. Existing
publication notifications, manual scans, scheduled recovery gate, wave/flat
rollback and all consumer protections remain available. No setting is enabled
by merging either source PR.

Shared-source review also exercises the actual notifier entrypoint: completion
verification and its final dispatcher read only GitHub workflow/current-head
metadata. They do not run publication discovery, read candidate trees/blobs/files,
or query npm. The actual CLI regression initially rejected an unexpected
candidate-tree request; after isolating discovery to the publication branch it
passes with one exact coordinator dispatch and no candidate or registry reads.
The source-read and coordinator-write credentials stay distinct.
