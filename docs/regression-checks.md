# Regression Checks

The regression check is the system's most important opinion. It is the difference between "I changed the prompt and it ran" and "I changed the prompt and I know what broke."

## Definitions

- **Regression** — A test case that passed on the active version and fails on the draft.
- **Improvement** — A test case that failed on the active version and passes on the draft.
- **Stable** — Same result on both versions.
- **Still-broken** — Failed on both versions.

## Severity

| Severity | Definition | Default Effect |
|---|---|---|
| **Hard** | Assertion fails (`json_schema`, `exact`, `contains`, etc.) | Blocks promotion |
| **Soft** | Assertions pass but semantic similarity to active output drops below threshold (default 0.85) | Emits warning |
| **Performance** | Latency increase > 50% OR cost per call increase > 30% | Emits warning |

Each severity has a configurable threshold per asset. Safety-critical assets may set tighter thresholds (e.g. soft regression threshold 0.95). Low-stakes assets may loosen them.

## The Regression Report

After a test run against a draft, the system produces a report:

```
Regression Report — shadow.daily-classifier (draft v1.4.0 vs active v1.3.2)

Hard regressions:        2  ← BLOCKS PROMOTION
Soft regressions:        4
Performance regressions: 0
Improvements:            3
Stable:                  41
Still-broken:            1

Hard regressions:
  - classifier-multilingual-mixed-input
      Active: PASS    Draft: FAIL (missing required field `primary_area`)
  - classifier-very-short-input
      Active: PASS    Draft: FAIL (returned null but schema requires enum)

Soft regressions (similarity drop):
  - classifier-edge-case-emoji-only     0.91 → 0.78
  - classifier-multi-paragraph-entry    0.94 → 0.82
  ...

Improvements:
  - classifier-pt-BR-locale-handling    FAIL → PASS
  ...
```

## Blocking Behavior

By default, hard regressions block promotion. The user has three options:

1. **Revise the draft.** Edit the prompt to fix the regression. Re-run. Iterate.
2. **Update the test.** If the test was wrong, change it. This is logged as a separate audit event with a required justification.
3. **Override the block.** Force promotion despite the hard regression. The system requires a written justification, records the actor, and surfaces the override in the release notes.

Override is intentionally slightly painful. It is not the happy path.

## Why Soft Regressions Matter

A prompt change can pass all schema checks while subtly drifting the output style, length, or tone. Users notice. Schema assertions do not.

The semantic-similarity score is computed on the embedding of the output text. A 10-point drop in similarity often means the model started phrasing things differently — sometimes better, sometimes worse. The system flags it; the human decides.

## Why Performance Regressions Matter

A "minor" prompt rewrite that doubles average token usage doubles cost. A wording change that adds 2 seconds of latency per call breaks a chat UX. Cost and latency are part of the contract, even if they are not part of the output.

## Determinism Strategy

To make regression checks credible:

- Temperature pinned at 0 unless the prompt is intentionally creative.
- Seed pinned where supported by the provider.
- N runs per case (default 3). All N must satisfy the assertion. If any disagree, the case is flagged for variance, not as a clean pass.
- The same test snapshot is run against both versions in the same wallclock window to control for provider-side drift.

## When Determinism Is Not Possible

Some providers do not honor seed. In that case:

- Bump N to 5.
- Require >=4 of 5 runs to pass.
- Surface the variance to the user.
- Soft regression threshold is interpreted on the *median* similarity, not a single run.

## What Regression Checks Cannot Catch

Honest list:

- **Cases that are not in the suite.** If no test covers `user_locale=ja-JP`, the system cannot tell you the prompt broke Japanese.
- **Distribution shift in production inputs.** The suite is curated; production is wild. Capture and add.
- **Subtle semantic drift below the similarity threshold.** Tune the threshold. Add human review for safety-critical assets.
- **Multi-turn conversation degradation.** MVP scope is single-turn prompts. Multi-turn is V2.

The regression check is necessary, not sufficient. Combine it with production observability and a habit of converting incidents into test cases.
