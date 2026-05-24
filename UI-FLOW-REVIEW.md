# PromptOps — UI Flow Review

Дата: 2026-05-22
Стек: API (Hono+Drizzle+Postgres) + Web (Next 15)
Тест: полный обход list → asset → new version → version detail → render preview → diff → audit → new fixture

---

## TL;DR

8 bugs (3 критических), 9 UX-проблем. **Render Preview не работает** (главная фича). Migrations и seed расходятся. UI стат не сходится между списком и деталью.

---

## A. Critical bugs (блокеры)

### A1. Render Preview всегда падает 500
**Где:** `POST /api/v0/assets/:id/versions/:vid/render` → `runRenderChecks` → `checks.map is not a function`

**Причина:** `services/render-checker.ts:359` ожидает `checks: Record<string, unknown>[]` (массив). Seed (`db/seed.ts:84,93,106`) и форма (`fixtures/new`) сохраняют `checks` как одиночный объект `{type: 'no_unresolved_variables'}`. Drizzle schema колонка `jsonb` не валидирует структуру.

**Fix:** В сервисе нормализовать `checks` к массиву (`Array.isArray ? : [it]`). Или поправить seed + форму на массив. Лучше оба.

```ts
// render-service.ts перед runRenderChecks
const checksArray = Array.isArray(checks) ? checks : [checks];
```

### A2. Миграция 0001 не в journal — seed падает на свежей БД
**Где:** `infra/migrations/meta/_journal.json` содержит только `0000_white_ben_urich`. Файл `0001_fixtures_refactor.sql` существует но drizzle его не применит.

**Симптом:** На свежем Postgres `db:migrate` создаёт таблицы `test_cases, test_runs, run_results`. Затем `db:seed` падает: `relation "fixtures" does not exist`.

**Fix:** Добавить entry для 0001 в `_journal.json` с правильным hash. Либо передеплоить через `drizzle-kit generate`.

```json
{
  "idx": 1,
  "version": "7",
  "when": <timestamp>,
  "tag": "0001_fixtures_refactor",
  "breakpoints": true
}
```

### A3. `getAssetStats` SQL — ambiguous `created_at`
**Где:** `services/audit.ts:24-32` — подзапрос `JOIN versions v ON v.id = rv.version_id` тянет два `created_at` (versions + render_validations). Бросает `42702 column reference "created_at" is ambiguous`.

**Симптом:** Список assets показывает `0 versions 0 fixtures` для всех. Список ловит exception → возвращает нули (`asset-repo.ts` enrich). Asset detail работает (другой путь).

**Fix:**
```sql
(SELECT rv.created_at FROM render_validations rv
  JOIN versions v ON v.id = rv.version_id
  WHERE v.asset_id = ${asset_id}
  ORDER BY rv.created_at DESC LIMIT 1) AS last_rendered_at
```
Префикс `rv.created_at` уже есть, но ORDER BY `created_at` без префикса = двусмысленно. Добавить `rv.created_at` в ORDER BY.

---

## B. High UX / functional issues

### B1. Cache 10s на API клиенте → stale state после mutation
**Где:** `web/src/lib/api.ts:14` — `next: { revalidate: 10 }`

**Симптом:** Promote → diff page всё ещё показывает версии в `draft`. Активная сразу не отражается. После 10s обновится.

**Fix:** В server-actions после mutate вызывать `revalidatePath('/assets/[id]', 'page')` + `revalidatePath('/assets', 'page')`. Уже есть в некоторых actions? Проверить.

### B2. Form NewVersionForm — два submit с одинаковым стилем
**Где:** `versions/new` — submit "Save draft". На detail page после создания: submit "Promote to active" + submit "Render Preview" (внутри карточки). Селектор `button[type=submit]` ловит первый = Promote вместо Preview.

**Симптом:** Случайные promotion при попытке preview.

**Fix:** Дать кнопкам разные стили + понятные labels + закрепить порядок. Render Preview — отдельная карточка с заголовком формы. Лучше — переключить Render Preview на client-side fetch, не form-submit.

### B3. Fixture form — все variables помечены required
**Где:** `fixtures/new/NewFixtureForm.tsx` — рендерит все переменные из `variable_contract` как `required`. В контракте `context_tone` и `config_max_chars` имеют `required: false`.

**Fix:** Читать `v.required` из контракта, не хардкодить.

### B4. Render check форма генерирует объект, а не массив
**Где:** `fixtures/new` "Generated JSON" preview: `{"type": "no_unresolved_variables"}`. Должно быть `[{"type": "no_unresolved_variables"}]`.

**Fix:** Обернуть в массив в форме + поддерживать добавление нескольких checks (UI пока однопроверочный).

### B5. Diff между одной и той же версией — нет ранней блокировки
**Где:** `assets/[id]/diff` — оба `<select>` инициализируются одной активной версией. Compare показывает "Same version selected" warning *после* submit. На пустом asset (1 version) функция бесполезна.

**Fix:**
- Disable submit если a===b
- Hide diff page entirely если versions.length < 2 (показать hint "Create another version to compare")

---

## C. Medium UI issues

### C1. Hero/Asset list — stats бесполезны
Каждая карточка списка: `0 versions  0 fixtures` (баг A3 выше). Когда починим — всё равно карточка перегружена: owner + версии + фикстуры + теги + lifecycle badge в одну строку. Узкая колонка — overflow.

**Fix:** двухстрочная карточка: top — id + lifecycle badge; bottom — owner · 1 ver · 3 fix · tags. Шрифт меньше для метаданных.

### C2. Fixture row: огромный badge ест ширину
**Где:** asset detail → Fixtures секция. Badge `no_unresolved_variables` ~210px, после него Edit/Delete. Description обрезается.

**Fix:** Сократить лейбл до `no-unresolved`. Перенести action-link на отдельную строку или в hover-меню.

### C3. Version detail: "Linked Evaluation Evidence" и "Readiness checklist unavailable"
PromptOps **не** делает eval. Документация это подтверждает. Карточки про eval — лишний шум.

**Fix:** Удалить блок "Linked Evaluation Evidence". "Readiness checklist" — либо реализовать, либо убрать. Сейчас "unavailable" висит при любом состоянии.

### C4. Sticky right panel в `versions/new` ломается на узком экране
**Где:** `NewVersionForm.tsx:382` — `lg:sticky lg:top-6`. Ниже lg (1024) панель уходит вниз страницы; превращается в длинный вертикальный лист (~1200px). Левая часть выглядит будто бесконечная.

**Fix:** На мобиле скрыть или collapsible. Или показать только compact summary 3-х метрик.

### C5. Layout container `max-w-5xl` — узко для diff side-by-side
**Где:** `app/layout.tsx` — 1024px max. Diff на 2 версии режется правой колонкой (right card visible cut-off).

**Fix:** Дать `/diff` и `/versions/new` свой wider layout (`max-w-7xl`) или убрать центрирование для этих страниц.

### C6. Breadcrumb сливается с title
`assets / demo.email.subject-line-gen / new version` — серый текст того же размера что и body. Часто его не замечаю.

**Fix:** Чуть крупнее, разделитель `›`, hover-underline.

### C7. Header без active state
Top-nav `Assets` всегда обычный, ничего не подсвечено. На detail page всё ещё видим только "Assets", нет breadcrumb-style.

**Fix:** Подсветить активный пункт.

### C8. `+ New Asset` отрезается на narrow viewport
Header overflow: видны "PromptOps Assets" + теряется кнопка `+ New Asset` правее.

**Fix:** Сжать padding header или сделать кнопку только icon на mobile.

### C9. Fixture render-check editor — single check only
В UI можно выбрать **один** check (Type dropdown). Schema поддерживает массив (после A4 fix). Нельзя добавить второй check.

**Fix:** "Add another check" кнопка, list rendering.

---

## D. Поток (user-flow) findings

| Step | Status | Issue |
|---|---|---|
| 1. Open `/` | OK | Stats показывают 0/0 — bug A3 |
| 2. Click asset card | OK | Переход работает |
| 3. Click `+ new version` | OK | Form рендерится |
| 4. Fill version/user/system/changelog | OK | Highlighted textarea работает |
| 5. Submit "Save draft" | OK | Version создаётся |
| 6. Promote (intended) | OK | Работает |
| 7. Render Preview (intended) | **FAIL** | 500 error — A1 |
| 8. Diff (1 version) | partial | Compare с самой собой — нет защиты — B5 |
| 9. Audit log | OK | События пишутся |
| 10. New fixture form | partial | Required-флаги неверные — B3; JSON shape кривой — B4 |
| 11. Delete fixture | not tested | — |
| 12. Rollback | not tested | — |

---

## E. Что **сразу** нужно поправить (priority order)

1. **A1** — нормализовать `checks` к массиву в `render-service.ts` (5 минут)
2. **A2** — добавить миграцию 0001 в journal (10 минут)
3. **A3** — починить ambiguous SQL в `getAssetStats` (5 минут)
4. **B4** — оборачивать checks в массив в `fixtures/new` форме (10 минут)
5. **B3** — читать `required` из контракта в `fixtures/new` (10 минут)
6. **C3** — убрать "Linked Evaluation Evidence" + "Readiness checklist" (15 минут)
7. **B5** — disable Compare submit если a===b (5 минут)
8. **B2** — разнести Promote и Render Preview визуально (15 минут)

Итого ~1 час фикса → flow становится usable.

---

## F. Security note (отдельно)

`apps/api/.env` содержал живой OpenAI ключ (теперь удалён). **Ротировать в OpenAI dashboard.**
- `.env` gitignored, не в git. **OK.**
- Но: ключ доступен в `process.env` всем процессам api → **рекомендую ротировать** (особенно если контейнер деплоен куда-то ещё).
- LLM в текущем коде **не используется** (PromptOps не делает eval). Ключ лежит мёртвым грузом → удалить из `.env`.

---

## G. Архитектурное замечание

Текущий код **уже** двигает фокус с "test-runner" на "registry+render" (комментарии в коде, runs/ удалены, render_validations таблица создана). Но UI ещё имеет хвосты от прошлой концепции (Eval Evidence, Readiness checklist, runs/ redirect page). После cleanup-фикса (C3) — концепция станет цельной.

Bugs A1+A2+A3+B4 — следствие **миграции концепции на полпути**: схему обновили, миграцию написали но не зарегистрировали, форму обновили но не выровняли с сервисом.

---

## H. Что дальше

- Опция 1 (рекомендую): закрыть 8 priority-фиксов из секции E (~1 час) → стабильный TS MVP. Затем спокойно решить про Python.
- Опция 2: бросить TS как есть, начать Python rewrite (см. `PYTHON-MIGRATION.md`).
- Опция 3: применить LOCAL-FIRST-PLAN.md (SQLite + CLI). Это включает фиксы автоматически.

Все 3 пути приведут к рабочему инструменту. Разница только в стеке и сроках.
