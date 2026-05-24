# Versioning Strategy

PromptOps uses semantic versioning adapted for prompt assets. The version number is the single most important metadata field: it tells you, at a glance, whether upgrading is safe.

## Format

`MAJOR.MINOR.PATCH`

- **MAJOR** — Breaks the contract. Callers must change.
- **MINOR** — Adds capability without breaking the contract.
- **PATCH** — Same contract, refined behavior.

## What Counts as MAJOR

Any of these forces a major bump:

- Adding a new **required** variable
- Removing or renaming any variable
- Changing the type of any variable
- Changing the output contract (free-text → JSON, JSON schema field changes)
- Changing the pinned model (e.g. `gpt-4o-mini` → `gpt-4o`)
- Changing temperature, max tokens, or other generation params in a way that materially shifts behavior

Major bumps require the caller — i.e. the production app integrating the prompt — to be updated and redeployed in lockstep.

## What Counts as MINOR

- Adding a new **optional** variable with a default value
- Adding new optional fields to the output schema (callers that ignore unknown fields keep working)
- Rewording prompt instructions in a way that improves outputs without changing their shape
- Adding new test cases to the suite

## What Counts as PATCH

- Typo fixes in the prompt body
- Reordering instructions for clarity with no behavioral change
- Tightening instructions to reduce edge-case failures
- Improving few-shot examples

## The System Suggests, the Human Decides

When the diff is computed between the active version and a draft, the system inspects the diff and **suggests** a version bump. The user can override it but must justify the override. This catches the common case where a "minor" tone change actually swings classification accuracy by 15%.

## Naming Conventions for Asset IDs

`<project>.<feature>.<purpose>`

Examples:

- `shadow.daily-classifier`
- `shadow.weekly-insight`
- `shadow.rag-context-builder`
- `area-mosa.booking-confirm`
- `area-mosa.booking-reschedule`
- `sales.lead-qualifier`
- `internal.eval-report-gen`

Rules:

- Lowercase, kebab-case within each segment.
- Project name matches the source product. No abbreviations that need a glossary.
- Purpose is a verb-noun or noun describing the prompt's job. Not a model name. Not a version. Not a timestamp.

## Changelog Entries

Every version stores a changelog entry written by the author. Format:

```
v1.3.0 — Add optional `user_locale` variable

- Added optional `user_locale` (default: `en-US`) to control output language.
- Updated test suite with 4 new cases covering es-ES, pt-BR, ja-JP, en-US.
- No regressions against existing English cases.
```

If the changelog is empty at promotion time, the system blocks with a soft warning. ("Continue without changelog?")

## When in Doubt

When unsure between MINOR and PATCH, prefer MINOR. When unsure between MAJOR and MINOR, prefer MAJOR. Conservative bumps cost a few extra characters in a version string; aggressive bumps cost real incidents in production.
