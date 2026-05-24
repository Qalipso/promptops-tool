# Prompt Lifecycle

How a prompt moves from "someone had an idea in Slack" to "running in production with a regression net underneath it."

## States

| State | Meaning | Mutability |
|---|---|---|
| `draft` | Work in progress. Editable. Not callable from production runtime. | Mutable |
| `active` | The version that the runtime SDK serves. Exactly one per asset. | Immutable |
| `previous` | The version that was active before the current one. Used for one-click rollback. | Immutable |
| `archived` | Older versions kept for audit but not promotable. | Immutable |

## Transitions

```
            ┌──────────┐
            │  draft   │ ──── edit prompt body ──┐
            └────┬─────┘                          │
                 │                                ▼
                 │ run tests + review diff   (loop until ready)
                 │
                 ▼
            ┌──────────┐    promote    ┌──────────┐
            │  draft   │ ─────────────►│  active  │
            └──────────┘                └────┬─────┘
                                             │
                          new draft promoted │
                                             ▼
                                       ┌──────────┐
                                       │ previous │
                                       └────┬─────┘
                                            │ next promotion
                                            ▼
                                       ┌──────────┐
                                       │ archived │
                                       └──────────┘
```

## The Standard Iteration Loop

1. **Fork** — Engineer opens the active version and creates a draft. The system auto-suggests a version number based on the planned change scope.
2. **Edit** — Engineer modifies prompt body, variable contract, or model config in the draft. Each save is a checkpoint within the draft (not a new version).
3. **Run tests** — Engineer triggers the test suite. The runner executes the draft against every snapshotted test case.
4. **Review diff** — Engineer reviews the prompt diff and the output diff side-by-side against the current active version.
5. **Handle regressions** — Any `PASS→FAIL` transition is surfaced. Engineer either fixes the prompt or justifies the override.
6. **Promote** — Engineer clicks promote. The system performs the atomic transition, writes the audit entry, drafts the release notes.
7. **Observe** — Production traffic now hits the new version. Cost, latency, and error rates are tracked. If something goes wrong, rollback is one click.

## Entry Paths

A prompt can enter the system three ways:

- **Greenfield** — New asset, new variable contract, new test suite. Engineer writes everything from scratch.
- **Import from production** — An existing prompt is already running in production, untracked. Engineer registers the asset, pastes the current body as `v1.0.0`, and backfills test cases from real captured inputs.
- **Fork from another asset** — Copy an existing asset as the starting point for a new one (different feature, similar shape). Version history does not carry over.

## Exit Paths

A prompt asset exits active management three ways:

- **Deprecated** — The feature that used it is gone. Asset is marked deprecated. Runtime calls to it fail loudly with a deprecation error.
- **Replaced** — A new asset supersedes it. Deprecation notice points to the replacement.
- **Sunset** — Asset and all its versions move to cold storage. Still queryable for audit but invisible in the UI.

## Anti-Patterns

- **Editing the active version directly.** Not possible. The system forks into a draft. If a teammate did this in another tool, the right move is import-from-production into a new draft.
- **Promoting without running tests.** Blocked. The promote button is disabled until a test run exists for the draft against the current snapshot.
- **Letting drafts pile up.** Drafts older than 30 days surface a stale warning. They are not auto-deleted, but the dashboard nags.
- **Sharing prompts across assets via copy-paste.** If two prompts share text, that's a sign of a missing abstraction. Versioning collapses if the "same" prompt has multiple identities.
