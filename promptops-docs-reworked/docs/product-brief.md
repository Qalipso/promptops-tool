# Product Brief — PromptOps

## One-liner

PromptOps is a lightweight prompt registry that stores prompt assets, manages versions, renders templates with variables, and keeps an audit trail of prompt operations.

## Problem

As AI products grow, prompts stop being throwaway text. They become operational assets used by agents, workflows, evaluations, and user-facing features. But many teams still manage prompts through scattered markdown files, code constants, Notion pages, ad hoc spreadsheets, or copied messages.

This creates several product and engineering problems:

- Teams cannot reliably know which prompt is active in production.
- Prompt changes are hard to review, trace, or roll back.
- Variables are often undocumented, causing runtime failures or inconsistent outputs.
- Prompt evaluation results become hard to reproduce because the exact rendered prompt is not preserved.
- Product managers, engineers, and AI specialists lack a shared source of truth.

PromptOps solves the storage and lifecycle layer of this problem.

## Target users

| User | Need |
|---|---|
| AI Product Manager | Understand which prompt powers which feature and what changed between versions. |
| Prompt Engineer | Create, revise, document, and promote prompt versions safely. |
| Backend Engineer | Fetch active prompts and render them through a predictable API. |
| QA / Evaluator | Reproduce exactly which prompt was used during a test or regression run. |
| Agent Developer | Retrieve stable prompt assets without hardcoding prompt text into agent code. |

## Jobs to be done

1. **When I change a prompt, I want to create a draft version first, so changes are not accidentally used in production.**
2. **When a prompt is ready, I want to promote it, so agents and services can fetch the current active version.**
3. **When rendering a prompt, I want diagnostics, so unresolved variables and unused inputs are visible.**
4. **When a new prompt causes problems, I want to roll back, so the previous working version becomes active again.**
5. **When auditing behavior, I want a history of prompt operations, so I can reconstruct what happened.**

## Product goals

- Provide a stable source of truth for prompt assets.
- Make prompt versions explicit and auditable.
- Preserve prompt contracts at the version level.
- Render templates deterministically without calling an LLM.
- Keep PromptOps clearly separated from AI evaluation.

## Non-goals

PromptOps does not:

- Run prompts against LLMs.
- Score prompt outputs.
- Perform LLM-as-judge evaluation.
- Store golden datasets.
- Manage model provider credentials.
- Replace CI/CD, experiment tracking, or evaluation tooling.
- Decide whether one prompt is better than another.

## MVP scope

The MVP should include asset creation, metadata updates, draft version creation, promotion, archive, active version retrieval, template rendering with diagnostics, rollback with justification, audit events, and basic asset stats.

## Success metrics

| Metric | Why it matters |
|---|---|
| Number of registered prompt assets | Shows adoption as a registry. |
| Number of versions per asset | Shows real prompt iteration. |
| Render success rate | Shows whether contracts and templates are usable. |
| Unresolved variable rate | Helps detect broken templates or missing inputs. |
| Rollback count | Indicates operational usage and release risk. |
| Audit event coverage | Shows traceability of important operations. |

## Product principles

1. **Prompts are assets.** They deserve IDs, owners, versions, contracts, and lifecycle states.
2. **Versions are immutable records.** A version should represent a specific prompt body and contract snapshot.
3. **Rendering is deterministic.** Same version plus same inputs should produce the same rendered output.
4. **Evaluation is separate.** PromptOps can feed evaluation tools, but should not become one.
5. **Auditability matters.** Operational prompt changes should be traceable.

## Example use case: Shadow

Shadow may have multiple prompt assets: `shadow.daily-report`, `shadow.goal-reflection`, `shadow.task-breakdown`, `shadow.memory-extraction`, and `shadow.weekly-review`. Each asset can have its own contract, active version, changelog, and render history.
