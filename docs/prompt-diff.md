# Prompt Diff

A useful diff answers two questions: *what changed in the prompt* and *what changed in the outputs because of it*. PromptOps surfaces both.

## Three Layers of Diff

### 1. Prompt Diff

A textual diff of the version's authored content:

- **Body diff** — word-level diff of the prompt text, additions in green, deletions in red, moves highlighted in blue.
- **Variable contract diff** — structured diff: added variables, removed, type changes, required flag flips, default value changes.
- **Model config diff** — provider, model ID, temperature, max tokens, any other generation params.

The body diff uses word-level (not line-level) granularity because prompts are paragraph-shaped, not code-shaped. A line-level diff of a reflowed paragraph looks like a total rewrite when in reality only a few words moved.

### 2. Output Diff

Per test case, both versions are run, and outputs are compared:

- **For structured outputs (JSON):** field-level diff. Each field labelled `unchanged`, `changed`, `added`, `removed`. Type changes flagged separately.
- **For free-text outputs:** sentence-level diff plus a cosine similarity score between the two outputs computed on embeddings.
- **For enum outputs:** simple before/after pair.

### 3. Behavior Diff

The bottom-line summary per test case:

| Active result | Draft result | Label |
|---|---|---|
| PASS | PASS | `stable` |
| PASS | FAIL | `regression` (hard) |
| FAIL | PASS | `improvement` |
| FAIL | FAIL | `still-broken` |
| any | inconclusive | `needs-rerun` |

Behavior diff is the headline. Prompt diff and output diff are how you explain it.

## What a Good Diff Review Looks Like

1. **Open the behavior diff first.** Are there any regressions? If yes, stop and investigate before reading further.
2. **For each regression, open the output diff.** What did the draft produce instead of the expected output?
3. **Map the output change back to the prompt diff.** Which edit caused this?
4. **Decide:** revise the prompt, accept the regression with justification, or update the test if the test was wrong.
5. **For non-regressions, scan improvements.** Confirm they are real improvements and not accidental.

## Diff as a Conversation Tool

The diff view is the artifact teams should discuss in code review. A PR description for a prompt change should include:

- The prompt diff link.
- A one-paragraph rationale for the change.
- A list of all hard regressions and justifications.
- A list of all soft regressions and a judgment call on each.
- A link to the test run that produced the diff.

This is the equivalent of a code PR with passing CI: green tests are necessary but not sufficient; the diff itself is the unit of review.

## Edge Cases

- **Identical outputs across versions.** Marked `stable` even though the prompt changed. This is suspicious — verify the change actually had effect (often a `{{variable}}` typo).
- **Empty diff but version exists.** Should not be possible; the system rejects creating a version whose body is byte-identical to its parent.
- **Diff against a version that no longer exists.** Rejected. Archived versions are still diffable; deleted versions cannot exist (the system never deletes).
- **Diff across MAJOR boundaries.** Variable contract changes mean test cases must be migrated. Cases that can't be migrated appear in the diff as `incompatible`.
