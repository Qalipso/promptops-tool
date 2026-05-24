# API Reference — PromptOps

This reference translates the OpenAPI spec into a practical product/developer guide.

## Base URL

```text
http://localhost:3013
```

## Authentication

All endpoints use bearer token authentication.

```bash
Authorization: Bearer $PROMPTOPS_API_TOKEN
```

## Response envelope

Successful responses follow this shape:

```json
{
  "success": true,
  "data": {}
}
```

Error responses follow this shape:

```json
{
  "success": false,
  "error": "Error message or structured error object"
}
```

## Endpoint overview

| Method | Path | Domain | Summary | Operation |
|---|---|---|---|---|
| `GET` | `/api/v0/assets` | Assets | List all assets | `listAssets` |
| `POST` | `/api/v0/assets` | Assets | Create a new asset | `createAsset` |
| `GET` | `/api/v0/assets/{id}` | Assets | Get asset by ID | `getAsset` |
| `PATCH` | `/api/v0/assets/{id}` | Assets | Update asset metadata | `updateAsset` |
| `GET` | `/api/v0/assets/{id}/active` | Versions | Get active version | `getActiveVersion` |
| `GET` | `/api/v0/assets/{id}/versions` | Versions | List versions | `listVersions` |
| `POST` | `/api/v0/assets/{id}/versions` | Versions | Create a version (draft) | `createVersion` |
| `GET` | `/api/v0/assets/{id}/versions/{vid}` | Versions | Get version by ID | `getVersion` |
| `POST` | `/api/v0/assets/{id}/versions/{vid}/promote` | Versions | Promote draft to active | `promoteVersion` |
| `POST` | `/api/v0/assets/{id}/versions/{vid}/archive` | Versions | Archive a version | `archiveVersion` |
| `POST` | `/api/v0/assets/{id}/versions/{vid}/render` | Render | Render version with variable inputs | `renderVersion` |
| `POST` | `/api/v0/assets/{id}/rollback` | Versions | Rollback to previous active version | `rollbackVersion` |
| `GET` | `/api/v0/assets/{id}/audit` | Audit | Audit log for asset | `listAuditEvents` |
| `GET` | `/api/v0/assets/{id}/stats` | Assets | Asset stats | `getAssetStats` |

## Schemas

| Schema | Required fields | Main properties |
|---|---|---|
| `Asset` | id, owner, description, tags, lifecycle, created_at, updated_at | id, owner, description, tags, lifecycle, active_version_id, variable_contract, model_config, output_contract, created_at, updated_at |
| `VariableEntry` | name, kind | name, kind, required, description, values, default, example |
| `Version` | id, asset_id, version, state, body, author, etag, body_hash, created_at | id, asset_id, version, state, body, variable_contract_snapshot, model_config_snapshot, output_contract_snapshot, changelog, author, etag, body_hash, created_at, promoted_at |
| `PromptBody` | user | system, user |
| `RenderResult` | — | version_id, inputs, rendered_system, rendered_user, rendered_hash, unresolved_variables, unused_inputs |
| `AuditEvent` | — | id, actor, event_type, asset_id, version_id, payload, payload_hash, occurred_at |
| `AssetStats` | — | version_count, last_rendered_at |
| `Error` | — | success, error |

## Assets

### List assets

```http
GET /api/v0/assets
```

Returns all prompt assets, optionally enriched with stats.

### Create asset

```http
POST /api/v0/assets
```

Creates a stable prompt asset identity.

```json
{
  "id": "shadow.daily-report",
  "owner": "shadow-agent",
  "description": "Daily reflection report prompt.",
  "tags": ["shadow", "report", "reflection"],
  "lifecycle": "active",
  "variable_contract": [
    { "name": "journal_entries", "kind": "string", "required": true },
    { "name": "language", "kind": "enum", "required": true, "values": ["English", "Russian", "Spanish"] }
  ],
  "model_config": { "model": "gpt-4.1", "temperature": 0.2 },
  "output_contract": { "format": "markdown" }
}
```

### Get asset

```http
GET /api/v0/assets/{id}
```

Returns one asset by stable ID.

### Update asset metadata

```http
PATCH /api/v0/assets/{id}
```

Updates description, tags, lifecycle, variable contract, model config, or output contract. The asset ID and owner should not be changed.

## Versions

### Get active version

```http
GET /api/v0/assets/{id}/active
```

Returns the active version for the asset. This is the main endpoint agents and applications use when they need the production prompt.

### List versions

```http
GET /api/v0/assets/{id}/versions
```

Returns all versions for a given asset.

### Create draft version

```http
POST /api/v0/assets/{id}/versions
```

Creates a draft version. New versions do not become active automatically.

```json
{
  "version": "1.1.0",
  "parent_version_id": "9f36c0e3-0000-4000-9000-000000000000",
  "body": {
    "system": "You are Shadow, a precise personal operating system assistant.",
    "user": "Create a report from {{journal_entries}} in {{language}}."
  },
  "variable_contract_snapshot": [
    { "name": "journal_entries", "kind": "string", "required": true },
    { "name": "language", "kind": "enum", "required": true, "values": ["English", "Russian", "Spanish"] }
  ],
  "model_config_snapshot": { "model": "gpt-4.1", "temperature": 0.2 },
  "output_contract_snapshot": { "format": "markdown" },
  "changelog": "Improved structure and language control."
}
```

### Get version

```http
GET /api/v0/assets/{id}/versions/{vid}
```

Returns a specific version by UUID.

### Promote version

```http
POST /api/v0/assets/{id}/versions/{vid}/promote
```

Promotes a draft version to active. The previous active version becomes `previous`.

### Archive version

```http
POST /api/v0/assets/{id}/versions/{vid}/archive
```

Archives a version that should no longer be used in normal workflows.

### Rollback

```http
POST /api/v0/assets/{id}/rollback
```

Rolls back the asset to the previous active version. Requires a justification.

```json
{
  "justification": "Regression detected in the latest daily report prompt."
}
```

## Render

### Render version

```http
POST /api/v0/assets/{id}/versions/{vid}/render
```

Renders a version with input values. This performs template substitution only.

```json
{
  "inputs": {
    "journal_entries": "I finished the landing page and felt anxious before the call.",
    "language": "English"
  },
  "save": true
}
```

Example response:

```json
{
  "success": true,
  "data": {
    "version_id": "9f36c0e3-0000-4000-9000-000000000000",
    "inputs": {
      "journal_entries": "I finished the landing page and felt anxious before the call.",
      "language": "English"
    },
    "rendered_system": "You are Shadow, a precise personal operating system assistant.",
    "rendered_user": "Create a report from I finished the landing page and felt anxious before the call. in English.",
    "rendered_hash": "sha256-hash-value",
    "unresolved_variables": [],
    "unused_inputs": []
  }
}
```

## Audit

```http
GET /api/v0/assets/{id}/audit?limit=50
```

Returns audit events for an asset.

## Stats

```http
GET /api/v0/assets/{id}/stats
```

Returns basic asset statistics such as version count and last rendered timestamp.

## Recommended client usage

Production agents should usually fetch the active version, render it with inputs, then pass rendered text to the application or evaluation layer. Agents should not hardcode prompt text directly.
