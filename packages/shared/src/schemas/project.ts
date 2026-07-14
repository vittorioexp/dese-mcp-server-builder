import { z } from 'zod';
import {
  SUPPORTED_INPUT_SOURCES,
  SUPPORTED_EXPORT_FORMATS,
  SUPPORTED_DEPLOYMENT_TARGETS,
  PROJECT_ROLES,
} from '../constants.js';

export const inputSourceSchema = z.enum(SUPPORTED_INPUT_SOURCES);

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Name contains invalid characters'),
  description: z.string().max(500).optional(),
  inputSource: inputSourceSchema,
  inputConfig: z.record(z.unknown()),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9\s\-_]+$/)
    .optional(),
  description: z.string().max(500).nullable().optional(),
  inputConfig: z.record(z.unknown()).optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const generationOptionsSchema = z.object({
  includeTests: z.boolean().default(true),
  includeDocker: z.boolean().default(true),
  includeDocs: z.boolean().default(true),
  toolNamePrefix: z.string().max(20).optional(),
  enableStreaming: z.boolean().default(false),
});

export const triggerGenerationSchema = z.object({
  options: generationOptionsSchema.optional(),
});

export const exportFormatSchema = z.enum(SUPPORTED_EXPORT_FORMATS);

export const exportRequestSchema = z.object({
  format: exportFormatSchema,
  options: z.record(z.unknown()).optional(),
});

export const deploymentTargetSchema = z.enum(SUPPORTED_DEPLOYMENT_TARGETS);

export const createDeploymentSchema = z.object({
  versionId: z.string().uuid(),
  target: deploymentTargetSchema,
  config: z.record(z.unknown()).default({}),
});

export const projectRoleSchema = z.enum(PROJECT_ROLES);

export const openapiInputConfigSchema = z.object({
  specUrl: z.string().url().optional(),
  specContent: z.string().optional(),
  baseUrl: z.string().url().optional(),
  authType: z.enum(['none', 'api-key', 'bearer', 'oauth2']).default('none'),
  authConfig: z.record(z.unknown()).optional(),
}).refine(
  (data) => data.specUrl || data.specContent,
  { message: 'Either specUrl or specContent is required' },
);

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
export type PaginationDto = z.infer<typeof paginationSchema>;
export type GenerationOptionsDto = z.infer<typeof generationOptionsSchema>;
export type ExportRequestDto = z.infer<typeof exportRequestSchema>;
export type CreateDeploymentDto = z.infer<typeof createDeploymentSchema>;
