# Acceptance Criteria

What "done" means for this artifact. Each criterion is something a reviewer should be able to verify by reading the docs.

---

## A. Documentation Completeness

- [ ] `README.md` opens with a clear positioning hook and explicitly distinguishes PromptOps from a general LLM evaluation tool.
- [ ] `README.md` lists at least 6 concrete example prompt assets and explains why each benefits from PromptOps discipline.
- [ ] `README.md` includes a portfolio-value statement explaining what this artifact proves about the author.
- [ ] `product-brief.md` contains: Problem, Target Users, JTBD, MVP Scope, Non-Goals, Success Metrics, Core User Flows, Key Risks.
- [ ] `behavior-spec.md` is organized into "what it does" and "what it does not do" sections plus per-feature subsections.
- [ ] `architecture.md` contains a Mermaid diagram and describes every layer named in the architecture spec.
- [ ] `roadmap.md` splits into MVP, V1, V2, Future Improvements with explicit out-of-scope items per phase.
- [ ] `acceptance-criteria.md` (this file) covers every category listed in the spec.
- [ ] Each `docs/*.md` file is at least 200 lines of substantive content with concrete examples.
- [ ] Each `diagrams/*.md` file contains a valid Mermaid diagram and an explanation of what it shows.
- [ ] There are no placeholder TODOs, `[TBD]` markers, or empty sections in any file.

## B. Prompt Lifecycle Clarity

- [ ] The four states (`draft`, `active`, `previous`, `archived`) are named consistently across all docs.
- [ ] Mutability rules are unambiguous: only `draft` is mutable.
- [ ] Entry paths (greenfield, import-from-production, fork) are documented.
- [ ] Exit paths (deprecated, replaced, sunset) are documented.
- [ ] At least three anti-patterns are called out explicitly.
- [ ] The standard iteration loop has at least six numbered steps and is reflected in both prose and a diagram.

## C. Versioning Logic

- [ ] Semantic versioning rules (MAJOR / MINOR / PATCH) are concretely defined with at least three examples per level.
- [ ] The naming convention for asset IDs is documented with examples.
- [ ] Changelog format is specified.
- [ ] The system's "suggest a bump, let the human override with justification" behavior is documented.
- [ ] Worked examples exist for at least two real prompts from the author's portfolio.

## D. Regression Logic

- [ ] Three regression severities (hard / soft / performance) are defined with default thresholds.
- [ ] The blocking-by-default behavior of hard regressions is stated explicitly.
- [ ] The override mechanism requires written justification, recorded in the audit log.
- [ ] Determinism strategy (temperature pinning, N runs, seed) is documented.
- [ ] The fallback for providers without seed support is documented.
- [ ] Honest limitations of regression checks are listed (cases not in suite, distribution shift, multi-turn).
- [ ] A regression flow diagram exists.

## E. Architecture Clarity

- [ ] The Mermaid architecture diagram shows all ten named layers.
- [ ] Each layer has a written description in `architecture.md`.
- [ ] Storage boundaries are explicit: PromptDB, RunDB, AuditDB, BlobStore.
- [ ] Cross-cutting concerns (determinism, idempotency, provider adapter, SDK) are documented.
- [ ] The architecture supports answering "what was the active prompt at time X" in O(1) by design.

## F. Portfolio Readiness

- [ ] The artifact reads like internal documentation a real AI product team would use, not like a generic marketing site.
- [ ] Tone is product-oriented and practical, not academic, not aspirational.
- [ ] No emojis in code, docs, or commit-style fragments (per house style).
- [ ] At least three references to real projects in the author's portfolio (Shadow, Area Mosa, etc.) to ground the system in lived experience.
- [ ] The distinction between PromptOps and a general LLM evaluation tool appears in at least three places: `README.md`, `product-brief.md` (Non-Goals), `roadmap.md` (What Will Never Be in Scope).
- [ ] The artifact is consistent: terminology, asset ID conventions, and version semantics line up across every file.
- [ ] A reader who skims only `README.md` + `product-brief.md` + `architecture.md` (the "three-file pitch") understands what the product is, who it is for, and how it is built.
- [ ] A reader who reads the full set understands the author can think in terms of: product framing, system architecture, behavior contracts, lifecycle states, versioning discipline, regression theory, and release governance.

---

## How to Verify

Run through these criteria in order. Anything unchecked is either a content gap or a consistency issue. The artifact is acceptance-ready when every box can be checked honestly.
