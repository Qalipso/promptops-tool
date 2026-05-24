# Test Cases — PromptOps

## 1. Create a valid asset

**Request:** `POST /api/v0/assets` with a stable ID, owner, description, tags, lifecycle, and contracts.  
**Expected result:** `201`, `success: true`, asset data, generated timestamps, and no active version unless set by implementation.

## 2. Reject duplicate asset

**Request:** Create the same asset ID twice.  
**Expected result:** First request succeeds. Second request returns conflict-style error. Existing asset is not overwritten.

## 3. List assets

**Request:** `GET /api/v0/assets` after creating several assets.  
**Expected result:** `200`, array of assets with ID, owner, lifecycle, tags, and timestamps.

## 4. Get asset by ID

**Request:** `GET /api/v0/assets/shadow.daily-report`.  
**Expected result:** Matching asset is returned. Missing asset returns `404`.

## 5. Patch asset lifecycle

**Request:** `PATCH /api/v0/assets/shadow.daily-report` with `{ "lifecycle": "deprecated" }`.  
**Expected result:** Lifecycle updates. Asset ID remains unchanged.

## 6. Create draft version

**Request:** `POST /api/v0/assets/{id}/versions` with semver, body, snapshots, and changelog.  
**Expected result:** `201`, new version state is `draft`, body hash and ETag are generated.

## 7. Reject version without user body

**Request:** Create a version with body missing required `user` field.  
**Expected result:** Validation error. No version is created.

## 8. Promote draft version

**Request:** `POST /api/v0/assets/{id}/versions/{vid}/promote`.  
**Expected result:** Version becomes `active`, asset `active_version_id` points to it, audit event is created.

## 9. Promote second version

**Request:** Promote `1.0.0`, then promote `1.1.0`.  
**Expected result:** `1.1.0` is active. `1.0.0` becomes previous.

## 10. Get active version

**Request:** `GET /api/v0/assets/{id}/active`.  
**Expected result:** Active version returned with body, version string, state, hash, and snapshots.

## 11. Render with all variables

**Request:** Render with all variables required by template.  
**Expected result:** `202`, all placeholders replaced, `unresolved_variables` is empty.

## 12. Render with missing variable

**Request:** Render template containing `{{language}}` without `language` input/default.  
**Expected result:** `language` appears in `unresolved_variables`.

## 13. Render with unused input

**Request:** Render with extra input key `tone` that does not appear in template.  
**Expected result:** `tone` appears in `unused_inputs`.

## 14. Render with save false

**Request:** Render with `save: false`.  
**Expected result:** Render result is returned; no persistent render record is created unless policy says otherwise.

## 15. Render with save true

**Request:** Render with `save: true`.  
**Expected result:** Render result is returned and audit/render record is persisted.

## 16. Archive draft version

**Request:** Archive a draft version.  
**Expected result:** Version state becomes `archived` and does not become active.

## 17. Rollback with justification

**Request:** After promoting two versions, call rollback with justification.  
**Expected result:** Previous version becomes active and rollback audit event is created.

## 18. Reject rollback without previous version

**Request:** Try rollback on asset with no previous version.  
**Expected result:** Error explaining rollback is unavailable.

## 19. Read audit log

**Request:** `GET /api/v0/assets/{id}/audit?limit=50` after mutations.  
**Expected result:** Ordered audit events with actor, event type, asset ID, version ID, payload hash, and timestamp.

## 20. Get asset stats

**Request:** `GET /api/v0/assets/{id}/stats`.  
**Expected result:** Version count and last rendered timestamp if available.

## 21. Unauthorized request

**Request:** Call protected endpoint without bearer token.  
**Expected result:** Unauthorized error. No mutation happens.

## 22. Invalid lifecycle

**Request:** Use unsupported lifecycle value such as `production-ready`.  
**Expected result:** Validation error with accepted lifecycle values.

## 23. Invalid state transition

**Request:** Try to promote archived version.  
**Expected result:** Invalid state transition error.

## 24. Evaluation boundary test

**Request:** Ask PromptOps to run LLM-as-judge, red teaming, or prompt scoring.  
**Expected result:** PromptOps does not perform evaluation.

## 25. Reproducible render hash

**Request:** Render same version twice with identical inputs.  
**Expected result:** Rendered system, rendered user, and rendered hash are identical.
