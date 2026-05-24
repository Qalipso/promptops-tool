# Version Storage Model

How PromptOps stores, versions, and tracks prompt changes.

---

## 1. Model — Immutable Snapshots

Each version is an **immutable snapshot** of a prompt's body, variable contract, model config, and output contract at a specific point in time.

Only versions in `draft` state are mutable. Once a version is promoted (`active`), its `body`, `body_hash`, and `etag` never change. All history is preserved.

```
versions table
├── id            UUID, PK
├── asset_id      FK → assets (the durable identity)
├── version       "1.0.0", "1.1.0", etc. (unique per asset)
├── state         draft | active | previous | archived
├── body          JSONB { system?: string, user: string }
├── body_hash     SHA256 of JSON body — 64 chars
├── etag          SHA256(body_hash:version)[0:16] — 16 chars
├── variable_contract_snapshot   frozen copy of asset's variable contract
├── model_config_snapshot        frozen copy of asset's model config
├── output_contract_snapshot     frozen copy of asset's output contract
├── changelog     release notes (nullable)
├── author        who created this version
├── parent_version_id  link to previous version (nullable)
├── promoted_at   when state became 'active' (nullable)
└── created_at
```

**Why snapshots instead of diffs?** Snapshots are self-contained. Any version can be re-run without reconstructing history. Audits are simple: every version row is its own truth.

---

## 2. Hashing — Content-Addressed Identity

Two hash fields per version:

### body_hash

```
body_hash = SHA256(JSON.stringify(body))  [64 hex chars]
```

`JSON.stringify(body)` is deterministic within a single process. The same system + user message always produces the same `body_hash`.

**Use:** Deduplication guard — prevents accidentally creating two versions with identical prompt text.

### etag

```
etag = SHA256(body_hash + ':' + version)[0:16]  [16 hex chars]
```

Short, cache-friendly identifier. Encodes both content (body_hash) and label (version string). Useful for HTTP `ETag` headers and fingerprinting in external systems.

**Use:** Change detection — consumers can compare `etag` values to know if anything changed.

---

## 3. State Machine

```
            create
              |
           [draft]
              |
          promote()
              |
           [active] ────────────────── archive()
              |                              |
    new version promoted                 [archived]
              |                          (terminal)
          [previous] ──── rollback() ──> [active]
              |
          archive()
              |
          [archived]
          (terminal)
```

### Rules

| Transition | Trigger | Guard |
|-----------|---------|-------|
| `draft → active` | `promote()` | Asset must have ≥1 non-deleted test case |
| `active → previous` | Automatic when another draft is promoted | — |
| `previous → active` | `rollback()` | Most-recent `previous` version by `promoted_at` |
| `any non-draft → archived` | `archive()` | Cannot archive an active version directly |
| `draft → (deleted)` | No promote needed, just delete the row | Only state where row can be physically deleted |

Only one version per asset can be `active` at a time. Only one version per asset can be `draft` at a time.

---

## 4. Snapshot Capture at Promotion

When a draft is promoted to `active`, PromptOps freezes the current live test cases into `test_suite_snapshots`:

```
test_suite_snapshots table
├── version_id          FK → versions
├── test_case_id        FK → test_cases
├── inputs_snapshot     JSONB — frozen copy of inputs at promotion time
├── assertion_snapshot  JSONB — frozen copy of assertion at promotion time
├── name_snapshot       frozen test case name
└── captured_at
```

**Why?** Test cases on an asset can be edited after promotion. If a test case's assertion changes tomorrow, we need to know exactly which assertion was in force when version `1.0.0` was promoted. Snapshots make historical runs reproducible.

**Implication:** When a run is triggered against a **promoted** version (active / previous / archived), the runner loads from `test_suite_snapshots` — not the live test cases. When run against a **draft**, it uses live test cases (no snapshot exists yet).

---

## 5. Why Test Cases Live on the Asset, Not the Version

Test cases are **asset-level** entities, not version-level:

```
assets  1──N  test_cases
assets  1──N  versions  1──N  test_suite_snapshots (link to test_cases)
```

**Rationale:** A test like "output must not contain AI deflection phrases" applies to every version of an asset, not just one. Attaching test cases to the asset lets engineers build a growing test suite without re-entering cases for every version.

Promotion snapshot captures the state of that asset-level suite at the moment of promotion, giving reproducibility without sacrificing reuse.

**Soft delete:** Deleting a test case sets `deleted_at`; the row stays in the database. Historical snapshots that reference the test case remain intact (enforced by `onDelete: restrict` on the FK from `test_suite_snapshots`).

---

## 6. Rollback Mechanics

`rollbackVersion(asset_id, actor, justification)`:

1. Query for the most-recent version where `state = 'previous'`, ordered by `promoted_at DESC`.
2. If none found → `400 Bad Request`.
3. Set current `active` version → `previous`.
4. Set found `previous` version → `active`, update `promoted_at = now()`.
5. Update `asset.active_version_id` pointer.
6. Write audit event `version.rolled_back` with `justification`.

**Key property:** Rollback does **not** re-capture test case snapshots. It restores the `active` pointer to a version that already has its own frozen snapshot from when it was originally promoted. Historical reproducibility is preserved.

**Repeated rollback:** After rollback, the demoted version is now `previous`. A second rollback would attempt to find the next most-recent `previous` — which is the one before the originally-active version. The state machine allows this chain.

---

## 7. Audit Trail

Every state transition writes an append-only row to `audit_log`:

```
audit_log table
├── id           UUID
├── actor        who triggered the action
├── event_type   version.created | version.promoted | version.archived | version.rolled_back
├── asset_id     related asset
├── version_id   related version
├── payload      JSONB — event-specific data (etag, snapshot_count, justification, etc.)
├── payload_hash SHA256(JSON.stringify(payload))  — integrity check
└── occurred_at
```

`payload_hash` allows detecting if audit rows are tampered with (compare stored hash against recomputed hash).

**Retention:** The current implementation returns audit events from the last 90 days in GET `/assets/:id/audit`. Physical rows are never deleted by the application — enforce retention at the database layer if needed.

**Actor:** Populated from the HTTP bearer token identity (`req.var.actor`). In production this should be the authenticated user ID; in development it defaults to `mvp-operator`.
