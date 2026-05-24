import { z } from 'zod';

export const ProviderSchema = z.enum(['openai']);
export type Provider = z.infer<typeof ProviderSchema>;

export const ModelConfigSchema = z.object({
  provider: ProviderSchema,
  model: z.string().min(1).max(128),
  temperature: z.number().min(0).max(2).default(0),
  max_tokens: z.number().int().positive().max(32768).optional(),
  top_p: z.number().min(0).max(1).optional(),
  seed: z.number().int().optional(),
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;

/** Structured prompt body. Single-string assets set system to null. */
export const PromptBodySchema = z.object({
  system: z.string().nullable(),
  user: z.string().min(1),
});

export type PromptBody = z.infer<typeof PromptBodySchema>;

/** Output contract — what shape the prompt is supposed to return. */
export const OutputContractSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('free_text') }),
  z.object({ kind: z.literal('enum'), values: z.array(z.string()).min(1) }),
  z.object({ kind: z.literal('json_schema'), schema: z.record(z.unknown()) }),
]);

export type OutputContract = z.infer<typeof OutputContractSchema>;
