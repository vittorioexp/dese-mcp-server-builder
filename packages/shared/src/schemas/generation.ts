import { z } from 'zod';

export const mcpToolDefinitionSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Tool name must be alphanumeric with underscores or hyphens'),
  title: z.string().max(100).optional(),
  description: z.string().min(1).max(2000),
  inputSchema: z.record(z.unknown()),
  annotations: z
    .object({
      readOnlyHint: z.boolean().optional(),
      destructiveHint: z.boolean().optional(),
      idempotentHint: z.boolean().optional(),
      openWorldHint: z.boolean().optional(),
    })
    .optional(),
});

export const mcpResourceDefinitionSchema = z.object({
  uri: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  mimeType: z.string().optional(),
  annotations: z
    .object({
      audience: z.array(z.enum(['user', 'assistant'])).optional(),
      priority: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

export const mcpPromptDefinitionSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  title: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  arguments: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        required: z.boolean().optional(),
      }),
    )
    .optional(),
});

export const generatedMcpServerSchema = z.object({
  name: z.string().min(1).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(1),
  tools: z.array(mcpToolDefinitionSchema),
  resources: z.array(mcpResourceDefinitionSchema),
  prompts: z.array(mcpPromptDefinitionSchema),
  authentication: z
    .object({
      type: z.enum(['none', 'api-key', 'oauth2', 'bearer']),
      config: z.record(z.unknown()).optional(),
    })
    .optional(),
  metadata: z.object({
    generatedAt: z.string().datetime(),
    sourceType: z.string(),
    sourceHash: z.string().optional(),
  }),
});

export type McpToolDefinitionDto = z.infer<typeof mcpToolDefinitionSchema>;
export type GeneratedMcpServerDto = z.infer<typeof generatedMcpServerSchema>;
