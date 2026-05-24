# PromptOps Docs Pack — Review

**Reviewer:** code/spec audit against actual API in `projects/promptops-tool/app`
**Date:** 2026-05-22
**Verdict:** Production-grade docs. Structure clear. Naming consistent. Spec matches code. Few gaps + opportunities.

---

## 1. Structure assessment

| Aspect | Rating | Notes |
|---|---|---|
| File organization | A | 9 docs + 3 diagrams + OpenAPI. No bloat. PM/Engineer/QA each have entry point. |
| Naming consistency | A | Same vocabulary across all files: asset, version, render, audit. No drift. |
| Reading order | A− | README → product-brief → behavior-spec → architecture → api-ref. Natural funnel. Missing explicit "start here" path callout. |
| PM/engineer split | A | product-brief is non-technical, architecture+api-ref technical. Wiki bridges. |
| Mermaid usage | B+ | Diagrams useful but minimal (3). State machine + sequence + ERD all good. |
| OpenAPI alignment | A | Spec at `openapi/promptops.openapi.json` matches code (v0.2.0, 11 paths, 8 schemas). |

---

## 2. Content assessment

### Strengths

1. **Hard separation: PromptOps ≠ AI Eval.** Stated 7+ times. Reinforced in roadmap (Phase 3 = integration only). Defensible boundary.
2. **Contract snapshot model** in `wiki/contracts.md` is the strongest spec idea — explains why old renders stay reproducible after asset-level contract changes.
3. **25 acceptance criteria + 25 test cases** map 1:1 to API behavior. QA can execute directly.
4. **Roadmap admits non-goals.** "Deliberately out of scope" section signals product discipline.
5. **Real example asset** `shadow.daily-report` used consistently — concrete, not toy.

### Gaps

1. **No agent integration story.** Docs frame PromptOps as admin tool. Real use case = autonomous agents calling `/active` to retrieve current prompt. Missing diagram + section.
2. **No security model.** `acceptance-criteria.md` mentions bearer token. No threat model, no token rotation policy, no scope-based auth. Real concern at Phase 4.
3. **Render output: `rendered_user` example is wrong.** In `api-reference.md` line 235: `"Create a report from I finished... in English."` — substitution should be safe but example shows raw text injected without quoting. Document escaping policy.
4. **Missing: error envelope inconsistency.** `behavior-spec.md` shows structured `{code,message,details}` error. `api-reference.md` line 36 shows freeform string. Code actually returns both depending on path. Pick one.
5. **No rate limiting / quota guidance.** API token mentioned, not throttling. Add Phase 1.
6. **Roadmap Phase 2 mentions UI features already built** (asset list, detail page, version history, draft form, render playground, promote/archive/rollback). Update — those are Phase 0 now.
7. **No "agent skill" framing.** Docs target humans. Missing pattern: how does an agent discover, retrieve, version a prompt programmatically?

### Inconsistencies vs code

| Doc says | Code does | Action |
|---|---|---|
| Render returns 202 | Returns 202 ✓ | OK |
| `/active` endpoint | Exists ✓ | OK |
| Error: `{ success, error: {code,message,details} }` | Mixed: sometimes string, sometimes object | Standardize |
| Version states: draft/active/previous/archived | Matches ✓ | OK |
| Asset lifecycle: unregistered/active/deprecated/sunset | Matches ✓ | OK |
| "Diff between prompt versions" (roadmap) | UI partial — not in current build | Move to Phase 1 or build |

---

## 3. Diagrams audit

Existing (3):
- `architecture.mmd` — layer topology. Good.
- `render-flow.mmd` — sequence. Good but compressed.
- `version-lifecycle.mmd` — state machine. Good.

Missing (high value):
- Object model (assets ↔ versions ↔ contracts ↔ audit) as ER not flowchart
- Agent integration loop (discover → render → use → version)
- PromptOps vs AI Eval boundary
- Asset lifecycle (separate from version)
- Data flow with contract snapshot

Added below — see `diagrams/REVIEW_*.mmd`.

---

## 4. Make it more "alive" — concrete suggestions

1. **Add `docs/quickstart.md`** — 5-min path from `curl POST /assets` to `curl GET /active`. Skip product theory.
2. **Add `docs/agent-integration.md`** — pattern for agents using PromptOps as a skill. curl examples, Python+TS snippets, error handling.
3. **Add `docs/comparison-table.md`** — PromptOps vs PromptLayer vs Helicone vs LangSmith. Position the project.
4. **Inline mini-diagrams** in each section instead of one big diagram per file. Diagram density per scroll = engagement.
5. **Add `docs/glossary.md`** — Asset, Version, Render, Contract, Snapshot, ETag, Lifecycle. Single source for terms.
6. **Show real audit log JSON** in `behavior-spec.md` — what does `event_type: 'version.promoted'` actually look like?
7. **Convert acceptance criteria to Gherkin** — Given/When/Then is already 80% there. Make it executable.

---

## 5. New diagrams (see `diagrams/REVIEW_*.mmd`)

| File | Purpose |
|---|---|
| `REVIEW_object-model.mmd` | ER diagram: how Asset, Version, Render, Audit relate. Replaces the flowchart "Core object model" in README. |
| `REVIEW_asset-lifecycle.mmd` | State machine for asset (not version). Separate concern. |
| `REVIEW_agent-integration.mmd` | Sequence: agent discovers, renders, uses, versions. The missing diagram. |
| `REVIEW_promptops-vs-aieval.mmd` | Boundary diagram. What goes where. |
| `REVIEW_data-flow.mmd` | End-to-end data flow: asset contract → version snapshot → render → audit. |

---

## 6. Summary score

| Dimension | Score |
|---|---|
| Product framing | 9/10 |
| Technical accuracy | 9/10 |
| Completeness | 7/10 (missing agent/security/glossary) |
| Visual density | 6/10 (could use more inline diagrams) |
| Portfolio impact | 9/10 (rare to see this discipline at MVP) |

**Overall: 8/10.** Top 10% of portfolio projects. Ship with quickstart + agent guide + 2-3 new diagrams to hit 9.5.
