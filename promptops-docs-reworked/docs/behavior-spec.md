# Behavior Specification — PromptOps

## System identity

PromptOps is a prompt asset registry and rendering service. It stores prompt templates and versions. It does not execute prompts against an LLM.

## Core concepts

### Asset

An asset is a stable prompt identity such as `shadow.daily-report`. It represents the business or product purpose of a prompt, not a single text body.

An asset contains a stable ID, owner, description, tags, lifecycle state, active version reference, variable contract, model config metadata, output contract metadata, and timestamps.

### Version

A version is a specific prompt body attached to an asset. Versions are created as drafts and can be promoted, archived, or superseded. A version stores prompt body, contract snapshots, changelog, author, ETag, body hash, created timestamp, and promoted timestamp.

### Render

A render is deterministic template substitution. The service replaces `{{variables}}` in the system and user prompt templates with provided input values.

A render returns rendered system prompt, rendered user prompt, inputs used, rendered hash, unresolved variables, and unused inputs.

### Audit event

An audit event records important system activity such as asset creation, version creation, promotion, rendering, rollback, or archive actions.

## Lifecycle rules

### Asset lifecycle

| State | Meaning |
|---|---|
| `unregistered` | Known or planned prompt asset, not yet ready for production use. |
| `active` | Valid prompt asset that can have an active version. |
| `deprecated` | Still available but should not be used for new integrations. |
| `sunset` | Retired asset, kept for historical reference. |

### Version lifecycle

| State | Meaning |
|---|---|
| `draft` | Created but not active. Safe to edit or review depending on implementation policy. |
| `active` | Current production-ready version for the asset. |
| `previous` | Former active version kept for rollback or historical reference. |
| `archived` | Retired version that should not be promoted or rendered by normal workflows. |

## Expected behavior

### Asset creation

- Asset ID must be stable and dot-namespaced.
- Asset ID cannot be changed later.
- Owner should be recorded.
- Lifecycle defaults to `active` unless provided otherwise.
- Contracts can be empty, but production prompts should have explicit contracts.

### Asset update

- Description, tags, lifecycle, and contracts may change.
- Asset ID must not change.
- Owner should not change through normal metadata updates.
- Updating asset-level contracts does not rewrite old version snapshots.

### Version creation

- Version starts as `draft`.
- Version must include a semver string.
- Version must include a prompt body with at least a `user` template.
- Contract snapshots should be copied from the current asset contract at the moment of version creation.
- Version should receive a body hash for integrity and reproducibility.

### Promotion

- Promoted version becomes `active`.
- Previous active version becomes `previous`.
- Asset `active_version_id` points to the promoted version.
- Promotion timestamp is recorded.
- Audit event is created.

### Archive

- Archived version becomes `archived`.
- Archived versions should be excluded from normal active retrieval flows.
- Archiving an active version should be blocked or require a replacement active version first.

### Rollback

- Rollback request must include a justification.
- Previous active version becomes active again.
- Current active version moves to historical state according to implementation rules.
- Rollback audit event is created.

### Rendering

- Service performs template substitution only.
- No LLM call is made.
- Variables use `{{variable_name}}` syntax.
- Missing variables remain detectable as unresolved variables.
- Input keys not referenced by the template are returned as unused inputs.
- Rendered hash proves exactly what text was produced.
- If `save: true`, render should be persisted through audit or render records.

## Validation behavior

PromptOps should validate required fields, lifecycle values, version states, variable contract shape, enum values, required variables during rendering, and semver format.

## Error behavior

Recommended error envelope:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required variable: language",
    "details": {
      "variable": "language"
    }
  }
}
```

Recommended error codes: `ASSET_NOT_FOUND`, `VERSION_NOT_FOUND`, `NO_ACTIVE_VERSION`, `VALIDATION_ERROR`, `INVALID_STATE_TRANSITION`, `CONFLICT`, `UNAUTHORIZED`.

## Explicit non-behavior

PromptOps must not call model providers, judge output quality, generate completions, auto-improve prompts, create synthetic datasets, run red-team attacks, or choose the best prompt variant. Those responsibilities belong to a separate AI Evaluation system.
