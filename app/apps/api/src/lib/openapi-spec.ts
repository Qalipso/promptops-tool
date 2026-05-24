/** OpenAPI 3.1 spec for PromptOps API. Served at GET /api/v0/openapi.json */

export const openapiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'PromptOps API',
    version: '0.2.0',
    description:
      'Prompt asset registry — stores, versions, and renders prompt templates. No LLM involved. AI evaluation is handled by a separate tool.',
  },
  servers: [{ url: 'http://localhost:3013', description: 'Local development' }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', description: 'Set PROMPTOPS_API_TOKEN env var' },
    },
    schemas: {
      Asset: {
        type: 'object',
        required: ['id', 'owner', 'description', 'tags', 'lifecycle', 'created_at', 'updated_at'],
        properties: {
          id: { type: 'string', example: 'shadow.daily-report' },
          owner: { type: 'string', example: 'agent' },
          description: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          lifecycle: { type: 'string', enum: ['unregistered', 'active', 'deprecated', 'sunset'] },
          active_version_id: { type: 'string', format: 'uuid', nullable: true },
          variable_contract: { type: 'array', items: { '$ref': '#/components/schemas/VariableEntry' } },
          model_config: { type: 'object' },
          output_contract: { type: 'object' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      VariableEntry: {
        type: 'object',
        required: ['name', 'kind'],
        properties: {
          name: { type: 'string', example: 'user_name' },
          kind: { type: 'string', enum: ['string', 'number', 'boolean', 'enum'], example: 'string' },
          required: { type: 'boolean', default: true },
          description: { type: 'string' },
          values: { type: 'array', items: { type: 'string' }, description: 'Allowed values for enum kind' },
          default: { description: 'Default value' },
          example: { type: 'string' },
        },
      },
      Version: {
        type: 'object',
        required: ['id', 'asset_id', 'version', 'state', 'body', 'author', 'etag', 'body_hash', 'created_at'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          asset_id: { type: 'string' },
          version: { type: 'string', example: '1.2.0' },
          state: { type: 'string', enum: ['draft', 'active', 'previous', 'archived'] },
          body: { '$ref': '#/components/schemas/PromptBody' },
          variable_contract_snapshot: { type: 'array', items: { '$ref': '#/components/schemas/VariableEntry' } },
          model_config_snapshot: { type: 'object' },
          output_contract_snapshot: { type: 'object' },
          changelog: { type: 'string', nullable: true },
          author: { type: 'string' },
          etag: { type: 'string', example: '665a49439e7d1b14' },
          body_hash: { type: 'string', description: 'SHA-256 of serialized body' },
          created_at: { type: 'string', format: 'date-time' },
          promoted_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      PromptBody: {
        type: 'object',
        required: ['user'],
        properties: {
          system: { type: 'string', nullable: true, description: 'System prompt. Use {{variable}} for variables.' },
          user: { type: 'string', description: 'User prompt template. Use {{variable}} for variables.' },
        },
      },
      RenderResult: {
        type: 'object',
        properties: {
          version_id: { type: 'string', format: 'uuid' },
          inputs: { type: 'object', additionalProperties: true },
          rendered_system: { type: 'string', nullable: true },
          rendered_user: { type: 'string' },
          rendered_hash: { type: 'string', description: 'SHA-256(rendered_system:rendered_user) — proves exactly what was rendered' },
          unresolved_variables: { type: 'array', items: { type: 'string' }, description: '{{vars}} still present after substitution' },
          unused_inputs: { type: 'array', items: { type: 'string' }, description: 'Input keys not referenced in template' },
        },
      },
      AuditEvent: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          actor: { type: 'string' },
          event_type: { type: 'string', example: 'version.promoted' },
          asset_id: { type: 'string', nullable: true },
          version_id: { type: 'string', format: 'uuid', nullable: true },
          payload: { type: 'object' },
          payload_hash: { type: 'string' },
          occurred_at: { type: 'string', format: 'date-time' },
        },
      },
      AssetStats: {
        type: 'object',
        properties: {
          version_count: { type: 'integer' },
          last_rendered_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            oneOf: [
              { type: 'string' },
              {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                  details: { nullable: true },
                },
              },
            ],
          },
        },
      },
    },
  },
  paths: {
    '/api/v0/assets': {
      get: {
        summary: 'List all assets',
        operationId: 'listAssets',
        tags: ['Assets'],
        responses: {
          '200': {
            description: 'Array of assets (each enriched with stats)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { '$ref': '#/components/schemas/Asset' } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create a new asset',
        operationId: 'createAsset',
        tags: ['Assets'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['id'],
                properties: {
                  id: { type: 'string', description: 'Stable dot-namespaced ID. Cannot be changed.', example: 'shadow.daily-report' },
                  owner: { type: 'string' },
                  description: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                  lifecycle: { type: 'string', enum: ['unregistered', 'active', 'deprecated', 'sunset'], default: 'active' },
                  variable_contract: { type: 'array', items: { '$ref': '#/components/schemas/VariableEntry' } },
                  model_config: { type: 'object' },
                  output_contract: { type: 'object' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created asset',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Asset' } } } } },
          },
        },
      },
    },
    '/api/v0/assets/{id}': {
      get: {
        summary: 'Get asset by ID',
        operationId: 'getAsset',
        tags: ['Assets'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Asset', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Asset' } } } } } },
          '404': { description: 'Not found', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
        },
      },
      patch: {
        summary: 'Update asset metadata',
        operationId: 'updateAsset',
        tags: ['Assets'],
        description: 'Update description, tags, lifecycle, or contracts. Asset ID and owner cannot be changed.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                  lifecycle: { type: 'string', enum: ['unregistered', 'active', 'deprecated', 'sunset'] },
                  variable_contract: { type: 'array', items: { '$ref': '#/components/schemas/VariableEntry' } },
                  model_config: { type: 'object' },
                  output_contract: { type: 'object' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Updated asset', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Asset' } } } } } },
        },
      },
    },
    '/api/v0/assets/{id}/active': {
      get: {
        summary: 'Get active version',
        operationId: 'getActiveVersion',
        tags: ['Versions'],
        description: 'Returns the currently active version directly. Most common endpoint for agents retrieving a prompt.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Active version', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Version' } } } } } },
          '404': { description: 'No active version', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/v0/assets/{id}/versions': {
      get: {
        summary: 'List versions',
        operationId: 'listVersions',
        tags: ['Versions'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'All versions for asset', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { '$ref': '#/components/schemas/Version' } } } } } } },
        },
      },
      post: {
        summary: 'Create a version (draft)',
        operationId: 'createVersion',
        tags: ['Versions'],
        description: 'New versions start as draft. Promote to make active.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['version', 'body', 'variable_contract_snapshot', 'model_config_snapshot', 'output_contract_snapshot'],
                properties: {
                  version: { type: 'string', description: 'Semver string', example: '1.0.0' },
                  parent_version_id: { type: 'string', format: 'uuid' },
                  body: { '$ref': '#/components/schemas/PromptBody' },
                  variable_contract_snapshot: { type: 'array', items: { '$ref': '#/components/schemas/VariableEntry' } },
                  model_config_snapshot: { type: 'object' },
                  output_contract_snapshot: { type: 'object' },
                  changelog: { type: 'string', example: 'Added tone variable' },
                },
              },
              example: {
                version: '1.0.0',
                body: { system: 'You are a helpful assistant.', user: 'Summarize {{text}} in {{language}}.' },
                variable_contract_snapshot: [
                  { name: 'text', kind: 'string', required: true },
                  { name: 'language', kind: 'string', required: true, default: 'English' },
                ],
                model_config_snapshot: {},
                output_contract_snapshot: {},
                changelog: 'Initial version',
              },
            },
          },
        },
        responses: {
          '201': { description: 'Created draft version', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Version' } } } } } },
        },
      },
    },
    '/api/v0/assets/{id}/versions/{vid}': {
      get: {
        summary: 'Get version by ID',
        operationId: 'getVersion',
        tags: ['Versions'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'vid', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Version', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Version' } } } } } },
        },
      },
    },
    '/api/v0/assets/{id}/versions/{vid}/promote': {
      post: {
        summary: 'Promote draft to active',
        operationId: 'promoteVersion',
        tags: ['Versions'],
        description: 'Promotes a draft version to active. Previous active becomes "previous".',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'vid', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Promoted version', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Version' } } } } } },
        },
      },
    },
    '/api/v0/assets/{id}/versions/{vid}/archive': {
      post: {
        summary: 'Archive a version',
        operationId: 'archiveVersion',
        tags: ['Versions'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'vid', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Archived version', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Version' } } } } } },
        },
      },
    },
    '/api/v0/assets/{id}/versions/{vid}/render': {
      post: {
        summary: 'Render version with variable inputs',
        operationId: 'renderVersion',
        tags: ['Render'],
        description: 'Template substitution only — no LLM call. Replaces {{variables}} with provided inputs. Returns rendered text + diagnostics.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'vid', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  inputs: { type: 'object', additionalProperties: true, description: 'Variable values', example: { user_name: 'Alice', language: 'Spanish' } },
                  save: { type: 'boolean', default: false, description: 'Persist render record to audit log' },
                },
              },
            },
          },
        },
        responses: {
          '202': { description: 'Render result', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/RenderResult' } } } } } },
        },
      },
    },
    '/api/v0/assets/{id}/rollback': {
      post: {
        summary: 'Rollback to previous active version',
        operationId: 'rollbackVersion',
        tags: ['Versions'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['justification'],
                properties: { justification: { type: 'string', example: 'Regression in new version' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Rolled-back version now active', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Version' } } } } } },
        },
      },
    },
    '/api/v0/assets/{id}/audit': {
      get: {
        summary: 'Audit log for asset',
        operationId: 'listAuditEvents',
        tags: ['Audit'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 } },
        ],
        responses: {
          '200': { description: 'Audit events', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { '$ref': '#/components/schemas/AuditEvent' } } } } } } },
        },
      },
    },
    '/api/v0/assets/{id}/stats': {
      get: {
        summary: 'Asset stats',
        operationId: 'getAssetStats',
        tags: ['Assets'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Stats', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/AssetStats' } } } } } },
        },
      },
    },
  },
  tags: [
    { name: 'Assets', description: 'Prompt asset management' },
    { name: 'Versions', description: 'Version lifecycle — draft → active → previous/archived' },
    { name: 'Render', description: 'Template substitution (no LLM)' },
    { name: 'Audit', description: 'Immutable audit trail' },
  ],
} as const;
