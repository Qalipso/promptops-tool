# Implementation Plan — PromptOps MVP

Execution blueprint for turning the documentation artifact into a working MVP. Covers required skills, phased delivery, parallel agent allocation, and open questions that must be resolved before or during each phase.

---

## 0. Pre-Flight

### 0.1 Decisions Required Before Coding

These block scope. Resolve in a 30-minute decision call before sprint 0.

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Storage backend | Postgres + S3 / Postgres + local FS / SQLite + FS | Postgres + S3 (matches Shadow stack, room to grow) |
| D2 | Auth model for MVP | None (single-user local) / API token / OAuth | API token. SSO is V2. |
| D3 | UI vs API-first | Web UI from day 1 / CLI + REST first, UI in sprint 2 | CLI + REST first. UI sprint 2. Faster feedback loop. |
| D4 | Hosting target | Self-hosted Docker / Vercel + Supabase / Railway | Railway for MVP (one-command deploy, Postgres included). |
| D5 | Provider scope at MVP | OpenAI only / OpenAI + Anthropic | OpenAI only. Anthropic in V1 per roadmap. |
| D6 | Embedding provider for similarity scoring | OpenAI `text-embedding-3-small` / local sentence-transformers | OpenAI. Already in Shadow stack. |
| D7 | Where the runtime SDK lives | Same repo as core / separate repo | Same monorepo, separate package. |

### 0.2 Repo Layout

```
promptops/
├── apps/
│   ├── api/             # REST API + core domain (Node/Hono)
│   ├── web/             # Next.js UI (sprint 2+)
│   └── cli/             # Thin CLI on top of REST
├── packages/
│   ├── sdk-ts/          # Runtime SDK for production callers
│   ├── domain/          # Pure domain types: Asset, Version, TestCase
│   ├── runner/          # Test runner + provider adapters
│   └── diff/            # Prompt diff + output diff engines
├── infra/
│   ├── migrations/      # SQL migrations (Drizzle or Prisma)
│   └── docker/
├── docs/                # Symlink/import from projects/promptops-tool/
└── e2e/
```

Monorepo. `pnpm` or `bun` workspaces. TypeScript everywhere.

---

## 1. Required Skills & Agents

### 1.1 Engineering Agents (sequenced)

| Phase | Primary Agent | Supporting Agents |
|---|---|---|
| Planning | `planner`, `architect` | `docs-lookup` (Context7 for libs) |
| Schema + migrations | `database-reviewer` | `tdd-guide` |
| Domain layer | `tdd-guide` | `code-reviewer` |
| Runner + provider adapters | `tdd-guide` | `security-reviewer` (key handling), `code-reviewer` |
| Diff engine | `tdd-guide` | `code-reviewer` |
| REST API | `tdd-guide` | `security-reviewer`, `code-reviewer` |
| CLI | `code-reviewer` | — |
| Web UI | `magic-ui-component-gen` | `uiux-pro-max-designer`, `code-reviewer` |
| E2E | `e2e-runner` | — |
| Build/deploy | `build-error-resolver` | — |

### 1.2 Skills To Invoke

| Skill | Where Used |
|---|---|
| `tdd` | Every feature. Tests before implementation. |
| `plan` | Sprint kickoff. Restate, risks, plan. |
| `docs` (Context7) | Library lookups: Hono, Drizzle/Prisma, OpenAI SDK, Zod, Next.js. |
| `claude-api` | LLM provider adapter (Anthropic). |
| `claude-developer-platform` | If using Agent SDK anywhere. |
| `postgres-patterns` | Schema design, indexes, append-only audit table. |
| `database-migrations` | Migration strategy + rollback. |
| `api-design` | REST conventions, error envelope, pagination. |
| `cost-aware-llm-pipeline` | Runner cost cap + model routing. |
| `regex-vs-llm-structured-text` | Assertion type selection logic. |
| `mcp-server-patterns` | If exposing PromptOps as MCP server (V1 bonus). |
| `frontend-patterns` | Next.js UI sprint 2. |
| `21st-dev-magic` | UI component generation. |
| `e2e-testing` | Playwright suite. |
| `deployment-patterns` | Railway/Docker config. |
| `security-review` | Pre-launch hardening. |
| `code-review` | After every meaningful PR. |
| `caveman-commit` | All commits. |

### 1.3 Human Roles

| Role | Time Allocation |
|---|---|
| Tech PM (you) | Spec drift control, decision gates, prompt-author UX testing |
| Backend eng | Domain + API + runner |
| Frontend eng (sprint 2+) | UI + SDK polish |
| Designer (optional, async) | UI flows via `uiux-pro-max-designer` brief |

Solo build is feasible. Two people accelerate sprint 2–3.

---

## 2. Phased Implementation Plan

Five sprints. Each sprint ends with a demoable artifact and a hard go/no-go on the next.

### Sprint 0 — Foundation (3 days)

**Goal:** Repo, infra, schema, "hello world" REST endpoint.

Tasks:
1. Init monorepo (`pnpm workspaces` + `turbo`).
2. Decide ORM (`drizzle` recommended for speed + raw SQL escape hatch).
3. Write migrations for: `assets`, `versions`, `variables`, `test_cases`, `test_runs`, `run_results`, `audit_log`.
4. Stand up Hono API with health check + auth middleware (single API token from env).
5. Seed script: one fake asset + 3 test cases for smoke tests.
6. Deploy stub to Railway.

Agents: `planner` → `architect` → `database-reviewer` → `tdd-guide` → `build-error-resolver`.

Exit gate: `GET /assets` returns seeded data from Railway-hosted DB.

Open questions to resolve:
- Q0.1: ORM choice — Drizzle vs Prisma? (Recommend Drizzle.)
- Q0.2: Migration tool — drizzle-kit or custom? (drizzle-kit.)
- Q0.3: Audit log: same DB / separate DB / append-only file? (Same DB, dedicated table, no UPDATE/DELETE permissions for app role.)

### Sprint 1 — Domain Core (5 days)

**Goal:** All write paths for asset/version/test-case management work via REST + CLI.

Tasks:
1. Domain types in `packages/domain` (zod schemas + TS types).
2. Asset CRUD: register, get, list, deprecate.
3. Version CRUD: create draft, edit draft (with optimistic lock), list versions of asset, get specific version.
4. Variable contract attached to asset + carried in version snapshots.
5. Test case CRUD scoped to asset.
6. Audit log writes on every state change (transactional).
7. CLI commands: `promptops asset register`, `... version draft`, `... test add`, etc.
8. Unit tests per repository function. Integration tests against test Postgres.

Agents: `tdd-guide` (primary), `code-reviewer` after each PR, `security-reviewer` on auth + audit log.

Exit gate: Full happy path from CLI: register asset → create draft → add 3 test cases → fetch all of it back.

Open questions:
- Q1.1: How is the prompt body templated? Mustache / Handlebars / custom `{{var}}`? (Recommend custom minimal — substitute `{{name}}`, no logic. Keeps assets portable.)
- Q1.2: What's the storage format for the prompt body? Raw string / structured blocks (system + user)? (Recommend structured: `{ system?: string, user: string }`. Single-string assets supported by leaving system null.)
- Q1.3: Soft-delete vs hard-delete for test cases? (Soft. Audit trail.)
- Q1.4: Concurrent draft edits — etag strategy? (Yes, `If-Match` header with version etag. 409 on conflict.)

### Sprint 2 — Runner & Comparison (5 days)

**Goal:** Run a test suite, persist results, compare versions, produce regression report.

Tasks:
1. Provider adapter interface: `runPrompt(version, inputs) → { output, latencyMs, tokens, costUsd }`.
2. OpenAI adapter (use official `openai` SDK, gpt-4o-mini default).
3. Variable validation (zod-based) before any LLM call.
4. Prompt template renderer.
5. Test runner: orchestrate N runs per case, write to `run_results`, enforce per-run cost cap from env.
6. Assertions: `exact`, `json_schema`, `contains`, `not_contains`. (Sprint 3 adds `semantic_similarity`.)
7. Output blob storage: S3 or local FS via abstraction.
8. Diff engine — prompt body diff (use `diff` library, word-level via custom tokenizer), structured diff for variable contract.
9. Comparator: pair active vs draft results → classify transitions → emit regression report JSON.
10. REST: `POST /runs`, `GET /runs/:id`, `POST /compare`.
11. CLI: `promptops run`, `promptops compare`.

Agents: `tdd-guide` → `code-reviewer` → `security-reviewer` (provider key handling + cost cap enforcement).

Exit gate: From CLI, run draft against suite, run active against suite, get a regression report listing PASS→FAIL transitions.

Open questions:
- Q2.1: Determinism strategy when provider returns no seed support? (N=5, require ≥4/5 pass. Document per-provider in adapter.)
- Q2.2: Cost cap scope — per-run / per-day / per-asset? (Per-run hard cap from env. Per-day soft warning. Per-asset is V1.)
- Q2.3: Where does the cost ledger live? (Reuse pattern from Shadow `cost-ledger.ts`.)
- Q2.4: Diff library choice — `diff-match-patch` / `jsdiff` / custom? (`jsdiff` for body, custom JSON diff for structured.)
- Q2.5: Output blob format — raw text only / raw + parsed? (Both. Raw for forensic, parsed for fast comparison.)

### Sprint 3 — Promotion + Web UI Skeleton (5 days)

**Goal:** End-to-end happy path with web UI; promotion gates work.

Backend tasks:
1. Release decision layer: enforce all 6 promotion preconditions.
2. Atomic state transition (Postgres transaction): previous → archived, active → previous, draft → active.
3. Test suite snapshot on promote.
4. Audit log entry written before state mutation.
5. Release notes auto-draft endpoint.
6. Override mechanism: hard-regression override requires `justification` body field, recorded in audit.
7. Rollback endpoint.

UI tasks (Next.js 16, app router):
1. Asset list page.
2. Asset detail: variables, versions, test cases, active marker.
3. Version detail: body, changelog, run history.
4. Diff page: prompt diff + output diff + behavior diff (three panels).
5. Promote button with preconditions checklist (live).
6. Release notes editor modal.
7. Audit log feed (last 30 days).

Agents: `tdd-guide` (backend), `uiux-pro-max-designer` (system spec for UI), `magic-ui-component-gen` (components), `e2e-runner` (Playwright suite for the promote flow).

Exit gate: A user can register an asset via UI, draft a version, run tests, see diff, promote, then roll back — all without touching the CLI.

Open questions:
- Q3.1: Release notes generation — pure template or LLM-assisted? (Template only at MVP. LLM-assisted V1.)
- Q3.2: UI auth — same API token (paste in) / magic link / Supabase Auth? (Single-org MVP: paste API token. SSO is V2.)
- Q3.3: Realtime updates on long test runs — SSE / polling / WebSocket? (Polling every 2s for MVP. SSE later.)
- Q3.4: Color system + typography — pick now via `uiux-pro-max-designer`. (Run skill before sprint 3 day 1.)

### Sprint 4 — Runtime SDK + Hardening (4 days)

**Goal:** Production apps can fetch the active version of an asset and render it; system is launch-ready.

Tasks:
1. TypeScript runtime SDK in `packages/sdk-ts`:
   - `client.getActive(assetId)` → returns prompt body + variable contract + model config.
   - `client.render(assetId, inputs)` → server-side render (variable validation + template fill).
   - Local cache with TTL (default 60s). Cache invalidation on promote signaled via webhook (optional).
2. Webhook on promote/rollback (configurable URL).
3. Slack notification adapter.
4. Rate limiting on runs (per-token, per-minute).
5. Structured logging (`pino`) with redaction of prompt inputs that might contain PII.
6. OpenAPI spec generated from Hono routes.
7. Dockerfile + Railway deploy config finalized.
8. README + quickstart for the deployed instance.

Agents: `security-reviewer` (full pass), `code-reviewer`, `build-error-resolver`, `e2e-runner` (smoke suite against deployed Railway instance).

Exit gate: A second app (use Shadow as the guinea pig) imports the SDK, fetches `shadow.daily-classifier`, renders it, calls OpenAI — and a promote in PromptOps web UI shows up in Shadow within 60 seconds.

Open questions:
- Q4.1: Webhook delivery guarantees — at-least-once with retry? (Yes, 3 retries with exponential backoff.)
- Q4.2: SDK behavior on PromptOps outage — last-known-good cache / fail-fast? (Stale cache served; warning logged. Fail-fast is opt-in via constructor flag.)
- Q4.3: PII redaction in logs — opt-in or default-on? (Default-on. Log structure: `{ inputs_redacted: true, input_hashes: [...] }`.)

---

## 3. Cross-Cutting Workstreams

Run in parallel with sprints, not sequentially.

### 3.1 Quality Gate

- Lint + format on pre-commit (biome).
- Unit + integration tests in CI on every PR.
- Coverage gate at 80% via `c8` or `vitest --coverage`.
- Playwright E2E on staging deploy.
- `code-review` skill on every PR before merge.

### 3.2 Security

Pass with `security-reviewer` at:
- End of Sprint 1 (auth, audit log).
- End of Sprint 2 (provider key handling, cost cap).
- End of Sprint 4 (full pre-launch).

Use `security-review` skill checklist.

### 3.3 Documentation

The existing `projects/promptops-tool/` artifact is the source of truth for behavior. Implementation must not drift.

- `behavior-spec.md` updated only via PR; treated as spec lock.
- `architecture.md` updated when implementation reveals layer changes.
- Add `IMPLEMENTATION-NOTES.md` for choices that don't belong in the spec (library picks, infra config).

### 3.4 Observability

Bake in from sprint 1:
- Structured logs.
- Per-run metrics: latency, tokens, cost, pass/fail.
- Aggregate dashboards (Grafana / Railway built-ins).
- Cost ledger queryable by asset and by day.

---

## 4. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Provider non-determinism wider than expected | High | Medium | N=5 runs, median-based comparison, surface variance explicitly. |
| Diff UX is genuinely hard to design well | High | High | Sprint 3 includes a Friday UX review with real prompt from Shadow. |
| Audit log table grows unbounded | Medium | Low | 90-day cold-tier migration scheduled job V1. |
| Scope creep into "playground" features | High | Medium | Hold the line. Every feature request gets a one-line MVP-vs-V1+ tag. |
| OpenAI rate limits during runs of large suites | Medium | Medium | Concurrent run cap from env; backoff with jitter; surface ETA. |
| Solo build burns out mid-sprint 3 | Medium | High | Time-box sprints. Cut UI to bare bones if needed. CLI is the durable interface. |
| Postgres on Railway hits resource limits | Low | Medium | Plan migration path to dedicated Supabase tier; nothing in schema blocks it. |

---

## 5. Open Questions To Resolve

Grouped by when they bite. Earlier = more urgent.

### Pre-Sprint 0 (must answer)

- Q-PS-1: Final stack confirm — Hono + Drizzle + Postgres + Next.js + Railway? Or substitute?
- Q-PS-2: Author identity model — single user MVP / multi-user with API tokens / proper auth? (Recommend single API token = single user for MVP.)
- Q-PS-3: Does the MVP include the runtime SDK or stop at the management API? (Recommend include SDK; without it the tool is not production-usable.)
- Q-PS-4: How is success measured at MVP exit? (Recommend: Shadow project uses PromptOps for at least one prompt asset for 1 week with zero rollbacks needed because no regression slipped.)

### During Sprint 1 (must answer before sprint 2)

- Q-S1-1: Variable templating syntax final pick? (See Q1.1.)
- Q-S1-2: Prompt body schema — flat string or structured? (See Q1.2.)
- Q-S1-3: How are model configs versioned — embedded in version row or separate `model_configs` table? (Recommend embedded snapshot. Simpler.)
- Q-S1-4: Default test case minimum count for promotion — hardcoded 3 or per-asset config? (Hardcoded 3 at MVP. Configurable V1.)

### During Sprint 2 (must answer before sprint 3)

- Q-S2-1: Soft regression threshold default? (See doc: 0.85 cosine. Confirm.)
- Q-S2-2: Performance regression thresholds — latency +50%, cost +30% — keep or tune? (Keep for MVP, instrument to refine.)
- Q-S2-3: When suite test takes >5 minutes, what's the UX? (Background job, status polling, email-on-complete optional.)
- Q-S2-4: Override justification — free text only or structured (root cause + risk acknowledged)? (Free text for MVP. Tag taxonomy V1.)

### During Sprint 3 (must answer before sprint 4)

- Q-S3-1: Promote button enabled state — show preconditions inline as a checklist or block silently? (Checklist inline. Each item links to fix.)
- Q-S3-2: Release notes — edit-in-place or modal? (Modal. Forces explicit save.)
- Q-S3-3: Theme — light only / dark only / both? (Both via system preference. Cheap with `uiux-pro-max-designer` palette.)

### During Sprint 4 (must answer before launch)

- Q-S4-1: SDK cache invalidation — pull-only / webhook push / SSE? (Pull-only with 60s TTL at MVP. Webhook optional. SSE V1.)
- Q-S4-2: First real asset to onboard — Shadow daily-classifier or Area Mosa booking? (Recommend Shadow. More test cases available.)
- Q-S4-3: Public launch posture — private beta / open source / SaaS? (Private beta with self-hosting docs. Decide on monetization in V1 planning.)

---

## 6. Definition of Done — MVP

The MVP ships when:

1. All 18 documentation files in `projects/promptops-tool/` are reflected in working code.
2. A real production prompt (Shadow daily-classifier) lives in PromptOps and is served via the runtime SDK in the Shadow app.
3. At least one prompt iteration has gone through the full lifecycle: draft → tests → diff → promote → observe.
4. At least one rollback has been exercised (even if a drill).
5. Audit log shows full trail for that asset's history.
6. Test coverage ≥ 80%.
7. Security pass complete.
8. Deployed to Railway with one-command setup documented in README.
9. CLI + Web UI feature parity for the core flow.
10. Acceptance criteria in `acceptance-criteria.md` all checkable.

---

## 7. Suggested Kickoff Sequence

Day 0: Decision call. Resolve pre-sprint-0 questions. 30 minutes.
Day 1: Sprint 0 begins. `plan` skill → `planner` agent → first PR.
Daily: Stand-up against the open-questions list. Resolve at most 2/day.
End of each sprint: Demo + retro + go/no-go on next sprint.

End of sprint 4: Soft launch on Shadow. Observe for 1 week. Capture learnings into `IMPLEMENTATION-NOTES.md`. Plan V1 from real usage.
