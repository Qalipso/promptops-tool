# Test Case Design

Test cases are the safety net under every prompt edit. A weak suite gives false confidence; a strong suite catches regressions that humans miss.

## Anatomy of a Test Case

```
name:        classifier-handles-multi-area-reflection
description: Reflection mentions both work and health; classifier must surface both.
inputs:
  entry_text: "Had a tough morning standup, then crushed a long run after work."
  user_locale: en-US
  system_today: "2026-05-21"
expected:
  type: json_schema
  schema:
    type: object
    required: [primary_area, secondary_areas]
    properties:
      primary_area: { enum: [work, health, relationships, growth, finance] }
      secondary_areas: { type: array, items: { enum: [work, health, relationships, growth, finance] } }
  must_contain:
    - { path: "secondary_areas", contains: "health" }
    - { path: "secondary_areas", contains: "work" }
tags: [multi-area, en-US, regression-guard]
```

## Assertion Types

| Type | Use When |
|---|---|
| `exact` | Output is a fixed canonical string (rare, but useful for command parsers). |
| `json_schema` | Output is structured. Validate shape + required fields. |
| `contains` | Output must include specific substring(s). Useful for testing safety guardrails. |
| `not_contains` | Output must not include certain substrings (e.g. PII, banned terms). |
| `semantic_similarity` | Output should be conceptually close to a reference text. Threshold-based, last resort. |
| `custom_function` | Domain-specific check the assertion library cannot express. Runs in a sandbox. |
| `llm_judge` | Use a separate strong model to score the output against a rubric. Expensive — use sparingly. |

## Where Test Cases Come From

1. **Real production captures.** The richest source. When a user-reported issue arrives, capture the inputs and add them as a test case. The test suite grows with the product's pain points.
2. **Spec examples.** Every behavior described in the prompt's spec gets at least one positive case.
3. **Adversarial cases.** Inputs designed to break the prompt: empty strings, very long inputs, inputs in unexpected languages, ambiguous phrasings.
4. **Boundary cases.** Off-by-one in counts, edges of enum value sets, dates near midnight, locale-specific edge cases.
5. **Past regressions.** Every time a regression sneaks past, the failing input becomes a permanent test case. Suites should never shrink.

## How Many Cases?

Rules of thumb:

- **Minimum 3 cases** before a version can be promoted. Enforced by the system.
- **5–15 cases** for a simple prompt.
- **30+ cases** for prompts powering user-facing classification, structured extraction, or safety-critical decisions.
- **One case per known historical bug.** Always.

More is not always better. A bloated suite with redundant cases slows every test run and dilutes signal. Curate aggressively.

## Naming

Test case names follow `<aspect>-<condition>-<expected-behavior>`:

- `classifier-empty-entry-returns-null-area`
- `booking-locale-pt-returns-portuguese-slots`
- `summarizer-very-long-input-respects-length-limit`
- `rag-builder-no-matches-returns-empty-block`

A reader skimming the suite should understand each case from its name alone.

## Tags

Tags enable filtered runs:

- `regression-guard` — Cases capturing past production bugs. Always run.
- `smoke` — Minimum viable subset that runs on every save.
- `slow` — Cases with long inputs or expensive LLM-judge assertions. Skipped by default in fast loops.
- `breaking-change` — Cases that intentionally fail on the active version to drive a required upgrade.
- `<locale-tag>`, `<area-tag>`, `<feature-tag>` — Domain-specific filters.

## Determinism

- Use `temperature=0` and pinned seeds where supported.
- For non-deterministic providers, run each case `N=3` times by default and require **all** runs to pass an assertion. Variance is reported per case.
- Avoid assertions that depend on phrasing of free-text outputs. Prefer `json_schema` + `contains` over `semantic_similarity` whenever possible.

## What NOT to Test

- **Do not test the model.** The prompt suite is for the prompt. Whether `gpt-4o` is smarter than `gpt-4o-mini` is a separate, model-evaluation concern.
- **Do not test infrastructure.** Latency thresholds belong in observability, not in test cases.
- **Do not test the obvious.** "Returns a string when given a string" is noise.

## Maintaining the Suite

- Review the suite quarterly. Cases that have not failed in 12 months and were captured from a long-resolved bug can be tagged `historical` and excluded from fast loops (but still run on promotion).
- When the prompt's variable contract changes (MAJOR bump), the suite must be migrated. Cases that cannot be migrated are marked `incompatible` and surfaced to the engineer.
- A failing test case is **never** the way to find out you should change the test. Fix the prompt or, if the test was wrong, change the test in a separate commit with explicit justification.
