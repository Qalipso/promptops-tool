import { z } from 'zod';

/** Variable types supported by the input contract. */
export const VariableTypeSchema = z.enum(['string', 'enum', 'number', 'bool', 'object', 'array']);
export type VariableType = z.infer<typeof VariableTypeSchema>;

/** Variable naming convention enforces the four-bucket pattern from variable-design.md. */
export const VariableNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^(user|context|system|config)_[a-z][a-z0-9_]*$/,
    'Variable name must start with user_, context_, system_, or config_ prefix',
  );

const baseVariable = {
  name: VariableNameSchema,
  required: z.boolean().default(false),
  description: z.string().min(1).max(500),
};

export const StringVariableSchema = z.object({
  ...baseVariable,
  type: z.literal('string'),
  default: z.string().nullable().optional(),
});

export const EnumVariableSchema = z.object({
  ...baseVariable,
  type: z.literal('enum'),
  enum_values: z.array(z.string()).min(1),
  default: z.string().nullable().optional(),
});

export const NumberVariableSchema = z.object({
  ...baseVariable,
  type: z.literal('number'),
  default: z.number().nullable().optional(),
});

export const BoolVariableSchema = z.object({
  ...baseVariable,
  type: z.literal('bool'),
  default: z.boolean().nullable().optional(),
});

export const ObjectVariableSchema = z.object({
  ...baseVariable,
  type: z.literal('object'),
  schema: z.record(z.unknown()),
  default: z.unknown().nullable().optional(),
});

export const ArrayVariableSchema = z.object({
  ...baseVariable,
  type: z.literal('array'),
  schema: z.record(z.unknown()),
  default: z.array(z.unknown()).nullable().optional(),
});

export const VariableSchema = z.discriminatedUnion('type', [
  StringVariableSchema,
  EnumVariableSchema,
  NumberVariableSchema,
  BoolVariableSchema,
  ObjectVariableSchema,
  ArrayVariableSchema,
]);

export type Variable = z.infer<typeof VariableSchema>;

export const VariableContractSchema = z.array(VariableSchema).superRefine((vars, ctx) => {
  const names = new Set<string>();
  for (const v of vars) {
    if (names.has(v.name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate variable name: ${v.name}`,
      });
    }
    names.add(v.name);
    if (v.required && v.default !== undefined && v.default !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Required variable ${v.name} must not have a default value`,
      });
    }
  }
});

export type VariableContract = z.infer<typeof VariableContractSchema>;
