# PromptOps — App

Local-first prompt versioning tool. Hono API + Next.js UI + CLI, backed by SQLite.
No Postgres, no cloud, no LLM calls — a single-user tool you run on your machine and
commit prompts to git alongside your code.

## Repo structure

```
app/
├── apps/
│   ├── api/          # Hono REST API (Node, Drizzle, SQLite via better-sqlite3)
│   ├── web/          # Next.js 15 management UI
│   └── cli/          # promptops CLI (zero-dep, talks to local API)
├── packages/
│   ├── domain/       # Zod schemas shared by api + web
│   └── diff/         # Pure line + structured diff (used by CLI and UI)
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Prerequisites

| Tool | Version |
|------|---------|
| Node | 20+ |
| pnpm | 9+ |

That's it. No database server — SQLite lives in a file at `~/.promptops/promptops.db`.

## Quick start (one command)

```bash
cd projects/promptops-tool/app
pnpm install
pnpm start:local
```

`start:local` runs migrations, seeds a demo asset, then starts:

- API  → `http://localhost:3013`
- UI   → `http://localhost:3014`

SQLite is auto-created at `~/.promptops/promptops.db` on first boot. Local mode
(`PROMPTOPS_LOCAL=1`, the default) bypasses auth — the actor is recorded as `local`.

## CLI

```bash
# From the monorepo root, via the workspace script:
pnpm cli list
pnpm cli show demo.email.subject-line-gen

# Or build once and use the global binary:
pnpm --filter @promptops/cli build
node apps/cli/dist/main.js list      # or: npm link, then `promptops list`
```

Commands:

```
list                                   List all assets
show <asset>                           Asset detail + versions
new <asset> [--owner --desc --tags]    Register an asset
active <asset>                         Show the active version

version list <asset>                   List versions
version show <asset> <ver>             Version detail (body)
version new <asset> <ver> [-m msg] [--user .. --system ..]
                                       Create a draft (opens $EDITOR if --user omitted)
promote <asset> <ver>                  Promote a draft to active
archive <asset> <ver>                  Archive a non-draft version
rollback <asset> --reason "..."        Restore the previous active version

render <asset> <ver> [-i k=v ...] [--save]
                                       Render template with manual inputs (no LLM)
diff <asset> <verA> <verB>             Diff prompt body + model config
audit <asset> [--limit N]              Audit log

export <asset> [--out file.yaml]       Export asset + versions to YAML (git-friendly)
import <file.yaml>                     Recreate asset + versions from YAML
```

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PROMPTOPS_LOCAL` | no | `1` | Local single-user mode — auth bypassed, actor `local`. Set `0` to require a token. |
| `PROMPTOPS_DB_PATH` | no | `~/.promptops/promptops.db` | SQLite file location |
| `PROMPTOPS_API_TOKEN` | only if `PROMPTOPS_LOCAL=0` | — | Bearer token (min 16 chars) |
| `PORT` | no | `3013` | API port |
| `LOG_LEVEL` | no | `info` | Pino log level |

CLI also reads `PROMPTOPS_API_URL` (default `http://localhost:3013`) and, if auth is on,
`PROMPTOPS_API_TOKEN`.

## API endpoints

`/health` is public. Everything under `/api/v0` runs through auth middleware
(bypassed in local mode).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | DB connectivity check |
| GET | `/api/v0/assets` | List assets (with stats) |
| POST | `/api/v0/assets` | Create asset |
| GET | `/api/v0/assets/:id` | Get asset |
| PATCH | `/api/v0/assets/:id` | Update asset |
| GET | `/api/v0/assets/:id/versions` | List versions |
| POST | `/api/v0/assets/:id/versions` | Create version (draft) |
| GET | `/api/v0/assets/:id/active` | Active version (agent-friendly) |
| GET | `/api/v0/assets/:id/versions/:vid` | Get version |
| POST | `/api/v0/assets/:id/versions/:vid/promote` | Promote draft → active |
| POST | `/api/v0/assets/:id/versions/:vid/archive` | Archive a version |
| POST | `/api/v0/assets/:id/versions/:vid/render` | Render with manual inputs (no LLM) |
| POST | `/api/v0/assets/:id/rollback` | Restore previous active |
| GET | `/api/v0/assets/:id/audit` | Audit log |
| GET | `/api/v0/assets/:id/stats` | Version count + last render |

### Response envelope

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "...", "details": null } }
```

## Testing & checks

```bash
pnpm test        # vitest across packages
pnpm typecheck   # tsc --noEmit across packages
pnpm lint        # biome
```

## Database

```bash
pnpm db:generate   # regenerate SQLite migrations after schema changes
pnpm db:migrate    # apply migrations to ~/.promptops/promptops.db
pnpm db:seed       # insert the demo asset (idempotent)
```

To reset to a clean demo state: delete `~/.promptops/promptops.db*` and run
`pnpm db:migrate && pnpm db:seed`.

See `../../docs/` for architecture and design docs.
