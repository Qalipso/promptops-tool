# PromptOps — Prompt Testing & Versioning Tool

> Prompts are production assets. Treat them like code, not like notes in a Notion page.

PromptOps is a documentation-first product artifact for managing the full lifecycle of LLM prompts inside real AI products — from draft, through versioning, test suites, output diffing, regression checks, and release decisions.

This repository is the **product brief, behavior spec, and architecture documentation** for the tool. It is intentionally docs-first: the goal is to demonstrate production AI thinking, not to ship another generic prompt playground.

---

## What PromptOps Is

A prompt operations layer for teams running LLM features in production. It treats every prompt as a versioned, testable, releasable asset with:

- A stable identity (prompt ID + semantic version)
- Typed variables and a defined input contract
- A suite of test cases with expected behaviors
- A runner that executes those tests against any version
- Side-by-side output comparison between versions
- Regression detection before a new version is promoted
- An explicit release decision step with audit trail

## What PromptOps Is Not

- **Not a general LLM evaluation framework.** It does not benchmark models against each other or compute LLM leaderboard scores.
- **Not an agent builder.** No chains, no graphs, no tool-use orchestration.
- **Not a fine-tuning platform.** It manages prompts, not weights.
- **Not a generic prompt playground.** Playgrounds optimize for exploration. PromptOps optimizes for safe iteration on prompts that are already in production.

## Why This Matters

In production AI products, the prompt is often the **single point of failure**. A one-line edit to a system prompt can silently break classification accuracy, tone, JSON structure, or downstream parsing. Most teams discover the regression in support tickets, not in a test run.

PromptOps applies the same discipline to prompts that engineering applies to code: version control, test suites, diffs, regression checks, and an explicit release gate.

## Portfolio Value

This artifact demonstrates:

- **Production AI thinking** — prompt lifecycle, versioning, regression discipline
- **Product framing** — clear JTBD, MVP scope, non-goals, success metrics
- **Systems design** — layered architecture, audit log, deterministic test runner
- **Technical PM discipline** — behavior spec, acceptance criteria, roadmap split by MVP/V1/V2
- **Practical empathy for builders** — every doc page reads like internal documentation a real team would actually use

It positions me as someone who can own AI product surfaces end-to-end: spec the problem, design the system, write the docs, and define what "shippable" means.

## Example Prompts This Tool Would Manage

Real prompts from my own AI projects that benefit from PromptOps discipline:

| Prompt Asset | Source Project | Why it needs PromptOps |
|---|---|---|
| **Shadow Daily Reflection Classifier** | Shadow | Classifies user entries into life areas. Schema drift breaks downstream charts. |
| **Shadow Weekly Insight Generator** | Shadow | Long-form synthesis over a week of entries. Tone and structure regress easily. |
| **RAG Context Builder** | Shadow | Assembles memory blocks from pgvector matches. Format changes ripple into every other prompt. |
| **Small Business Booking Assistant** | Area Mosa | WhatsApp booking agent. Wrong date handling = lost bookings. |
| **Lead Qualification Assistant** | Sales tooling | Scores inbound leads. Score inflation/deflation is invisible without regression checks. |
| **AI Evaluation Report Generator** | Internal | Generates structured eval reports. Output format must stay stable for parsing. |

Each of these would live in PromptOps as a versioned asset with its own test suite.

## Repository Map

```
promptops-tool/
├── README.md                    # this file
├── product-brief.md             # problem, users, JTBD, MVP, metrics
├── behavior-spec.md             # what the system does / does not do
├── architecture.md              # system layers + Mermaid diagram
├── roadmap.md                   # MVP / V1 / V2 / future
├── acceptance-criteria.md       # what "done" means for each layer
├── docs/
│   ├── prompt-lifecycle.md
│   ├── versioning-strategy.md
│   ├── variable-design.md
│   ├── test-case-design.md
│   ├── prompt-diff.md
│   ├── regression-checks.md
│   ├── release-management.md
│   └── production-ai-thinking.md
└── diagrams/
    ├── prompt-lifecycle.md
    ├── version-comparison-flow.md
    ├── regression-flow.md
    └── release-decision-flow.md
```

Start with `product-brief.md` for the problem framing, then `behavior-spec.md` for the system contract, then `architecture.md` for the design.
