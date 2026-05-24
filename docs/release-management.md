# Release Management

Promoting a draft to active is the moment of truth. This document defines what has to be true before that button is clickable, what happens when it is clicked, and what happens when it goes wrong.

## Promotion Preconditions

The system blocks promotion unless **all** of these are true:

1. The draft has at least 3 test cases attached.
2. A test run exists for the draft against the current test suite snapshot, completed within the last 24 hours.
3. No hard regressions are unresolved (or each has a written justification).
4. A changelog entry exists for the draft.
5. The user has confirmed the version bump (MAJOR / MINOR / PATCH) and the bump is consistent with the diff (or has been overridden with justification).
6. The actor has promote permissions for the asset.

## The Promote Action

When the promote button is clicked:

1. Re-validate all preconditions (race-condition safe).
2. Generate the release notes draft from the prompt diff, test delta, and any overrides.
3. Present the release notes to the user for review and edit.
4. On final confirmation:
   - Append an `AUDIT.PROMOTE` event to the audit log.
   - Atomically: move active → `previous`, draft → `active`.
   - Invalidate the Registry cache for this asset.
   - Snapshot the test suite as the new active version's frozen suite.
   - Emit a notification on the configured channel (Slack, webhook, etc.).
5. Confirmation returned to the user with the new active version and a one-click rollback option visible for 24 hours.

## Rollback

Rollback is a first-class operation, not an emergency hack.

- Any version in `previous` or `archived` state can be re-promoted to active.
- Rollback requires confirmation and a reason (free-text, recorded).
- After rollback, the previously-active version becomes `previous`, and the system surfaces it in the UI as "rolled back from."

## Shadow Promotion (V1+)

For production traffic, the system supports promoting a new version into "shadow" mode:

- Runtime SDK sends N% of real traffic to the shadow version while continuing to serve the active version to users.
- Outputs from shadow runs are logged, not returned to the user.
- Operator can review shadow outputs against active outputs over a configurable window before doing the real cutover.

This is V1 scope, not MVP. MVP promotes flat-cut.

## Release Notes Format

Auto-generated on promotion:

```
shadow.daily-classifier — v1.3.2 → v1.4.0 (MINOR)
Promoted by: edu@2026-05-21T14:32:00Z

Changes:
  - Prompt body: +24 words / -8 words, primarily in the multi-area handling section.
  - Variables: added optional `context_recent_areas` (default: []).
  - Model config: no change.

Test suite delta:
  - 51 cases run (previously 47).
  - 4 new cases for recent-areas tie-breaking.
  - 3 improvements: previously failing pt-BR cases now pass.
  - 0 hard regressions, 1 soft regression (acknowledged).

Soft regression acknowledged:
  - classifier-edge-case-emoji-only (similarity 0.91 → 0.83). Note from author:
    "Acceptable — phrasing change is more concise, classification still correct."

Author changelog:
  "Add optional `context_recent_areas` to improve multi-area tie-breaking.
   Refines language in the multi-area branch. No contract change."
```

The user can edit the release notes before they are saved with the version.

## Communication

On promotion, the system emits a notification to a configured channel containing:

- Asset ID, bump type, old → new version.
- Author and timestamp.
- One-line summary from the changelog.
- Link to the full release notes.
- Link to one-click rollback.

This is the operational counterpart to a deploy notification in a code pipeline.

## When Things Go Wrong

| Scenario | Recommended Action |
|---|---|
| Production error rate spikes immediately after promotion | One-click rollback. Investigate offline. |
| Soft regression turns out to be a real problem in production | Capture failing inputs, add to suite, fork new draft, fix, promote. |
| Hard regression was overridden and bit back | Rollback. Postmortem. Tighten override policy on this asset. |
| Promotion succeeded but Registry cache did not invalidate | Cache invalidation is part of the atomic promote; if it failed, the audit log will show. Manual purge available as a documented escape hatch. |

## Cadence

There is no enforced cadence. Promote when ready. The system is designed to make small, frequent promotions safe — which is the whole point. Big-bang quarterly prompt rewrites are an anti-pattern PromptOps actively discourages.
