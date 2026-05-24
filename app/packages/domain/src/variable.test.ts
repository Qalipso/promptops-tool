import { describe, expect, it } from 'vitest';
import { VariableContractSchema, VariableNameSchema } from './variable.js';

describe('VariableNameSchema', () => {
  it.each(['user_query', 'context_recent_areas', 'system_today', 'config_max_slots'])(
    'accepts well-prefixed name %s',
    (name) => {
      expect(VariableNameSchema.safeParse(name).success).toBe(true);
    },
  );

  it.each(['query', 'userQuery', 'User_query', 'random_var'])(
    'rejects un-prefixed or wrongly-cased name %s',
    (name) => {
      expect(VariableNameSchema.safeParse(name).success).toBe(false);
    },
  );
});

describe('VariableContractSchema', () => {
  it('rejects duplicate variable names', () => {
    const result = VariableContractSchema.safeParse([
      { name: 'user_query', type: 'string', required: true, description: 'A' },
      { name: 'user_query', type: 'string', required: false, description: 'B' },
    ]);
    expect(result.success).toBe(false);
  });

  it('rejects required variable with default', () => {
    const result = VariableContractSchema.safeParse([
      {
        name: 'user_query',
        type: 'string',
        required: true,
        default: 'x',
        description: 'd',
      },
    ]);
    expect(result.success).toBe(false);
  });

  it('accepts valid contract with mixed types', () => {
    const result = VariableContractSchema.safeParse([
      { name: 'user_query', type: 'string', required: true, description: 'q' },
      {
        name: 'config_language',
        type: 'enum',
        required: false,
        default: 'en',
        enum_values: ['en', 'es', 'pt'],
        description: 'lang',
      },
      { name: 'system_today', type: 'string', required: true, description: 'today' },
    ]);
    expect(result.success).toBe(true);
  });
});
