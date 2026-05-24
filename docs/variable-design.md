# Variable Design

A prompt's variable contract is its API. Treat it with the same discipline as a public function signature.

## Principles

1. **Explicit beats implicit.** Every value the prompt depends on is a named variable. No environmental reads, no hidden globals, no "the model figures it out from context."
2. **Typed at the boundary.** The runner validates types before the LLM ever sees the input. A wrong type fails loudly, locally, fast.
3. **Defaults are documentation.** A default value tells the next engineer what "normal" looks like.
4. **Required is a commitment.** A required variable can never be removed without a MAJOR bump. Mark required only when truly required.

## Variable Schema

Each variable declaration carries:

| Field | Purpose |
|---|---|
| `name` | Identifier used in the prompt template (`{{user_query}}`). snake_case. |
| `type` | One of: `string`, `enum`, `number`, `bool`, `object`, `array`. |
| `required` | Bool. Defaults to `false`. |
| `default` | Value used when omitted. Forbidden for required vars. |
| `description` | One sentence explaining what this is and where it comes from. |
| `enum_values` | Required if `type=enum`. |
| `schema` | Required if `type=object` or `array`. JSON Schema fragment. |

## Naming Conventions

- `user_*` — values originating from the end user (raw input, locale, profile).
- `context_*` — retrieved or assembled context (RAG memory blocks, recent history).
- `system_*` — system-controlled values (current date, feature flags).
- `config_*` — operator-controlled toggles (verbosity, output format).

This four-bucket convention makes prompt bodies skimmable. A reader can tell instantly which inputs are user-controlled (and therefore untrusted) versus operator-controlled.

## Required vs Optional

| Heuristic | Decision |
|---|---|
| Prompt cannot produce a meaningful output without it | Required |
| Prompt has a sensible fallback behavior without it | Optional with default |
| Used only in a rare branch | Optional with `null` default |
| Different callers will want different values | Optional with default |

## Defaults

- Defaults are part of the contract. Changing a default is at minimum a MINOR bump.
- A default of `null` is fine and explicit. A missing default for an optional variable is not — the system rejects it.
- Defaults should be the **safest** value, not the most common one. Safer defaults bias errors toward conservative outputs.

## Type Choices

- Prefer `enum` over `string` whenever the set of valid values is finite. The runner can reject typos before the LLM sees them.
- Prefer `string` over `object` when the prompt is going to flatten it anyway. Carrying structure the prompt does not use is dead weight.
- Use `object` / `array` only when the prompt body actually iterates or accesses fields.

## Worked Examples

### Shadow Daily Reflection Classifier

```
asset: shadow.daily-classifier
variables:
  - name: entry_text
    type: string
    required: true
    description: Raw user reflection from the daily check-in input.

  - name: user_locale
    type: enum
    required: false
    default: en-US
    enum_values: [en-US, es-ES, pt-BR, ja-JP]
    description: BCP-47 locale used to anchor classification of language-specific phrases.

  - name: context_recent_areas
    type: array
    required: false
    default: []
    schema: { items: { type: string } }
    description: List of life-area IDs the user has been tagging recently, used as a tie-breaker.

  - name: system_today
    type: string
    required: true
    description: ISO date passed by the runtime to anchor "today" / "yesterday" expressions.
```

### Area Mosa Booking Assistant

```
asset: area-mosa.booking-confirm
variables:
  - name: user_message
    type: string
    required: true

  - name: user_phone
    type: string
    required: true

  - name: system_today
    type: string
    required: true

  - name: context_available_slots
    type: array
    required: true
    schema: { items: { type: object, properties: { start: { type: string }, service: { type: string } } } }

  - name: config_max_offered_slots
    type: number
    required: false
    default: 3

  - name: config_language
    type: enum
    required: false
    default: es
    enum_values: [es, en, pt]
```

Note how the four-bucket naming convention makes the API self-documenting: `user_*` is what the customer sent, `context_*` is what we retrieved, `system_*` is what the platform injected, `config_*` is what the operator tuned.

## Anti-Patterns

- **God variables.** A single `payload` object that the prompt unpacks internally. Make the structure explicit.
- **Implicit dates.** Letting the model "guess" today's date. Always inject `system_today`.
- **Stringly-typed enums.** Free-text `language` field with a comment saying "must be one of: en, es, pt." Use an enum.
- **Defaults that depend on other variables.** Defaults must be static values, not expressions.
