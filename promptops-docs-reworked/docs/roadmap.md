# Roadmap — PromptOps

## Product direction

PromptOps should remain a focused prompt registry: the reliable prompt asset layer that other systems can depend on.

## Phase 0 — Current foundation

Already represented in the API design: prompt asset registry, metadata/lifecycle, draft versions, active version retrieval, promotion, archive, template rendering, rollback, audit log, stats, and bearer token authentication.

## Phase 1 — Make it production-clean

- Add strict validation with clear error codes.
- Add duplicate asset/version conflict handling.
- Add semver validation.
- Add consistent response envelopes.
- Add unit tests for rendering and lifecycle transitions.
- Add integration tests for all API endpoints.
- Add OpenAPI examples for every endpoint.
- Add seed data for demo assets.
- Add README quickstart with local setup.

## Phase 2 — Admin UI

- Asset list.
- Asset detail page.
- Version history.
- Diff between prompt versions.
- Draft creation form.
- Contract editor.
- Render playground.
- Promote / archive / rollback controls.
- Audit timeline.

## Phase 3 — Evaluation integration, not evaluation ownership

PromptOps should integrate with the separate AI Evaluation tool without absorbing its responsibilities. It can export rendered prompts to evaluation runs, attach evaluation result links to versions, show pass/fail status from external evaluation, or block promotion unless external checks pass.

## Phase 4 — Collaboration and governance

- Role-based access control.
- Required review before promotion.
- Approval workflows.
- Environment labels such as dev, staging, production.
- Prompt ownership rules.
- Change request comments.
- Webhook events for version promotion.

## Phase 5 — Advanced prompt asset operations

- Prompt dependencies and composition.
- Shared reusable prompt fragments.
- Multi-language prompt variants.
- Prompt deprecation reports.
- Usage analytics by asset and version.
- Import/export from Git.
- CLI for CI/CD pipelines.

## Deliberately out of scope

LLM execution, dataset management, LLM-as-judge, golden dataset scoring, pairwise comparison, red teaming, agent simulation, and prompt auto-generation belong in AI Evaluation or adjacent systems, not PromptOps.
