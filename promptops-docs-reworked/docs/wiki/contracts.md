# Wiki — Prompt Contracts

Prompt contracts make prompt templates safer, easier to render, and easier to evaluate.

## Contract types

| Contract | Purpose |
|---|---|
| Variable contract | Describes required template inputs. |
| Model config | Describes recommended model settings for downstream users. |
| Output contract | Describes the expected output shape or format. |

Important: `model_config` is metadata only. PromptOps does not call the model.

## Variable contract

```json
[
  {
    "name": "journal_entries",
    "kind": "string",
    "required": true,
    "description": "Raw user journal entries for the day."
  },
  {
    "name": "language",
    "kind": "enum",
    "required": true,
    "values": ["English", "Russian", "Spanish"],
    "default": "English"
  }
]
```

## Supported variable kinds

| Kind | Use case |
|---|---|
| `string` | Long text, user message, context block, instructions. |
| `number` | Score, count, threshold, limit. |
| `boolean` | Feature flag, yes/no behavior. |
| `enum` | Controlled values such as language, tone, format, priority. |

## Model config

```json
{
  "model": "gpt-4.1",
  "temperature": 0.2,
  "max_tokens": 1200
}
```

PromptOps stores this so another tool or agent can know the intended execution setup. It should not execute the model itself.

## Output contract

```json
{
  "format": "markdown",
  "sections": ["summary", "patterns", "risks", "next_actions"],
  "must_include": ["one concrete next action", "uncertainty note when context is incomplete"]
}
```

This is useful for UI rendering, QA checks, AI evaluation rubrics, regression testing, and agent integration.

## Contract snapshots

```text
Asset variable_contract = latest desired contract
Version variable_contract_snapshot = contract at version creation time
```

This makes old renders reproducible even if the asset contract changes later.

## Render diagnostics

`unresolved_variables` lists variables still present after substitution. `unused_inputs` lists input keys provided by the caller but not referenced in the template.

## Best practices

Keep variable names explicit and stable. Prefer enum for controlled behavior like language, style, or output format. Use output contracts to help evaluation tools check format compliance. Snapshot contracts when creating versions.
