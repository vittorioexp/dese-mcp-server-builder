import type { OpenAPIV3 } from 'openapi-types';
import type { McpToolDefinition, McpResourceDefinition, McpPromptDefinition } from '@dese-mcp/shared';
import { sanitizeToolName, sanitizePromptName, ensureJsonSchemaType } from '@dese-mcp/mcp-core';
import type { AnalyzedOperation, OpenApiAnalysis, ToolGenerationResult, ToolWithOperation } from './types.js';

export function generateFromAnalysis(
  analysis: OpenApiAnalysis,
  options: { toolNamePrefix?: string } = {},
): ToolGenerationResult {
  const pairs: ToolWithOperation[] = [];
  const resources: McpResourceDefinition[] = [];
  const prompts: McpPromptDefinition[] = [];
  const usedNames = new Set<string>();

  for (const operation of analysis.operations) {
    const toolName = ensureUniqueName(
      sanitizeToolName(operation.operationId, options.toolNamePrefix),
      usedNames,
    );
    usedNames.add(toolName);

    pairs.push({
      operation,
      tool: createToolFromOperation(operation, toolName),
    });
  }

  for (const tag of analysis.tags) {
    resources.push({
      uri: `openapi://${tag.toLowerCase().replace(/\s+/g, '-')}`,
      name: `${tag} endpoints`,
      description: `Resources and operations tagged with "${tag}"`,
      mimeType: 'application/json',
    });
  }

  if (Object.keys(analysis.schemas).length > 0) {
    resources.push({
      uri: 'openapi://schemas',
      name: 'API Schemas',
      description: 'OpenAPI schema definitions available in this API',
      mimeType: 'application/json',
    });
  }

  for (const tag of analysis.tags.slice(0, 5)) {
    prompts.push({
      name: sanitizePromptName(`explore_${tag.toLowerCase().replace(/\s+/g, '_')}`),
      title: `Explore ${tag}`,
      description: `Help the user interact with ${tag} endpoints from the API`,
      arguments: [
        {
          name: 'task',
          description: 'What the user wants to accomplish',
          required: true,
        },
      ],
    });
  }

  return { pairs, resources, prompts };
}

function ensureUniqueName(name: string, used: Set<string>): string {
  if (!used.has(name)) return name;

  let counter = 2;
  let candidate = `${name}_${counter}`;
  while (used.has(candidate)) {
    counter++;
    candidate = `${name}_${counter}`;
  }
  return candidate;
}

function createToolFromOperation(
  operation: AnalyzedOperation,
  toolName: string,
): McpToolDefinition {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const param of operation.parameters) {
    const schema = param.schema
      ? convertSchema(param.schema as OpenAPIV3.SchemaObject)
      : { type: 'string' };

    properties[param.name] = {
      ...schema,
      description: param.description ?? `${param.in} parameter: ${param.name}`,
    };

    if (param.required) {
      required.push(param.name);
    }
  }

  if (operation.requestBody) {
    const jsonContent = operation.requestBody.content?.['application/json'];
    if (jsonContent?.schema) {
      properties.body = {
        ...convertSchema(jsonContent.schema as OpenAPIV3.SchemaObject),
        description: operation.requestBody.description ?? 'Request body',
      };
      if (operation.requestBody.required !== false) {
        required.push('body');
      }
    }
  }

  const inputSchema = ensureJsonSchemaType({
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
    additionalProperties: false,
  });

  return {
    name: toolName,
    title: operation.summary,
    description: buildToolDescription(operation),
    inputSchema,
    annotations: {
      readOnlyHint: operation.isReadOnly,
      destructiveHint: operation.isDestructive,
      idempotentHint: operation.method === 'GET' || operation.method === 'PUT',
      openWorldHint: true,
    },
  };
}

function buildToolDescription(operation: AnalyzedOperation): string {
  const parts = [
    operation.description || operation.summary,
    `\n\nHTTP ${operation.method} ${operation.path}`,
  ];

  if (operation.hasPagination) {
    parts.push('\n\nSupports pagination.');
  }

  if (operation.tags.length > 0) {
    parts.push(`\n\nTags: ${operation.tags.join(', ')}`);
  }

  return parts.join('').trim();
}

function convertSchema(schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): Record<string, unknown> {
  if ('$ref' in schema) {
    const refName = schema.$ref.split('/').pop();
    return {
      type: 'object',
      description: `Reference to ${refName}`,
      additionalProperties: true,
    };
  }

  const result: Record<string, unknown> = {};

  if (schema.type) result.type = schema.type;
  if (schema.description) result.description = schema.description;
  if (schema.enum) result.enum = schema.enum;
  if (schema.format) result.format = schema.format;
  if (schema.default !== undefined) result.default = schema.default;
  if (schema.minimum !== undefined) result.minimum = schema.minimum;
  if (schema.maximum !== undefined) result.maximum = schema.maximum;
  if (schema.minLength !== undefined) result.minLength = schema.minLength;
  if (schema.maxLength !== undefined) result.maxLength = schema.maxLength;
  if (schema.pattern) result.pattern = schema.pattern;

  if (schema.type === 'array' && schema.items) {
    result.items = convertSchema(schema.items as OpenAPIV3.SchemaObject);
  }

  if (schema.type === 'object' || schema.properties) {
    result.type = 'object';
    if (schema.properties) {
      result.properties = Object.fromEntries(
        Object.entries(schema.properties).map(([key, value]) => [
          key,
          convertSchema(value as OpenAPIV3.SchemaObject),
        ]),
      );
    }
    if (schema.required) result.required = schema.required;
    if (schema.additionalProperties !== undefined) {
      result.additionalProperties = schema.additionalProperties;
    }
  }

  if (!result.type) {
    result.type = 'string';
  }

  return result;
}
