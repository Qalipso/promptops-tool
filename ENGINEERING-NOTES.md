# Engineering Notes — PromptOps

Key technical decisions, trade-offs, and architectural reasoning. Intended for technical interviews and engineering review.

---

## Stack

| Layer | Choice | Alternatives considered |
|-------|--------|------------------------|
| API | Hono (TypeScript) | Express, Fastify |
| ORM | Drizzle | Prisma, Kysely |
| Database | PostgreSQL | SQLite, PlanetScale |
| Frontend | Next.js 15 App Router | — |
| Package manager | pnpm (monorepo) | npm workspaces, Turborepo |
| Deployment | Local (Postgres dependency) | Vercel + PlanetScale |

---

## Monorepo Layout

```
promptops-tool/
  app/
    apps/
      api/          Hono API server
      web/          Next.js management console
    packages/
      types/        Shared TypeScript types (PromptAsset, PromptVersion, TestSuite...)
      db/           Drizzle schema + client
```

`packages/types` is the contract between API and web. Both import from it. No code generation step required — changes to the schema propagate immediately across apps.

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
- `drizzle-kit push` for local development: schema changes apply immediately without a migration file.

**Trade-off:** Prisma has better ecosystem documentation, more community examples, and a polished Studio UI. For a new project with a small, stable schema, Drizzle's tradeoffs favor development velocity.

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

**Schema:**
```typescript
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  asset_id: text("asset_id").notNull(),
  version_id: uuid("version_id"),
  event: text("event").notNull(),  // "version.created" | "version.promoted" | "version.archived"
  actor: text("actor").notNull(),
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow().notNull(),
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

### 7. Database connection in Docker for local development

**Problem encountered:** PostgreSQL container had no host port binding initially. `DATABASE_URL=postgres://...@localhost:5432` failed — localhost inside the Next.js process ≠ localhost inside the container.

**Fix:** Connected the container to the bridge network, obtained the bridge IP (`172.17.0.2`). Updated `DATABASE_URL` to use the bridge IP.

**Lesson for production:** Use Docker Compose with a named service (`db`) and reference it as `postgres://...@db:5432`. The service name resolves inside the Docker network. No IP address required. For local-only dev without Docker Compose, use `pg_isready -h localhost` to confirm port binding before starting the app.

---

## API Route Summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/assets` | List all assets |
| POST | `/assets` | Create asset |
| GET | `/assets/:id` | Get asset + versions |
| POST | `/assets/:id/versions` | Create version |
| POST | `/assets/:id/versions/:vid/promote` | Promote version |
| POST | `/assets/:id/versions/:vid/render` | Render with variables |
| GET | `/assets/:id/diff` | Diff two versions |

---

## What I Would Add for Production

1. **Runtime SDK.** `getActiveVersion(assetId)` as a first-class TypeScript + Python package. Caches the active version in process memory with a short TTL. Falls back to the API. This is the primary interface for production code; the web UI is secondary.
2. **Test runner with LLM provider.** Currently the test suite schema exists but the runner does not call a real LLM. The runner would use the `ProviderAdapter` interface — OpenAI first, then Anthropic, then local models.
3. **Soft regression detection.** Currently only hard regressions (pass → fail) are detected. Soft regression (pass but semantic similarity to expected output dropped below threshold) requires an LLM judge.
4. **RBAC.** Owner vs editor vs viewer per asset. Currently all operations are unauthenticated (local-only tool).
5. **Webhook on promote.** `POST /webhooks/:id` called after every promotion. Enables downstream systems (staging deploys, cache invalidation) to react to prompt changes.
