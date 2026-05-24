# Case Study — PromptOps

A portfolio-grade walkthrough of how this product was scoped, the decisions behind it, and what success would look like in production.

---

## Problem

The state of prompt management at most companies shipping LLM features in production:

> "The prompt lives in a constant in the codebase. When we want to change it, we edit the string, commit it, and deploy. The previous version is in git history. We have never compared outputs between versions."

I tracked the failure patterns and they are consistent:

1. **Silent regressions.** A prompt is edited to improve tone. Accuracy drops by 18% on edge cases nobody thought to test. The regression surfaces two weeks later as support tickets.
2. **Variable schema drift.** A new variable is added to the system prompt. Three downstream parsers assume the old schema. They break at runtime, not at test time.
3. **Invisible diffs.** A "small wording change" ships. What changed? Nobody knows without diffing two git commits and mentally simulating the model's response to the delta.
4. **Model upgrades without re-evals.** GPT-4o → GPT-4o-mini. The team deploys it across all prompts. Three classifiers degrade. Discovered by users.
5. **No audit trail.** A production incident 6 weeks ago. The question: "what was the prompt doing at that time?" The answer is a git blame and a lot of assumptions about deployment timing.

Prompt engineering exists as a practice. Prompt **operations** — version control, testing, diffing, promotion, audit — mostly does not.

---

## Solution

PromptOps treats prompts as first-class versioned software assets, not as strings in a config file.

Three foundational decisions:

1. **Content-addressed versions.** Every version of a prompt is hashed on its content + model config + variable schema. An asset can be registered, promoted, and rolled back by hash — never by "current" or "latest", which are relative terms that break under concurrent edits.
2. **Variables are typed and validated.** A prompt with `{{customer_name}}` and `{{tier}}` has a schema. Variables have types (`string`, `enum`, `integer`). Render attempts with missing or mistyped variables fail at the variable layer, not at the LLM call. The rendered output is also hashed, making two render calls with the same inputs provably identical.
3. **Tests are first-class, not afterthoughts.** A test suite is an asset, versioned alongside the prompt. It runs against a specific (prompt version, model) pair. Test types cover exact match, JSON schema validation, substring presence, and substring absence. Regression is detected by comparing test results between versions — not by reading the output.

The data model:

```
PromptAsset
  id (stable slug: org.domain.use-case)
  name, description
  variables[]  (name, type, required, description)
  output_contract (JSON schema | free text)
  versions[] → PromptVersion
    content (immutable after creation)
    model_config (provider, model, temperature, max_tokens)
    content_hash (SHA-256 of content + model_config)
    status (draft | active | archived)
    test_suite → TestSuite
      assertions[] (type, field?, expected)
    runs[] → TestRun
      results[] (passed, actual_output, latency_ms)
    audit_log[] (event, actor, timestamp)
```

---

## User Flow

A typical prompt iteration cycle:

1. **Register the asset.** Engineer registers `shadow.daily.reflection-classifier` with its current system prompt, model config (claude-sonnet-4-6), and variable schema (`user_input: string`). This becomes `v1.0.0`. Status: `active`.
2. **Write the test suite.** 8 assertions: 3 exact-match on known inputs, 2 JSON schema checks on output format, 3 not-contains checks for content the prompt must never produce.
3. **Iterate.** Engineer creates `v1.1.0` — same prompt, adjusted tone for a specific user segment. The diff view shows exactly what changed: 4 lines, side-by-side.
4. **Run tests on v1.1.0.** 7/8 pass. One assertion fails: a not-contains check for `[negative]` fires — the new phrasing sometimes produces a negative label on neutral input. Engineer adjusts the prompt. `v1.2.0` passes 8/8.
5. **Promote.** Engineer clicks "promote `v1.2.0` to active." The promote action: archives `v1.0.0`, sets `v1.2.0` to `active`, writes an audit event. The runtime SDK's next call to `getActiveVersion('shadow.daily.reflection-classifier')` returns `v1.2.0`.
6. **Audit.** Six weeks later, an incident. The question: "what was this classifier doing on April 3rd?" The audit log shows `v1.0.0 → active` on March 15, `v1.0.0 → archived, v1.2.0 → active` on March 29. The answer is unambiguous.

---

## System Logic

### Why content-addressed versions instead of sequential numbers

`v3` means nothing without the content. `sha256:a1b2c3...` is the content. When a version's identity is its hash, you cannot accidentally deploy a different prompt at the same version number. You cannot have two `v3`s. Rollback means "set this hash to active" — no ambiguity about which content you are rolling back to.

### Why variable validation at the layer, not the prompt

If variable validation happens inside the LLM call, you discover a missing variable from a bad output. If it happens at the variable layer, you discover it from an error before any API call is made. This also makes prompt testing deterministic: the test runner knows exactly what was sent to the model.

### Why a pnpm monorepo (Hono API + Next.js UI)

The API and UI have different deployment and scaling concerns. The API needs to be accessible to a runtime SDK; the UI is a management console. A monorepo with shared types (`packages/types`) ensures the API response shape and the UI's TypeScript types are always in sync without a code generation step.

### Why Hono instead of Express

Hono runs on edge runtimes (Cloudflare Workers, Vercel Edge) without modification. The API stays small. Hono's route handler types are strict enough to catch schema mismatches at compile time. The switch from Express would cost more than it saves at this stage; Hono is the right starting point for a new TypeScript API.

### Why Drizzle instead of Prisma

Schema is expressed in TypeScript, not in a separate DSL. There is no code generation step and no `npx prisma generate` to forget in CI. Query results are typed to the schema definition, not inferred from a generated client. For a project where the data model evolves frequently, the edit-save-run loop is meaningfully faster.

### Why the web UI is a management console, not the primary interface

The primary interface for a production prompt is the runtime SDK — `getActiveVersion()` in application code. The web UI is for humans who need to review, compare, and promote. Optimizing the UI for the runtime path would be optimizing for the wrong user.

---

## Product Decisions

| Decision | Alternative | Why I chose this |
|----------|-------------|------------------|
| Content-addressed versions | Sequential version numbers | Hash = identity. Two identical prompts at different names get the same hash — deliberate deduplication signal. |
| Variable validation layer | Validate inside the LLM call | Fail fast, fail before the API call. Makes testing deterministic. |
| Test suite as versioned asset | Ad-hoc test scripts | Tests that are versioned alongside prompts survive team turnover and repo reorganization. |
| Hono + Drizzle + pnpm monorepo | Express + Prisma + single-package | Faster dev loop; edge-compatible API; shared types without codegen. |
| Append-only audit log | Mutable event log | Audit logs that can be edited are not audit logs. |
| Manual promotion with confirmation | Auto-promote on all-pass | A human in the loop for promotion is the right default. Auto-promote is opt-in for mature teams. |
| Stable asset IDs (`org.domain.use-case`) | UUIDs | Human-readable IDs survive migrations, can be typed in a CLI, and make `getActiveVersion('shadow.daily.reflection-classifier')` readable at the call site. |

---

## Metrics

| Metric | Baseline (no PromptOps) | Target |
|--------|-------------------------|--------|
| Time to detect a regression after a prompt change | Days to weeks | < 1 hour |
| % prompt changes with a documented test run before promotion | < 15% | ≥ 95% |
| Time to answer "what was the prompt doing on date X?" | 30–60 minutes | < 2 minutes |
| Prompt changes that cause undetected prod regressions per quarter | Unknown (untracked) | 0 (all caught by test suite) |
| Mean time to roll back a bad prompt version | 30–90 minutes | < 5 minutes |

---

## What I Learned

- **Prompts are software. They need software engineering discipline.** The teams that resisted this framing were the teams with the most production incidents. Version control, testing, and audit trails are not overhead for prompts — they are the minimum viable engineering discipline.
- **Content-addressed identity is the right primitive.** "What was the prompt at this version?" should have an unambiguous answer. Sequential version numbers with mutable content do not provide that. Hash-based identity does.
- **Variable validation surfaces bugs earlier than any other technique.** The most common source of bad LLM output at teams I studied was a missing or misformatted variable — a null customer name, a truncated input. Catching this at the layer before the API call changes the economics of prompt debugging.
- **The audit log is a trust feature, not a compliance feature.** When engineers know that every promote event is logged with timestamp and actor, they make more deliberate decisions. The log is the accountability surface.
- **A management console must be fast.** The diff view must load in < 500ms. The test run results must stream. If the management console is slow, engineers stop using it and go back to reading git history.
