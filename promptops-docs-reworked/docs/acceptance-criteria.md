# Acceptance Criteria — PromptOps

## Asset management

1. **Create prompt asset** — Given a valid asset payload, when the client calls `POST /api/v0/assets`, then the system creates the asset, returns `201`, stores owner, description, tags, lifecycle, contracts, and timestamps.
2. **Reject duplicate asset ID** — Given an existing asset ID, when the client tries to create another asset with the same ID, then the system returns a conflict error and does not overwrite the existing asset.
3. **Get asset by ID** — Given an existing asset, when the client calls `GET /api/v0/assets/{id}`, then the system returns the asset with its metadata and active version reference.
4. **Update asset metadata** — Given an existing asset, when the client patches description, tags, lifecycle, or contracts, then the system updates only allowed fields and preserves the stable asset ID.
5. **Prevent asset ID mutation** — Given an existing asset, when the client attempts to change its ID through patch, then the system rejects or ignores the mutation according to implementation policy.

## Version management

6. **Create draft version** — Given an existing asset and valid version payload, when the client calls `POST /api/v0/assets/{id}/versions`, then the system creates a version in `draft` state.
7. **Snapshot contracts** — Given asset-level contracts, when a version is created, then the version stores variable, model, and output contract snapshots.
8. **Promote draft version** — Given a draft version, when the client calls the promote endpoint, then that version becomes `active` and the asset `active_version_id` points to it.
9. **Move previous active version** — Given an already active version, when a new draft is promoted, then the old active version becomes `previous`.
10. **Get active version** — Given an asset with an active version, when the client calls `GET /api/v0/assets/{id}/active`, then the system returns the active version directly.
11. **Archive version** — Given an existing non-active version, when the client calls the archive endpoint, then the version state becomes `archived`.
12. **Rollback with justification** — Given an asset with a previous version, when the client calls rollback with a justification, then the previous version becomes active and the rollback is recorded.
13. **Reject rollback without justification** — Given a rollback request without justification, when the client calls rollback, then the system returns a validation error.

## Rendering

14. **Render variables** — Given a prompt body containing `{{variables}}`, when the client renders the version with matching inputs, then the system returns rendered system and user prompt text.
15. **Detect unresolved variables** — Given a template variable without an input or default value, when the client renders the version, then the response includes that variable in `unresolved_variables`.
16. **Detect unused inputs** — Given an input key that is not referenced in the template, when the client renders the version, then the response includes that key in `unused_inputs`.
17. **Generate rendered hash** — Given a successful render, when the system returns the render result, then it includes a hash proving the exact rendered output.
18. **Do not call LLM** — Given any render request, when the system processes it, then no model provider is called and only template substitution occurs.

## Audit, stats, and security

19. **Record promotion audit event** — Given a version promotion, when the promotion succeeds, then an audit event is created with actor, event type, asset ID, version ID, payload hash, and timestamp.
20. **Record rollback audit event** — Given a rollback, when rollback succeeds, then an audit event is created with the rollback justification.
21. **Read audit events** — Given an asset with audit history, when the client calls `GET /api/v0/assets/{id}/audit`, then the system returns events up to the requested limit.
22. **Get asset stats** — Given an asset with versions or renders, when the client calls the stats endpoint, then the system returns version count and last rendered timestamp if available.
23. **Require bearer token** — Given a request without valid bearer auth, when the client calls a protected endpoint, then the system returns an unauthorized error.
24. **Do not expose sensitive token config** — Given any API response, when it is returned to the client, then it must not expose `PROMPTOPS_API_TOKEN` or internal secrets.
25. **Keep evaluation separate** — Given a request to run model evaluation, rubric scoring, LLM-as-judge, or red teaming, when it targets PromptOps, then the system should not perform it.
