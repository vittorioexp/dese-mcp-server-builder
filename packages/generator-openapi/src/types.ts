import type { OpenAPIV3 } from 'openapi-types';
import type { McpToolDefinition, McpResourceDefinition, McpPromptDefinition } from '@dese-mcp/shared';

export interface OpenApiAnalysis {
  spec: OpenAPIV3.Document;
  baseUrl: string;
  authType: 'none' | 'api-key' | 'bearer' | 'oauth2';
  authConfig: Record<string, unknown>;
  operations: AnalyzedOperation[];
  schemas: Record<string, OpenAPIV3.SchemaObject>;
  tags: string[];
}

export interface AnalyzedOperation {
  operationId: string;
  method: string;
  path: string;
  summary: string;
  description: string;
  tags: string[];
  parameters: OpenAPIV3.ParameterObject[];
  requestBody?: OpenAPIV3.RequestBodyObject;
  responses: OpenAPIV3.ResponsesObject;
  security: OpenAPIV3.SecurityRequirementObject[];
  deprecated: boolean;
  hasPagination: boolean;
  isReadOnly: boolean;
  isDestructive: boolean;
}

export interface DetectedAuth {
  type: 'none' | 'api-key' | 'bearer' | 'oauth2';
  config: Record<string, unknown>;
}

export interface ToolWithOperation {
  tool: McpToolDefinition;
  operation: AnalyzedOperation;
}

export interface ToolGenerationResult {
  pairs: ToolWithOperation[];
  resources: McpResourceDefinition[];
  prompts: McpPromptDefinition[];
}
