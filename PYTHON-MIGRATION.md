# PromptOps — Python Migration Audit

## 1. Code audit (текущий TS-стек)

### Размер
| Слой | LOC | Файлов |
|---|---|---|
| api (Hono + Drizzle) | 2712 | 26 |
| web (Next.js 15) | 4181 | 29 |
| packages/domain (Zod) | 393 | 9 |
| **Итого активного кода** | **~7300** | **64** |

### Качество текущего TS-кода
| Аспект | Оценка | Комментарий |
|---|---|---|
| Architecture | хорошо | Чистое разделение routes → services → repos → schema. Pure funcs в template-engine/render-checker. |
| Tests | средне | Vitest на repos + template-engine. Нет интеграционных. Нет coverage gate. |
| Type safety | хорошо | Zod для I/O, drizzle inferred types. |
| Storage coupling | плохо | Жёсткая привязка к Postgres (drizzle pg dialect, jsonb, uuid, timestamptz). |
| Auth | избыточен для local | Bearer обязателен; нет local-bypass. |
| Bloat | средний | `web/` много action-файлов на каждую форму, ~500-строчные React-формы для fixtures/versions. UI можно упростить. |
| Dead code | минимум | `packages/runner` и `packages/diff` — пусто (src/). `runs/` web — заглушка. |
| Зависимости | тяжёлые | pnpm + turbo + drizzle + next + hono. ~3-5 минут install. |

### Чистая логика (которую легко портировать)
- `template-engine.ts` (64 LOC) — regex `{{var}}` substitution. **5 минут на Python.**
- `render-checker.ts` (365 LOC) — pure check evaluator. **1 час на Python.**
- `promotion-checklist.ts` (202 LOC) — validation logic. **30 минут.**
- `diff.ts` (web/lib/diff.ts, 134 LOC) — text/structured diff. **30 минут.**

### Грязная часть (привязка к стеку)
- Drizzle schema, миграции — переписать на SQLAlchemy/SQLModel + Alembic.
- Hono routes → FastAPI routers.
- Next.js UI → выбор: HTMX+Jinja / Streamlit / FastAPI+Alpine / переиспользовать TS UI как dumb-клиент.

---

## 2. Стоит ли переносить на Python?

### За
- Локальное хранение в **YAML/JSON-файлах + SQLite** — нативно для Python.
- `~/.promptops/prompts/` как git-репо рядом с проектом, без node_modules в 200 МБ.
- Стек простой: **FastAPI + SQLite + Jinja2 + HTMX**. Без turbo/pnpm/Next.js.
- Один `pip install promptops-cli` или `uv tool install` — глобальный CLI.
- Логика чистая (90% — pure funcs), переписать быстро.
- В корпусе уже **много Python-проектов** (graphify, ig-carousel-gen, shadow) — единый стек.
- LLM SDK (anthropic/openai) родные на Python если когда-то понадобится.

### Против
- 4181 LOC web уже написан и работает. Перенос ~3-5 дней.
- TS-types в `packages/domain` придётся дублировать как pydantic.
- Если планируется встроить SDK для пользователей TS-апп (Shadow, Edo) — нужен ещё JS-клиент.

### Вердикт
**Стоит**, если цель — single-user local-first tool с git-хранением. Текущий код избыточен для этой задачи (Postgres, Bearer, Turbo, Next-server-actions для CRUD).

---

## 3. Целевая Python-архитектура

### Stack
| Слой | Технология | Зачем |
|---|---|---|
| Storage | **YAML files + SQLite** | Файлы в git, SQLite для index/audit/cache |
| Backend | **FastAPI** | минимальный, async, OpenAPI бесплатно |
| ORM | **SQLModel** (pydantic+SQLAlchemy) | Zod-like схемы + ORM в одном |
| Migrations | **Alembic** | Стандарт для SQLAlchemy |
| Templating UI | **Jinja2 + HTMX + Tailwind CDN** | Zero-build, server-rendered. Hot-reload через uvicorn. |
| CLI | **Typer** (Click-based, type hints) | Auto-help, тоже на pydantic |
| Tests | **pytest + pytest-asyncio** | стандарт |
| Lint | **ruff + mypy** | быстро |
| Package manager | **uv** | в 10x быстрее pip |

### Структура
```
promptops-py/
├── pyproject.toml          # uv / hatch project
├── src/promptops/
│   ├── core/               # pure logic (no I/O)
│   │   ├── template.py     # interpolate, extract_variables, find_unresolved
│   │   ├── checks.py       # render-checker → Python
│   │   ├── diff.py         # text/structured diff
│   │   ├── promotion.py    # promotion checklist
│   │   └── ids.py          # validation regex
│   ├── models/             # pydantic + SQLModel
│   │   ├── asset.py
│   │   ├── version.py
│   │   ├── fixture.py
│   │   └── audit.py
│   ├── storage/
│   │   ├── db.py           # SQLite engine
│   │   ├── fs.py           # YAML read/write to ~/.promptops/prompts/
│   │   └── sync.py         # FS ↔ DB sync (filewatch + manual)
│   ├── api/                # FastAPI app
│   │   ├── main.py
│   │   ├── routes/{assets,versions,fixtures,render,audit}.py
│   │   └── deps.py
│   ├── web/                # HTMX UI (Jinja templates)
│   │   ├── templates/
│   │   └── static/
│   ├── cli/                # Typer
│   │   ├── main.py
│   │   ├── commands/{asset,version,render,diff,export,import_,audit}.py
│   └── config.py           # ~/.promptops/config.toml
├── tests/
└── migrations/             # alembic
```

### Storage модель (file-first)
```
~/.promptops/
├── config.toml             # PROMPTOPS_HOME, etc.
├── promptops.db            # SQLite: audit, fast index, render history
└── prompts/                # ← git this dir
    └── shadow-daily-classifier/
        ├── asset.yaml      # metadata: owner, tags, lifecycle, variable_contract
        ├── versions/
        │   ├── 0.1.0.yaml  # body, model_config, changelog, state
        │   └── 0.2.0.yaml
        └── fixtures/
            ├── short-entry.yaml
            └── long-entry.yaml
```

YAML = source of truth. SQLite = index + audit log + render history. Sync команда переcчитывает SQLite из файлов.

---

## 4. План миграции

### Phase 1: Core (1 день)
- `pyproject.toml`, uv, ruff, mypy, pytest
- Port `template.py` (5 мин) + tests
- Port `checks.py` (1 час) + tests
- Port `diff.py`, `promotion.py`, `ids.py` + tests
- Pydantic models: Asset, Version, Fixture, AuditEvent

### Phase 2: Storage (1 день)
- `storage/fs.py` — YAML read/write, schema-validated через pydantic
- `storage/db.py` — SQLModel tables, Alembic init
- `storage/sync.py` — `sync_from_fs()`, `sync_to_fs()` для двусторонней синхронизации
- Bootstrap: `promptops init` создаёт `~/.promptops/`

### Phase 3: CLI (1 день)
Typer-команды (тот же набор что в LOCAL-FIRST-PLAN):
```bash
promptops init
promptops asset list
promptops asset show <id>
promptops asset new <id> --owner X --tags ...
promptops version new <asset> -m "msg"          # открывает $EDITOR
promptops version show <asset> <ver>
promptops render <asset> <ver> --fixture <name>
promptops render <asset> <ver> -i k=v -i k2=v2
promptops diff <asset> <verA> <verB>
promptops promote <asset> <ver>
promptops sync                                  # FS → DB
promptops audit <asset>
```

### Phase 4: API + Web UI (1-2 дня)
- FastAPI endpoints (1:1 с CLI commands)
- Jinja templates: list assets / asset detail / version detail / new version / fixtures / diff / render preview / audit
- HTMX для частичных обновлений (render preview, diff inline)
- Tailwind через CDN — без webpack/turbo

### Phase 5: Cleanup (полдня)
- Удалить `app/apps/api`, `app/apps/web`, `app/packages/` (всё кроме docs)
- Обновить README на python-quickstart
- Архивировать TS-код в `legacy-ts/` ветку или тег

**Итого: 4-5 дней работы.**

---

## 5. Одна команда для запуска

```bash
# Install
uv tool install promptops-cli
# или из локального:
cd promptops-py && uv pip install -e .

# Init
promptops init

# Start UI + API
promptops serve         # → http://localhost:8765 (FastAPI + HTMX)

# CLI
promptops asset list
promptops render shadow-classifier 0.2.0 --fixture short-entry
```

Без docker, без Postgres, без node_modules.

---

## 6. Что **сохранить** из текущего TS-кода

- **Docs**: `product-brief.md`, `behavior-spec.md`, `architecture.md`, `roadmap.md`, `acceptance-criteria.md`, `docs/*` — все остаются.
- **Schema знания**: drizzle schema → референс для pydantic-моделей.
- **Render-checker логика**: 365 LOC TS → ~200 LOC Python (без типовых интерфейсов).
- **Template engine**: regex `\{\{([a-z][a-z0-9_]*)\}\}` — копируем 1:1.
- **Promotion checklist**: правила перенести.

---

## 7. Risks

| Риск | Митигация |
|---|---|
| YAML round-trip теряет порядок ключей | `ruamel.yaml` сохраняет порядок и комментарии |
| Web UI на HTMX непривычно после React | Альтернатива: оставить Next.js как dumb-клиент к Python API. Но это удваивает стек. Лучше Jinja+HTMX. |
| Git-merge конфликты в YAML промтах | Документировать workflow: один автор за раз + audit log. Merge — последний выигрывает (есть audit). |
| pydantic v2 ≠ Zod нюансы | Минимальны: union, discriminated union, default values — всё есть. |
| Sync FS ↔ DB рассинхрон | DB всегда вторичен: при старте — пересчёт из FS. Single-source-of-truth = файлы. |

---

## 8. Альтернатива: TS local-first (из LOCAL-FIRST-PLAN.md)

| Критерий | TS local-first | Python rewrite |
|---|---|---|
| Время | 3 дня | 4-5 дней |
| Stack consistency с workspace | средняя (node + py смесь) | **высокая** (питон-проектов больше) |
| Local-first feel | средне (SQLite, но node_modules 200 МБ) | **высокое** (uv tool, файлы YAML) |
| UI dev-experience | хороший (Next готов) | новый (HTMX) |
| Зависимости | turbo + pnpm + next + drizzle | uv + fastapi + sqlmodel |
| Git-friendly storage | через export-команду | **нативно** (FS source of truth) |
| Поддержка long-term | TS-стек тяжёлый для single-user | минимальный |

**Рекомендация:** Если важен **YAML-файлы-в-git как primary storage** и **минимальная инсталляция** — Python. Если важна **скорость до MVP** — допилить TS (3 дня).

Гибрид не имеет смысла — лучше выбрать один стек.

---

## TL;DR

- Текущий TS-код: ~7300 LOC, 80% работает, перебор для local-single-user (Postgres, Bearer, Turbo, Next.js).
- Чистая логика (1000 LOC из 7300) портируется на Python за 1 день.
- Целевой стек: **FastAPI + SQLite + SQLModel + Jinja+HTMX + Typer**, install через **uv**.
- Storage = **YAML-файлы в `~/.promptops/prompts/`** (git-friendly) + SQLite-индекс/audit.
- Полный rewrite: 4-5 дней. Vs допилить TS: 3 дня.
- Если хочется git-friendly промты и минимальную установку — **переноси на Python**.
