/**
 * Demo-mode fixtures. Loaded when DEMO_MODE=true.
 * Mirrors real API shapes without a running backend.
 */
import type { Asset, Version, AuditEvent, AssetStats, RenderResult } from './api';

export const MOCK_ASSETS: Asset[] = [
  {
    id: 'shadow/classify-entry',
    owner: 'shadow-team',
    description: 'Classifies a raw user entry into type, emotional valence, areas, and next-action hint.',
    tags: ['shadow', 'classification', 'production'],
    lifecycle: 'active',
    active_version_id: 'v-cls-003',
    created_at: '2026-01-12T10:00:00Z',
    updated_at: '2026-04-02T14:22:00Z',
    stats: { version_count: 3, last_rendered_at: '2026-05-20T08:14:00Z' },
    variable_contract: [
      { name: 'entry_text', kind: 'string', required: true, description: 'Raw entry from user.' },
      { name: 'user_areas', kind: 'array', required: false, description: 'User-defined life areas for context.' },
    ],
  },
  {
    id: 'shadow/daily-report',
    owner: 'shadow-team',
    description: 'Generates a markdown daily report from classified entries and area scores.',
    tags: ['shadow', 'report', 'production'],
    lifecycle: 'active',
    active_version_id: 'v-rep-002',
    created_at: '2026-01-18T11:00:00Z',
    updated_at: '2026-04-15T09:10:00Z',
    stats: { version_count: 2, last_rendered_at: '2026-05-24T07:00:00Z' },
    variable_contract: [
      { name: 'entries', kind: 'array', required: true, description: 'Array of classified entry objects.' },
      { name: 'date', kind: 'string', required: true, description: 'ISO date string for the report.' },
      { name: 'area_scores', kind: 'object', required: false },
    ],
  },
  {
    id: 'shadow/chat-context-builder',
    owner: 'shadow-team',
    description: 'Builds memory context string for ShadowOrb chat. Superseded by rag.ts buildMemoryContext.',
    tags: ['shadow', 'rag', 'deprecated'],
    lifecycle: 'deprecated',
    active_version_id: null,
    created_at: '2026-01-25T09:00:00Z',
    updated_at: '2026-03-01T16:00:00Z',
    stats: { version_count: 1, last_rendered_at: null },
    variable_contract: [],
  },
  {
    id: 'eval/llm-judge',
    owner: 'ai-eval-team',
    description: 'LLM-as-judge prompt. Scores a model output against a rubric criterion (0–5 scale).',
    tags: ['evaluation', 'judge', 'production'],
    lifecycle: 'active',
    active_version_id: 'v-judge-004',
    created_at: '2026-02-03T13:00:00Z',
    updated_at: '2026-05-01T11:45:00Z',
    stats: { version_count: 4, last_rendered_at: '2026-05-22T12:30:00Z' },
    variable_contract: [
      { name: 'criterion', kind: 'string', required: true, description: 'Rubric criterion name.' },
      { name: 'criterion_description', kind: 'string', required: true },
      { name: 'model_output', kind: 'string', required: true, description: 'Output to evaluate.' },
      { name: 'reference_answer', kind: 'string', required: false, description: 'Optional gold standard.' },
    ],
  },
];

export const MOCK_VERSIONS: Record<string, Version[]> = {
  'shadow/classify-entry': [
    {
      id: 'v-cls-003',
      asset_id: 'shadow/classify-entry',
      version: '0.3.0',
      state: 'active',
      body: {
        system:
          'You are Shadow, a private AI life assistant. Classify the entry below. Return JSON only.\n\nSchema:\n{\n  "type": "thought|task|feeling|loop|note",\n  "valence": -2..2,\n  "areas": string[],\n  "urgency": "low|medium|high",\n  "next_action": string | null\n}',
        user: 'Entry: {{entry_text}}\n\nUser areas: {{user_areas}}',
      },
      variable_contract_snapshot: null,
      model_config_snapshot: { model: 'gpt-4o-mini', temperature: 0.1 },
      output_contract_snapshot: null,
      changelog: 'Add urgency field. Tighten valence to integer scale.',
      author: 'edu',
      etag: 'a3f8c2d1',
      body_hash: 'sha256:a3f8c2d1e4b5',
      created_at: '2026-04-02T14:22:00Z',
      promoted_at: '2026-04-02T15:00:00Z',
    },
    {
      id: 'v-cls-002',
      asset_id: 'shadow/classify-entry',
      version: '0.2.0',
      state: 'previous',
      body: {
        system: 'You are Shadow. Classify the entry. Return JSON.',
        user: 'Entry: {{entry_text}}',
      },
      variable_contract_snapshot: null,
      model_config_snapshot: { model: 'gpt-4o-mini', temperature: 0.2 },
      output_contract_snapshot: null,
      changelog: 'Add areas field to output schema.',
      author: 'edu',
      etag: 'b1e9d4f2',
      body_hash: 'sha256:b1e9d4f2a3c6',
      created_at: '2026-02-14T10:00:00Z',
      promoted_at: '2026-02-14T10:30:00Z',
    },
    {
      id: 'v-cls-001',
      asset_id: 'shadow/classify-entry',
      version: '0.1.0',
      state: 'archived',
      body: {
        system: null,
        user: 'Classify this entry as thought/task/feeling/note: {{entry_text}}',
      },
      variable_contract_snapshot: null,
      model_config_snapshot: null,
      output_contract_snapshot: null,
      changelog: 'Initial version.',
      author: 'edu',
      etag: 'c0d3e1f9',
      body_hash: 'sha256:c0d3e1f9b2a4',
      created_at: '2026-01-12T10:00:00Z',
      promoted_at: null,
    },
  ],
  'shadow/daily-report': [
    {
      id: 'v-rep-002',
      asset_id: 'shadow/daily-report',
      version: '0.2.0',
      state: 'active',
      body: {
        system:
          'You are Shadow, a reflective AI. Generate a concise daily report in markdown. Be direct, not therapeutic.',
        user:
          'Date: {{date}}\n\nEntries ({{entries.length}}):\n{{entries}}\n\nArea scores:\n{{area_scores}}\n\nWrite: executive summary (2 sentences), key signals (bullets), one pattern noticed, one suggested next action.',
      },
      variable_contract_snapshot: null,
      model_config_snapshot: { model: 'gpt-4o', max_tokens: 600 },
      output_contract_snapshot: null,
      changelog: 'Add area scores context. Tighten output format.',
      author: 'edu',
      etag: 'd2f4a8b3',
      body_hash: 'sha256:d2f4a8b3c1e5',
      created_at: '2026-04-15T09:10:00Z',
      promoted_at: '2026-04-15T09:45:00Z',
    },
    {
      id: 'v-rep-001',
      asset_id: 'shadow/daily-report',
      version: '0.1.0',
      state: 'previous',
      body: {
        system: 'Generate a brief daily summary.',
        user: 'Entries: {{entries}}\nDate: {{date}}',
      },
      variable_contract_snapshot: null,
      model_config_snapshot: null,
      output_contract_snapshot: null,
      changelog: 'Initial version.',
      author: 'edu',
      etag: 'e5c9b1d0',
      body_hash: 'sha256:e5c9b1d0a2f7',
      created_at: '2026-01-18T11:00:00Z',
      promoted_at: '2026-01-18T11:30:00Z',
    },
  ],
  'shadow/chat-context-builder': [
    {
      id: 'v-ctx-001',
      asset_id: 'shadow/chat-context-builder',
      version: '0.1.0',
      state: 'archived',
      body: {
        system: null,
        user: 'Build memory context for query: {{query}}\nRecent entries: {{entries}}',
      },
      variable_contract_snapshot: null,
      model_config_snapshot: null,
      output_contract_snapshot: null,
      changelog: 'Initial, superseded by code-level context builder.',
      author: 'edu',
      etag: 'f6a0c2e8',
      body_hash: 'sha256:f6a0c2e8b3d4',
      created_at: '2026-01-25T09:00:00Z',
      promoted_at: null,
    },
  ],
  'eval/llm-judge': [
    {
      id: 'v-judge-004',
      asset_id: 'eval/llm-judge',
      version: '0.4.0',
      state: 'active',
      body: {
        system:
          'You are an impartial evaluation judge. Score model outputs against rubric criteria. Return JSON only.',
        user:
          'Criterion: {{criterion}}\nDescription: {{criterion_description}}\n\nModel output:\n{{model_output}}\n{{#reference_answer}}\nReference answer:\n{{reference_answer}}\n{{/reference_answer}}\n\nReturn: { "score": 0-5, "reasoning": string, "flags": string[] }',
      },
      variable_contract_snapshot: null,
      model_config_snapshot: { model: 'gpt-4o', temperature: 0 },
      output_contract_snapshot: null,
      changelog: 'Add flags field for quality issues. Fix reference_answer conditional.',
      author: 'edu',
      etag: 'g7b1d3f5',
      body_hash: 'sha256:g7b1d3f5c2e6',
      created_at: '2026-05-01T11:45:00Z',
      promoted_at: '2026-05-01T12:00:00Z',
    },
  ],
};

export const MOCK_AUDIT: Record<string, AuditEvent[]> = {
  'shadow/classify-entry': [
    {
      id: 'evt-001',
      actor: 'edu',
      event_type: 'version.promoted',
      asset_id: 'shadow/classify-entry',
      version_id: 'v-cls-003',
      payload: { from_state: 'draft', to_state: 'active' },
      payload_hash: 'sha256:evt001',
      occurred_at: '2026-04-02T15:00:00Z',
    },
    {
      id: 'evt-002',
      actor: 'edu',
      event_type: 'version.created',
      asset_id: 'shadow/classify-entry',
      version_id: 'v-cls-003',
      payload: { version: '0.3.0' },
      payload_hash: 'sha256:evt002',
      occurred_at: '2026-04-02T14:22:00Z',
    },
  ],
};

export const MOCK_STATS: Record<string, AssetStats> = {
  'shadow/classify-entry': { version_count: 3, last_rendered_at: '2026-05-20T08:14:00Z' },
  'shadow/daily-report': { version_count: 2, last_rendered_at: '2026-05-24T07:00:00Z' },
  'shadow/chat-context-builder': { version_count: 1, last_rendered_at: null },
  'eval/llm-judge': { version_count: 4, last_rendered_at: '2026-05-22T12:30:00Z' },
};

export const MOCK_RENDER: RenderResult = {
  version_id: 'v-cls-003',
  inputs: { entry_text: 'I keep postponing the portfolio draft.', user_areas: ['Work', 'Growth'] },
  rendered_system:
    'You are Shadow, a private AI life assistant. Classify the entry below. Return JSON only.\n\nSchema:\n{\n  "type": "thought|task|feeling|loop|note",\n  "valence": -2..2,\n  "areas": string[],\n  "urgency": "low|medium|high",\n  "next_action": string | null\n}',
  rendered_user:
    'Entry: I keep postponing the portfolio draft.\n\nUser areas: Work, Growth',
  rendered_hash: 'sha256:rendered_demo_hash',
  unresolved_variables: [],
  unused_inputs: [],
};
