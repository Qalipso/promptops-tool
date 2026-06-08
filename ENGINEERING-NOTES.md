# Engineering Notes — PromptOps

Key technical decisions, trade-offs, and architectural reasoning. Intended for technical interviews and engineering review.

---

> **Direction note (2026-06):** PromptOps pivoted to **local-first**. The DB is now
> **SQLite (better-sqlite3)**, not Postgres; auth is bypassed in local mode. A **CLI** and a
> guided **Builder** wizard were added. This document reflects the current local-first stack.

## Stack

| Layer | Choice | Alternatives considered |
|-------|--------|------------------------|
| API | Hono (TypeScript) | Express, Fastify |
| ORM | Drizzle (sqlite-core) | Prisma, Kysely |
| Database | **SQLite** (better-sqlite3) | PostgreSQL (original), PlanetScale |
| Frontend | Next.js 15 App Router | — |
| CLI | Zero-dep Node (`node:util` parseArgs + fetch) | sade, commander |
| Package manager | pnpm (monorepo) + Turborepo | npm workspaces |
| Deployment | Local single-user (`pnpm start:local`) | Vercel + Postgres |

---

## Monorepo Layout

```
promptops-tool/
  app/
    apps/
      api/          Hono API server (SQLite)
      web/          Next.js management console + Builder wizard
      cli/          promptops CLI
    packages/
      domain/       Shared Zod schemas / types
      diff/         Pure line + structured diff (used by CLI and web)
      builder/      Pure spec → prompt compiler, test-case gen, eval parser
```

`packages/domain` is the type contract. `packages/diff` and `packages/builder` hold pure,
deterministic logic consumed by both API and CLI/web — no I/O, fully unit-tested.

---

## Key Technical Decisions

### 1. Content-addressed version identity

**Decision:** Every `PromptVersion` is identified by a SHA-256 hash of its content + model config. The `content_hash` field is computed on creation and never updated.

**Rationale:** Sequential version numbers (`v1`, `v2`, `v3`) are human-readable but semantically weak: the "same" version number can map to different content in different environments (staging vs production drift, branch deployments). Hash identity is globally unique, content-deterministic, and deduplication-aware — two identical prompts in different assets get the same hash, which is a meaningful signal.

**Implementation:**
```typescript
import { createHash } from "node:crypto";

export function computeContentHash(content: string, modelConfig: ModelConfig): string {
  return createHash("sha256")
    .update(content)
    .update(JSON.stringify(modelConfig))
    .digest("hex");
}
```

**Trade-off:** Hashes are not human-readable. Version display in the UI shows both `content_hash.slice(0, 8)` (for identity) and a human label (`v1.0.0`, `v1.1.0`) assigned by the engineer on creation. The hash is the canonical identity; the label is a convenience alias.

---

### 2. Variable validation layer

**Decision:** The `renderPrompt(asset, variables)` function validates variable completeness and types before constructing the final string. Missing required variables and type mismatches throw a typed error, not a runtime exception from the LLM.

**Rationale:** If variable validation happens inside the model call, the failure signal is a bad output. If it happens at the layer boundary, the failure signal is a typed error at the call site — before any API credit is spent. This also makes the render function deterministic and pure: same input → same output, always.

**Schema:**
```typescript
type VariableSchema = {
  name: string;
  type: "string" | "number" | "boolean" | "enum";
  required: boolean;
  enum_values?: string[];
};
```

**Rendered hash:** `renderPrompt` also returns a `rendered_hash` — SHA-256 of the final rendered string. Two calls with the same variables return the same hash. This enables caching at the call site without storing the full rendered string.

---

### 3. Drizzle over Prisma

**Decision:** Drizzle ORM for schema definition and query building.

**Rationale:**
- Schema is TypeScript code, not a separate DSL. `drizzle-kit generate` is only needed for migrations, not for type inference.
- No `prisma generate` to run in CI before the TypeScript compiler sees the types.
- Query builder is more explicit about what SQL is being generated — important for a team that cares about N+1 avoidance.
- `drizzle-kit generate` produces SQLite migrations applied on boot via the better-sqlite3 migrator.

**Dialect note:** schema uses `drizzle-orm/sqlite-core` — `text`/`integer` columns, JSON stored as
`text({ mode: 'json' })`, dates as `integer({ mode: 'timestamp_ms' })`, UUIDs as `text` +
`randomUUID()`, enums as `text({ enum: [...] })`. No `pgEnum`/`jsonb`/`timestamptz`. Queries use
`new Date()` (not `sql\`now()\``) and `db.get`/query builder (no `db.execute`).

**Trade-off:** Prisma has better ecosystem docs and a polished Studio. For a small, stable,
single-user local schema, Drizzle + SQLite keeps install light (no DB server) and types first-class.

---

### 4. Hono over Express

**Decision:** Hono for the API server.

**Rationale:**
- Edge-compatible by design — the same code runs on Node, Cloudflare Workers, Vercel Edge, and Bun without modification.
- Route handler types are strict: request body, query params, and response shape are typed at the route definition level.
- Zero dependencies. Express's middleware ecosystem is large but unmaintained; Hono's built-in middleware covers the common cases.

**Key pattern — typed route handler:**
```typescript
app.post(
  "/assets/:id/versions",
  zValidator("json", CreateVersionSchema),
  async (c) => {
    const body = c.req.valid("json");  // typed as CreateVersionInput
    const version = await createVersion(body);
    return c.json(version, 201);  // typed as PromptVersion
  }
);
```

---

### 5. Append-only audit log

**Decision:** `audit_log` table is insert-only. No update or delete operations. Every promote, archive, and rollback event is an immutable row.

**Schema (SQLite):**
```typescript
export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  actor: text("actor").notNull(),
  event_type: text("event_type").notNull(), // version.created | version.promoted | eval.imported | ...
  asset_id: text("asset_id"),
  version_id: text("version_id"),
  payload: text("payload", { mode: "json" }).notNull(),
  payload_hash: text("payload_hash").notNull(),
  occurred_at: integer("occurred_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});
```

**Rationale:** Mutable audit logs are not audit logs. An audit log that can be edited is a note. An append-only log is evidence. For a tool where the question "what was the prompt doing at time T?" must have an unambiguous answer, immutability is not a design preference — it is a correctness requirement.

---

### 6. pnpm workspaces over npm workspaces

**Decision:** pnpm for the monorepo with workspace protocol (`workspace:*`).

**Rationale:**
- Strict hoisting by default — packages cannot accidentally import a dependency not listed in their own `package.json`. Finds missing dep declarations at install time, not at runtime on a CI server.
- Symlinked packages in `node_modules` rather than copied — disk usage is much lower for large monorepos.
- `pnpm -r run build` with filtering is cleaner than npm's workspace flag syntax.

**Trade-off:** pnpm's strict mode occasionally rejects patterns that npm accepts. Mostly this surfaces bugs in transitive dependencies.

---

### 7. Local-mode auth + SQLite file location

**Decision:** `PROMPTOPS_LOCAL=1` (default) bypasses Bearer auth, sets `actor = "local"`. DB is a
single SQLite file at `~/.promptops/promptops.db` (override `PROMPTOPS_DB_PATH`), auto-created on
boot with `journal_mode=WAL` and `foreign_keys=ON`. Token is only required when `PROMPTOPS_LOCAL=0`.

**Gotcha — IPv6 localhost:** Node's `fetch` resolves `localhost` to `::1` first; the API binds
IPv4. Server-side web fetches to `http://localhost:3013` failed with `ECONNREFUSED`. Fix: use
`http://127.0.0.1:3013` everywhere the web/CLI talks to the API. Shell `curl` was unaffected
(uses IPv4), which masked the issue initially.

**Gotcha — stale dist:** `pnpm start` runs `node dist/server.js`; after the Postgres→SQLite swap a
stale `dist` still imported `pg` → `ERR_MODULE_NOT_FOUND` at boot. Always rebuild before `start`.
Dev (`tsx watch`) recompiles from source so was unaffected. `pnpm start:local` uses dev.

---

## API Route Summary

All `/api/v0/*` routes run through auth middleware (bypassed in local mode). Diff is computed
client-side via `@promptops/diff` — there is no diff API route.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | DB connectivity check (public) |
| GET / POST | `/api/v0/assets` | List / create asset |
| GET / PATCH | `/api/v0/assets/:id` | Get / update asset |
| GET / POST | `/api/v0/assets/:id/versions` | List / create version |
| GET | `/api/v0/assets/:id/active` | Active version (agent-friendly) |
| POST | `/api/v0/assets/:id/versions/:vid/promote` | Promote draft → active |
| POST | `/api/v0/assets/:id/versions/:vid/archive` | Archive a version |
| POST | `/api/v0/assets/:id/versions/:vid/render` | Render template (no LLM) |
| POST | `/api/v0/assets/:id/rollback` | Restore previous active |
| GET | `/api/v0/assets/:id/audit` · `/stats` | Audit log · stats |
| PUT / GET | `/api/v0/assets/:id/builder-spec` | Save / get builder spec |
| POST | `/api/v0/assets/:id/compile` | Compile spec → prompt body |
| GET / POST | `/api/v0/assets/:id/test-cases` | List / create test case |
| POST | `/api/v0/assets/:id/test-cases/generate` | Generate baseline cases |
| POST / GET | `/api/v0/assets/:id/eval-import` · `eval-imports` | Import / list eval results |

---

## What I Would Add for Production

1. **Runtime SDK.** `getActiveVersion(assetId)` as a first-class TypeScript + Python package. Caches the active version in process memory with a short TTL. Falls back to the API. This is the primary interface for production code; the web UI is secondary.
2. **Test runner with LLM provider.** Currently the test suite schema exists but the runner does not call a real LLM. The runner would use the `ProviderAdapter` interface — OpenAI first, then Anthropic, then local models.
3. **Soft regression detection.** Currently only hard regressions (pass → fail) are detected. Soft regression (pass but semantic similarity to expected output dropped below threshold) requires an LLM judge.
4. **RBAC.** Owner vs editor vs viewer per asset. Currently all operations are unauthenticated (local-only tool).
5. **Webhook on promote.** `POST /webhooks/:id` called after every promotion. Enables downstream systems (staging deploys, cache invalidation) to react to prompt changes.
