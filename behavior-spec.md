# Behavior Specification — PromptOps

This document defines the system contract: exactly what PromptOps does, what it refuses to do, and how it behaves at every boundary. Treat it as the source of truth for any future implementation.

---

## 1. What the System Does

### 1.1 Prompt Asset Management
- Stores every prompt as a named asset with a stable ID (`<project>.<feature>.<purpose>`, e.g. `shadow.daily-classifier`).
- Each asset has an owner, a description, an input contract (variables), an output contract (expected shape), and a model configuration profile.
- Each asset has exactly one **active** version at any time. All other versions are either drafts, archived, or deprecated.

### 1.2 Versioning
- Versions follow semantic versioning (`MAJOR.MINOR.PATCH`).
- A version is immutable once promoted. Edits create a new draft.
- Each version stores: prompt body, variable contract, model config, author, created-at, parent version, and changelog entry.

### 1.3 Variables
- Variables are declared per asset with name, type (`string` / `enum` / `number` / `bool` / `object` / `array`), required flag, default value, and description.
- The runner validates inputs against the contract before any LLM call.
- Type changes are breaking (require a MAJOR version bump).

### 1.4 Test Cases
- A test case is an `(input variables, expected behavior)` pair attached to an asset.
- Expected behavior can be one of: exact match, JSON schema match, contains substring, semantic similarity threshold, custom assertion function, or LLM-judge rubric.
- Test cases are versioned independently of the prompt — a test suite snapshot is taken when a prompt version is promoted.

### 1.5 Test Runner
- Runs a given prompt version against all test cases in its suite using the asset's pinned model config.
- Deterministic by default: `temperature = 0`, `seed` pinned where supported, `N` runs per case (default 3).
- Records: raw model output, parsed output, assertion result, latency, token usage, cost.

### 1.6 Output Comparison (Diff)
- Given two version IDs (typically `active` and `draft`), produces:
  - **Prompt diff** — unified textual diff of prompt body, variable contract, and model config.
  - **Output diff** — per-test-case side-by-side comparison of outputs from both versions.
  - **Behavior diff** — pass/fail delta per test case: `PASS→PASS`, `PASS→FAIL` (regression), `FAIL→PASS` (improvement), `FAIL→FAIL` (still broken).

### 1.7 Regression Detection
- Any `PASS→FAIL` transition is flagged as a regression and blocks promotion by default.
- Soft regressions (semantic similarity drop above a configurable threshold but still passing assertions) emit warnings, not blocks.
- The user can explicitly override a hard regression block with a written justification recorded in the audit log.

### 1.8 Release / Promotion
- "Promote draft to active" is an explicit, named action requiring: green test suite (or justified override), human confirmation, and an auto-generated changelog entry.
- The previous active version is moved to `previous` state, kept queryable, and can be one-click rolled back to.
- All promotions and rollbacks are appended to the audit log with actor, timestamp, prompt diff hash, and reason.

### 1.9 Release Notes
- On promotion, the system generates structured release notes containing: version bump rationale (major/minor/patch), prompt diff summary, test suite delta, regression overrides (if any), and model config changes.

### 1.10 Audit Log
- Append-only log of every state-changing event: create asset, create version, edit draft, add/remove test case, run tests, promote, rollback, archive.
- Each entry: actor, timestamp, asset ID, version ID, event type, payload hash.
- Queryable by asset, by actor, by date range.

---

## 2. What the System Does Not Do

- Does not edit prompts automatically. No "AI rewrites your prompt" feature in MVP.
- Does not benchmark multiple models against each other. One asset = one pinned model config.
- Does not orchestrate chains, agents, or tool calls. Single prompt → single output.
- Does not store or manage end-user data. Test inputs are designer-curated, never live PII.
- Does not provide a public prompt marketplace.
- Does not auto-promote versions, even on green tests. Promotion is always human-initiated.
- Does not delete versions. Archive only. Audit log is append-only.
- Does not bypass the input contract. Invalid inputs fail before reaching the LLM.

---

## 3. How Prompt Assets Are Created

1. User registers a new asset: ID, description, owner.
2. User declares the variable contract (name, type, required, default, description).
3. User declares the output contract (free-text / JSON schema / enum / structured).
4. User pins the model config (provider, model ID, temperature, max tokens, optional system params).
5. User pastes the current production prompt as the initial version (`v0.1.0` draft or `v1.0.0` if already battle-tested).
6. User adds a minimum of 3 test cases.
7. User promotes to active.

If any step is missing, the asset stays in `unregistered` state and cannot be referenced by the runner.

---

## 4. How Versions Work

- Versions are immutable. Editing the prompt body of an active version is not permitted — it forks into a new draft.
- Draft versions can be freely edited until promoted.
- Version numbers are user-chosen but validated:
  - PATCH: prompt body changes that the test suite confirms are non-breaking.
  - MINOR: new optional variables, prompt body changes that change tone/wording without breaking outputs.
  - MAJOR: variable contract changes (new required, removed, renamed, type change), output contract changes, model config changes.
- The system suggests a version bump based on the diff. The user can override with justification.

---

## 5. How Variables Are Managed

- Declared once per asset, inherited by all versions until a MAJOR bump changes them.
- The runner validates input types and required fields before any LLM call.
- Defaults are applied if the caller omits an optional variable.
- Adding a new required variable is always a MAJOR change.
- Adding a new optional variable with a default is a MINOR change.
- Renaming a variable is a MAJOR change (no automatic alias).

---

## 6. How Test Cases Are Attached

- Each test case has: name, description, input variable bindings, expected behavior block, optional tags.
- Test cases live in a suite scoped to the asset, not to a specific version.
- When a version is promoted, the system snapshots the suite (test IDs + assertion config) so the historical run is reproducible even if the suite later changes.

---

## 7. How Prompt Diff Works

- Word-level diff for the prompt body (additions in green, deletions in red).
- Structured diff for variable contract (added/removed/changed fields).
- Structured diff for model config.
- Diff is always rendered between two specific version IDs. There is no concept of a "live diff against work in progress" — the draft must be saved first.

---

## 8. How Outputs Are Compared Between Versions

- For each test case in the snapshotted suite, the runner executes both versions and stores both outputs.
- Comparison view shows: input, version A output, version B output, assertion result for each.
- For structured outputs (JSON), the diff is field-level.
- For free-text outputs, the diff is sentence-level plus a semantic similarity score (cosine on embeddings).

---

## 9. How Regression Warnings Work

- A regression is any test case that passed on the active version and fails on the draft.
- Regressions are categorized:
  - **Hard regression**: assertion fails. Blocks promotion.
  - **Soft regression**: assertion passes but semantic similarity drops below the asset's configured threshold (default 0.85). Emits warning.
  - **Performance regression**: latency increases > 50% or cost per call increases > 30%. Emits warning.
- The promotion screen surfaces all regressions and their severity. The user must acknowledge each.

---

## 10. How Active Versions Are Promoted

- Promotion requires: all hard regressions resolved or explicitly overridden with written justification.
- Promotion is atomic: previous active becomes `previous`, draft becomes `active`, audit log entry written.
- The system supports a "shadow promote" mode for production traffic: the new version receives N% of real traffic for a configurable observation window before becoming fully active. (V1+, not MVP.)

---

## 11. How Release Notes Are Generated

- Auto-drafted on promotion. Contains:
  - Asset ID, old version, new version, bump type.
  - Prompt body diff summary (lines added / removed / changed).
  - Variable contract changes.
  - Model config changes.
  - Test suite delta: cases added, removed, status changes.
  - Regression overrides with justifications.
  - Author and promotion timestamp.
- The user can edit the draft before finalizing.

---

## 12. Edge Cases

| Case | Behavior |
|---|---|
| Test case uses a variable that no longer exists on the new version | Test case marked as `incompatible`, excluded from regression check, surfaced to user. |
| Two drafts of the same asset exist | Allowed. Each is an independent fork from the same parent. Promotion of one does not affect the other. |
| Model config change with no prompt body change | Forces at least a MINOR bump. Regression check still required. |
| Empty test suite | Promotion blocked until at least 3 cases exist. |
| Non-deterministic model (provider doesn't support seed) | Runner uses `N=5` per case and reports variance. Promotion requires variance below configured threshold. |
| Cost cap exceeded mid-run | Run halts, partial results saved, user notified. No regression conclusion drawn. |
| Provider outage during run | Test marked `inconclusive`, not `fail`. Regression check waits until rerun. |

---

## 13. Failure States

| Failure | System Response |
|---|---|
| LLM API returns 5xx | Retry with exponential backoff (3 attempts), then mark inconclusive. |
| LLM API returns 4xx (bad request) | Fail loudly. Surface raw error. No retry. |
| LLM output fails to parse as expected schema | Test case fails with `parse_error` reason. Raw output preserved. |
| Audit log write fails | Block the state-changing action. Never commit state without audit trail. |
| User attempts to promote without confirmation | Block with explicit warning. No silent promotion under any condition. |
| User attempts to edit an immutable promoted version | Block. Offer to fork into a new draft instead. |
| Concurrent edits to the same draft | Last-write-wins is not acceptable. Optimistic locking with a version etag. Conflict surfaced to user. |
