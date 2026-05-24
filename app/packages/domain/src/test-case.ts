import { z } from 'zod';

export const AssertionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('exact'),
    expected: z.string(),
  }),
  z.object({
    type: z.literal('json_schema'),
    schema: z.record(z.unknown()),
    must_contain: z
      .array(
        z.object({
          path: z.string(),
          contains: z.union([z.string(), z.number(), z.boolean()]),
        }),
      )
      .optional(),
  }),
  z.object({
    type: z.literal('contains'),
    substrings: z.array(z.string()).min(1),
    match_all: z.boolean().default(true),
  }),
  z.object({
    type: z.literal('not_contains'),
    substrings: z.array(z.string()).min(1),
  }),
]);

export type Assertion = z.infer<typeof AssertionSchema>;

export const TestCaseSchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9-]+$/, 'Test case name must be kebab-case'),
  description: z.string().max(500).optional(),
  inputs: z.record(z.unknown()),
  assertion: AssertionSchema,
  tags: z.array(z.string()).default([]),
});

export type TestCase = z.infer<typeof TestCaseSchema>;
