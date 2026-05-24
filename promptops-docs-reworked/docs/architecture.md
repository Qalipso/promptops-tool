# Architecture — PromptOps

## Architecture summary

PromptOps is a small API service with four responsibilities: manage prompt assets, manage prompt versions, render prompt templates with variables, and record audit/stats data.

It should remain intentionally boring: predictable REST endpoints, explicit state transitions, deterministic rendering, and clear separation from LLM execution.

## High-level architecture

```mermaid
flowchart TB
  Client[Client / Agent / Admin UI] --> API[PromptOps API]
  API --> Auth[Bearer Token Auth]
  API --> AssetService[Asset Service]
  API --> VersionService[Version Service]
  API --> RenderService[Render Service]
  API --> AuditService[Audit Service]

  AssetService --> DB[(Database)]
  VersionService --> DB
  RenderService --> DB
  AuditService --> DB

  RenderService -. no LLM call .-> NoLLM[Template substitution only]
```

## Layer responsibilities

| Layer | Responsibility |
|---|---|
| API layer | Request routing, authentication, response envelope, input parsing. |
| Asset service | Asset CRUD, lifecycle updates, active version reference. |
| Version service | Draft creation, promotion, archive, rollback, version state transitions. |
| Render service | Variable substitution, diagnostics, rendered hash generation. |
| Audit service | Immutable event creation and retrieval. |
| Persistence layer | Stores assets, versions, audit events, and optional render records. |

## Suggested data model

```mermaid
erDiagram
  ASSET ||--o{ VERSION : has
  ASSET ||--o{ AUDIT_EVENT : records
  VERSION ||--o{ AUDIT_EVENT : records
  VERSION ||--o{ RENDER_RECORD : renders

  ASSET {
    string id PK
    string owner
    string description
    string lifecycle
    string active_version_id FK
    json variable_contract
    json model_config
    json output_contract
    datetime created_at
    datetime updated_at
  }

  VERSION {
    uuid id PK
    string asset_id FK
    string version
    string state
    json body
    json variable_contract_snapshot
    json model_config_snapshot
    json output_contract_snapshot
    string changelog
    string author
    string etag
    string body_hash
    datetime created_at
    datetime promoted_at
  }

  RENDER_RECORD {
    uuid id PK
    uuid version_id FK
    string asset_id FK
    json inputs
    text rendered_system
    text rendered_user
    string rendered_hash
    json diagnostics
    datetime created_at
  }

  AUDIT_EVENT {
    uuid id PK
    string actor
    string event_type
    string asset_id FK
    uuid version_id FK
    json payload
    string payload_hash
    datetime occurred_at
  }
```

## Create and promote version

```mermaid
sequenceDiagram
  participant User
  participant API
  participant VersionService
  participant DB
  participant Audit

  User->>API: POST /assets/{id}/versions
  API->>VersionService: createDraftVersion(assetId, body, snapshots)
  VersionService->>DB: insert version(state=draft)
  VersionService->>Audit: record version.created
  API-->>User: 201 Created draft version

  User->>API: POST /assets/{id}/versions/{vid}/promote
  API->>VersionService: promote(vid)
  VersionService->>DB: set current active to previous
  VersionService->>DB: set vid to active
  VersionService->>DB: update asset.active_version_id
  VersionService->>Audit: record version.promoted
  API-->>User: 200 Promoted version
```

## Render version

```mermaid
sequenceDiagram
  participant Client
  participant API
  participant RenderService
  participant DB
  participant Audit

  Client->>API: POST /assets/{id}/versions/{vid}/render
  API->>RenderService: render(versionId, inputs, save)
  RenderService->>DB: read version body and contract snapshot
  RenderService->>RenderService: replace {{variables}}
  RenderService->>RenderService: collect unresolved variables and unused inputs
  RenderService->>RenderService: compute rendered_hash
  alt save = true
    RenderService->>Audit: record render.saved
  end
  API-->>Client: 202 RenderResult
```

## Rendering algorithm

1. Load version by `asset_id` and `version_id`.
2. Extract all `{{variable}}` placeholders from `body.system` and `body.user`.
3. Validate provided inputs against `variable_contract_snapshot`.
4. Substitute placeholders with input values or defaults.
5. Leave unresolved placeholders detectable if values are missing.
6. Return rendered text, unresolved variables, unused inputs, and rendered hash.
7. Save audit/render record only if requested.

## Integration with AI Evaluation

```mermaid
flowchart LR
  PromptOps[PromptOps Registry] --> Rendered[Rendered Prompt]
  Rendered --> Eval[AI Evaluation Tool]
  Dataset[Golden Dataset] --> Eval
  Eval --> Metrics[Metrics / Rubrics / Regression Results]
  Eval --> Report[Evaluation Report]
```

PromptOps can provide the exact rendered prompt to an evaluation tool. The evaluation tool can run model calls, compare outputs, score rubrics, and store results.

## Suggested implementation stack

A simple implementation can use Node.js / Next.js API routes or Express, PostgreSQL or SQLite, Zod, OpenAPI, Vitest/Jest, and Playwright or Supertest.
