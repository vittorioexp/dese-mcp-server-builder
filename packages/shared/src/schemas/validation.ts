import { z } from 'zod';

export const validationIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: z.enum(['error', 'warning', 'info']),
  path: z.string().optional(),
  suggestion: z.string().optional(),
});

export const validationResultSchema = z.object({
  valid: z.boolean(),
  issues: z.array(validationIssueSchema),
  validatedAt: z.string().datetime(),
  durationMs: z.number().int().min(0),
});

export type ValidationResultDto = z.infer<typeof validationResultSchema>;
