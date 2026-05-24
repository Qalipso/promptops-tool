# PromptOps — Local-First Minimal Plan

Цель: простой локальный инструмент для хранения, версионирования и рендеринга промтов. UI + CLI. **Без тестовых ранов, без LLM-вызовов, без Railway/облака.**

---

## 1. Что уже есть (audit)

### API (`apps/api/` — Hono + Drizzle + Postgres)
| Сущность | Статус |
|---|---|
| Schema (assets, versions, fixtures, fixture_snapshots, render_validations, audit_log) | done |
| `assets` CRUD | done |
| `versions` create/get/list/promote/archive/rollback | done |
| `fixtures` CRUD | done |
| `render` (template substitute + checks, no LLM) | done |
| `audit` log + stats | done |
| Bearer-token middleware | done |
| Drizzle migrations + seed | done |
| Vitest tests на repos + template-engine | done |

### Web UI (`apps/web/` — Next.js 15)
| Страница | Статус |
|---|---|
| `/` список assets | done |
| `/assets/new` создать asset | done |
| `/assets/[id]` detail | done |
| `/assets/[id]/versions/new` создать version | done |
| `/assets/[id]/versions/[vid]` detail + promote + render preview | done |
| `/assets/[id]/fixtures/new` + `[fid]/edit` | done |
| `/assets/[id]/diff` diff между версиями | done |
| `/assets/[id]/audit` audit log | done |
| `/assets/[id]/runs` **удалено**, redirect-страница объясняет | done |

### Packages
| Package | Статус |
|---|---|
| `packages/domain` (Zod схемы: asset, version, variable, model-config, test-case, audit, ids) | done |
| `packages/runner` | **пусто** (src/ — пустой) |
| `packages/diff` | **пусто** (src/ — пустой) |

### CLI (`apps/cli/src/`)
**Пусто.** Нет ни одного файла. Только директория.

### Документация
- `README.md`, `product-brief.md`, `behavior-spec.md`, `architecture.md`, `roadmap.md`, `acceptance-criteria.md`, `IMPLEMENTATION-PLAN.md` — все есть
- `docs/` — 9 design-docs (lifecycle, versioning, variable-design, prompt-diff, etc.)

### Состояние сервера
- API ожидает Postgres (`DATABASE_URL`) — **тяжёлая зависимость для локального инструмента**
- Web ожидает API на `localhost:3001`
- Аутентификация — Bearer token (избыточно для single-user локально)

---

## 2. Главные пробелы (gap → нужно)

| # | Пробел | Решение |
|---|---|---|
| G1 | Postgres обязателен → не запустить без docker/локальной БД | Перейти на **SQLite + better-sqlite3** через Drizzle (drop-in). Файл `~/.promptops/promptops.db`. |
| G2 | Bearer-токен требуется всегда | Сделать **local mode**: если `PROMPTOPS_LOCAL=1` — auth выключен, actor = `local` |
| G3 | CLI пуст | Минимальный CLI: `list`, `show`, `new`, `version`, `render`, `diff`, `promote`, `export`, `import` |
| G4 | `packages/diff` пуст, но web `/diff` уже работает inline | Вынести diff в пакет, переиспользовать в CLI |
| G5 | Нет однокомандного старта | `pnpm start:local` → migrate sqlite + seed + api + web вместе |
| G6 | Нет экспорта/импорта в файлы | `export <asset>` → YAML/JSON, `import <file>` → создаёт asset+versions+fixtures. Для git-storage промтов рядом с кодом проекта. |
| G7 | Нет file-watch sync (опционально) | V2 — `promptops watch ./prompts/` подхватывает изменения |
| G8 | Web ожидает env-var с токеном | Local mode: web вызывает api без токена когда `PROMPTOPS_LOCAL=1` |

---

## 3. Что **выкинуть** из текущего scope

| Удалить | Почему |
|---|---|
| Railway deploy блок в README | Не нужно для локального |
| `runs/` web page (уже редирект) — оставить редирект | OK |
| `MAX_USD_PER_RUN`, `MAX_USD_PER_DAY`, `OPENAI_API_KEY` env | Не нужны, LLM не вызывается |
| Anthropic/OpenAI provider планы из `roadmap.md` MVP | Не в scope local-first |
| Test-runs, regression-checks из docs (оставить для истории, но пометить как "future") | Не реализуем сейчас |

---

## 4. Финальная архитектура (local-first MVP)

```
~/.promptops/
├── promptops.db          # SQLite (sqlite migrations applied here)
└── exports/              # экспорт/импорт промтов в YAML
```

```
projects/promptops-tool/app/
├── apps/
│   ├── api/        # Hono + Drizzle (sqlite dialect), single-binary мод
│   ├── web/        # Next.js UI
│   └── cli/        # минимальный CLI (commander или sade)
├── packages/
│   ├── domain/     # уже готов
│   └── diff/       # NEW: pure diff funcs (text + structured)
```

**Storage backend выбор:**
- Default: **SQLite** (`better-sqlite3` + `drizzle-orm/better-sqlite3`)
- Fallback: Postgres (для тех, кто хочет, env-toggle `PROMPTOPS_DRIVER=postgres`)

**Auth:**
- `PROMPTOPS_LOCAL=1` (default в dev) → no auth, actor = `local`
- Прод-режим (если когда-то понадобится) — bearer как сейчас

---

## 5. План работ (5 коротких шагов)

### Шаг 1. SQLite-driver и local-mode (полдня)
- Добавить `better-sqlite3`, разделить `db/client.ts` на pg/sqlite через flag
- Скопировать миграции под sqlite (`infra/migrations-sqlite/`)
- `PROMPTOPS_LOCAL=1` → bypass auth middleware
- Файл БД: `~/.promptops/promptops.db` (auto-create)
- Smoke-test: API стартует без Postgres

### Шаг 2. Минимальный CLI (день)
Команды:
```
promptops list                              # все assets
promptops show <asset>                      # detail + versions
promptops new <asset> [--owner --tags]      # создать asset
promptops version new <asset> -m "msg"      # создать version (открывает $EDITOR с template)
promptops version show <asset> <ver>
promptops render <asset> <ver> --fixture <name>   # рендер + checks
promptops render <asset> <ver> --input k=v        # ad-hoc
promptops diff <asset> <verA> <verB>
promptops promote <asset> <ver>
promptops export <asset> > asset.yaml
promptops import asset.yaml
promptops audit <asset> [--limit 20]
```
- Bin entry: `apps/cli/bin/promptops.mjs`
- HTTP-клиент к локальному API на `localhost:3001`
- `pnpm link --global` или `npm i -g .` для глобального доступа

### Шаг 3. Пакет `packages/diff` (полдня)
- Вынести diff-логику из `app/assets/[id]/diff/DiffView.tsx`
- Pure funcs: `diffPromptBody(a, b)`, `diffVariables(a, b)`, `diffModelConfig(a, b)`
- Используется CLI `diff` и web

### Шаг 4. Export/Import YAML (полдня)
- Schema YAML:
```yaml
asset:
  id: shadow-daily-classifier
  owner: edu
  description: ...
  tags: [shadow, classification]
  variable_contract: [...]
  model_config: {...}
versions:
  - version: 0.1.0
    body: { system: "...", user: "..." }
    changelog: "initial"
    state: active
fixtures:
  - name: short-entry
    inputs: { text: "..." }
    checks: [...]
```
- `export <asset>` → файл, `import <file>` → создание/обновление
- Цель: коммитить промты в git-репо проекта рядом с кодом

### Шаг 5. One-command launcher (полдня)
- Root `package.json`:
```json
"scripts": {
  "start:local": "PROMPTOPS_LOCAL=1 turbo run dev --parallel"
}
```
- `db:migrate` запускается автоматически при первом старте api (idempotent)
- README local-quickstart:
```bash
git clone ...
pnpm install
pnpm start:local
# → API on :3001, UI on :3000, SQLite at ~/.promptops/
```

---

## 6. Acceptance (когда считаем done)

- [ ] `pnpm start:local` без Postgres стартует api+web с SQLite
- [ ] UI создаёт asset → version → fixture → render preview работает
- [ ] CLI: все 11 команд работают против локального API
- [ ] `export` + `import` round-trip сохраняет asset со всеми версиями и фикстурами
- [ ] `diff` package переиспользуется в CLI и UI
- [ ] Никаких упоминаний LLM-runs/Railway в README
- [ ] Все vitest проходят

---

## 7. Что в future-pile (не делаем сейчас)

- MCP-server обёртка (после MVP)
- File-watch sync `./prompts/` ↔ DB
- Анализ usage (какие версии где зовутся)
- Multi-user / auth/oauth
- Postgres mode (оставлен как fallback flag, но не документируется)
- Test-runs с LLM (out of scope — это другой проект, AI Eval)
- Cloud sync

---

## 8. Risks

| Риск | Митигация |
|---|---|
| Drizzle pg ≠ sqlite колонки (jsonb, timestamp tz) | Использовать `drizzle-orm/sqlite-core` с `text` для json + `integer`-unix для дат, аккуратный mapper |
| UUID в sqlite | `crypto.randomUUID()` в коде, varchar(36) колонки |
| Миграции — двойной набор | Сначала только sqlite, pg только если кто-то попросит |
| CLI и API запускаются отдельно — UX | `start:local` стартует api в фоне, CLI ждёт `/health` перед командой |

---

## TL;DR

Текущий код — 80% готовый local-first инструмент, привязанный к Postgres и Bearer. Надо:
1. Переключить storage на SQLite
2. Выключить auth в local mode
3. Написать минимальный CLI (11 команд)
4. Вынести diff в пакет
5. Сделать export/import YAML
6. Один скрипт `start:local`

5 шагов, ~3 дня работы. Без новых сущностей, без LLM, без облака.
