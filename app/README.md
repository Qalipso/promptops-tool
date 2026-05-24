# PromptOps — App

Monorepo for the PromptOps MVP. Hono API + Next.js UI (Sprint 3).

## Repo structure

```
app/
├── apps/
│   ├── api/          # Hono REST API (Node, pnpm, Drizzle, PostgreSQL)
│   └── web/          # Next.js UI — Sprint 3
├── packages/
│   └── domain/       # Zod schemas shared by api + web
├── package.json      # Workspace root
├── pnpm-workspace.yaml
├── turbo.json
└── biome.json
```

## Prerequisites

| Tool | Version |
|------|---------|
| Node | 20+ |
| pnpm | 9+ |
| PostgreSQL | 15+ |

## Quick start

```bash
# 1. Clone and install
cd projects/promptops-tool/app
pnpm install

# 2. Configure env
cp .env.example apps/api/.env
# Edit apps/api/.env — set DATABASE_URL and PROMPTOPS_API_TOKEN

# 3. Run migrations
pnpm --filter @promptops/api db:migrate

# 4. Seed demo data
pnpm --filter @promptops/api db:seed

# 5. Start API in dev mode (hot reload)
pnpm dev
```

API is available at `http://localhost:3001`.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | `postgres://user:pass@host:5432/promptops` |
| `PROMPTOPS_API_TOKEN` | yes | Minimum 16-char Bearer token for API auth |
| `OPENAI_API_KEY` | Sprint 2+ | Required for test runs |
| `PORT` | no | Default `3001` |
| `LOG_LEVEL` | no | Default `info` |
| `MAX_USD_PER_RUN` | no | Default `0.50` |
| `MAX_USD_PER_DAY` | no | Default `5.00` |

## API endpoints (Sprint 0–1)

All routes under `/api/v0` require `Authorization: Bearer <token>`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | DB connectivity check (no auth) |
| GET | `/api/v0/assets` | List all prompt assets |
| POST | `/api/v0/assets` | Create prompt asset |
| GET | `/api/v0/assets/:id` | Get single asset |
| GET | `/api/v0/assets/:id/versions` | List versions for asset |
| GET | `/api/v0/assets/:id/test-cases` | List active test cases |

### Response envelope

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "...", "details": null } }
```

## Testing

```bash
# Unit + integration (vitest)
pnpm test

# Watch mode
pnpm --filter @promptops/api test:watch

# Type check
pnpm typecheck
```

## Database

```bash
# Generate migration files after schema changes
pnpm --filter @promptops/api db:generate

# Apply migrations
pnpm --filter @promptops/api db:migrate

# Seed demo data
pnpm --filter @promptops/api db:seed
```

## Turbo tasks

```bash
pnpm build       # Build all packages
pnpm dev         # Dev all apps in parallel
pnpm test        # Test all packages
pnpm lint        # Lint all packages
pnpm typecheck   # Type-check all packages
```

## Deploy (Railway)

1. Create a Railway project, add a PostgreSQL plugin.
2. Set env vars in Railway dashboard (see table above).
3. Deploy command: `pnpm --filter @promptops/api start`
4. Build command: `pnpm install && pnpm build`

See `../../docs/` for full architecture and design docs.
