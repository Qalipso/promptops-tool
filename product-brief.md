# Product Brief — PromptOps

## Problem

Teams shipping LLM features in production manage their prompts the way junior engineers manage code in 2005: copy-paste between files, no version control, no tests, no diffs, no release process.

The consequences show up in the field, not in development:

- A prompt edit ships and silently degrades classification accuracy by 18%. Nobody notices for two weeks.
- A new variable is added to a system prompt. Three downstream parsers break because the JSON schema shifted.
- A "small wording change" to make output friendlier causes the model to drop a required field.
- A model upgrade (e.g. GPT-4o → GPT-4o-mini) is rolled out without rerunning the prompt against historical cases.
- The team can no longer answer "what was the prompt doing two weeks ago when this user got a wrong answer?"

Prompt engineering exists. Prompt **operations** mostly does not.

## Target Users

**Primary:** AI Product Engineers and Technical PMs at companies running 5–50 LLM-powered features in production. Small enough that they own the prompts directly; large enough that they cannot rely on memory.

**Secondary:** Solo builders and indie AI startups who want to apply real engineering discipline to their prompt assets from day one (rather than rebuilding it later when a customer hits a regression).

**Out of scope:** Enterprise platform teams who need SSO, RBAC, multi-tenant isolation, and dedicated infra. PromptOps could grow into that, but the MVP is for the smaller end of the market where the pain is sharpest.

## Jobs to be Done

When a builder is iterating on a production prompt, they hire PromptOps to:

1. **JTBD-1 — Safe iteration.** "Help me change this prompt without breaking the cases it already handles correctly."
2. **JTBD-2 — Honest comparison.** "Show me exactly what changed in the prompt and exactly what changed in the outputs."
3. **JTBD-3 — Release confidence.** "Tell me whether the new version is safe to promote to production."
4. **JTBD-4 — Historical truth.** "Show me what the prompt looked like when this specific customer interaction happened."
5. **JTBD-5 — Onboarding speed.** "Let a new teammate understand the prompt portfolio in a day, not a month."

## MVP Scope

The MVP is the smallest system that makes prompt iteration **safer than it is today**.

In scope:

- Prompt registry with stable IDs
- Semantic versioning per prompt
- Typed variables with a defined input contract
- Test suite per prompt (input + expected behavior)
- Deterministic test runner (single model, fixed temperature)
- Side-by-side output diff between two versions
- Regression flagging when a previously-passing case now fails
- Explicit "promote to active" action with audit log entry
- Auto-generated release notes from version diff

## Non-Goals

The MVP deliberately does **not** include:

- Multi-model benchmarking (model-vs-model leaderboards)
- Agent / chain orchestration
- Fine-tuning workflows
- Synthetic test case generation
- A hosted prompt marketplace
- Role-based access control beyond basic owner/editor
- Real-time collaborative editing
- A vector store, a RAG framework, or memory management
- Browser-based prompt playground for end users

These are valid features. They are V2+ at the earliest. Shipping them in MVP would dilute the core promise.

## Success Metrics

The product is working if a team using it can honestly say:

| Metric | Target |
|---|---|
| Time to safely promote a new prompt version | < 15 minutes |
| Regressions caught before production | ≥ 90% of cases where regression existed |
| % of production prompts with at least one test case | ≥ 80% |
| % of prompt edits that go through the version + test flow (vs. direct edit) | ≥ 95% |
| Time to find "what was the prompt on date X" for any prompt | < 30 seconds |
| Onboarding time for a new engineer to understand the prompt portfolio | < 1 day |

Vanity metrics (DAU, prompts created) are explicitly not success metrics. The product wins by **preventing silent regressions**, which is a negative outcome — easier to measure as "incidents avoided" than "features used."

## Core User Flows

**Flow 1 — Draft a new version of an existing prompt**
1. Engineer opens the active version of `shadow.daily-classifier`
2. Forks it into a draft (auto-incremented patch version)
3. Edits the prompt body
4. Runs the test suite against the draft
5. Reviews output diff vs. active version
6. Reads regression report
7. Decides: promote, revise, or discard

**Flow 2 — Investigate a production issue**
1. Engineer sees a user-reported wrong classification from yesterday
2. Looks up the prompt version that was active at the timestamp
3. Pulls the exact prompt text + variables + model config used
4. Adds the failing case to the test suite
5. Repeats Flow 1 to fix it without breaking other cases

**Flow 3 — Onboard a new prompt to the system**
1. Engineer registers a new prompt asset (`booking-assistant.confirm-slot`)
2. Defines the variable contract
3. Pastes the current production prompt as v1.0.0
4. Writes 5–10 baseline test cases
5. Promotes v1.0.0 to active

## Key Risks

| Risk | Mitigation |
|---|---|
| Teams find writing test cases too tedious and skip them | Bias the UX toward capturing real production examples as tests; require minimum 3 cases before a version can be promoted |
| LLM non-determinism makes regression detection noisy | Fixed temperature + N=3 runs + structured-output checks first, free-form similarity checks second |
| Becomes "yet another prompt playground" | Refuse to add exploration features in MVP; every feature must serve safe iteration |
| Scope creep into model benchmarking | Hold the line: PromptOps is about *one prompt over time*, not *many models at one moment* |
| Audit log grows unbounded | Append-only log with cold storage tier after 90 days; UI only shows last 30 days by default |
