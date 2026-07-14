import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPIV3 } from 'openapi-types';
import type { GeneratorContext } from '@dese-mcp/generator-core';
import { openapiInputConfigSchema } from '@dese-mcp/shared';
import type { AnalyzedOperation, DetectedAuth, OpenApiAnalysis } from './types.js';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;
const PAGINATION_PARAMS = ['page', 'offset', 'limit', 'cursor', 'per_page', 'page_size'];

export async function loadOpenApiSpec(context: GeneratorContext): Promise<OpenAPIV3.Document> {
  const config = openapiInputConfigSchema.parse(context.inputConfig);

  if (config.specContent) {
    const parsed = JSON.parse(config.specContent) as OpenAPIV3.Document;
    return SwaggerParser.validate(parsed) as Promise<OpenAPIV3.Document>;
  }

  if (config.specUrl) {
    return SwaggerParser.validate(config.specUrl) as Promise<OpenAPIV3.Document>;
  }

  throw new Error('OpenAPI specification not provided');
}

export function analyzeOpenApiSpec(
  spec: OpenAPIV3.Document,
  context: GeneratorContext,
): OpenApiAnalysis {
  const config = openapiInputConfigSchema.parse(context.inputConfig);
  const baseUrl = resolveBaseUrl(spec, config.baseUrl);
  const auth = detectAuthentication(spec, config.authType, config.authConfig);
  const operations = extractOperations(spec);
  const schemas = extractSchemas(spec);

  const tags = new Set<string>();
  for (const op of operations) {
    op.tags.forEach((tag) => tags.add(tag));
  }

  return {
    spec,
    baseUrl,
    authType: auth.type,
    authConfig: auth.config,
    operations,
    schemas,
    tags: Array.from(tags),
  };
}

function resolveBaseUrl(spec: OpenAPIV3.Document, override?: string): string {
  if (override) return override.replace(/\/$/, '');

  const server = spec.servers?.[0];
  if (server?.url) {
    return server.url.replace(/\/$/, '');
  }

  return 'http://localhost:3000';
}

function detectAuthentication(
  spec: OpenAPIV3.Document,
  configAuthType?: string,
  configAuth?: Record<string, unknown>,
): DetectedAuth {
  if (configAuthType && configAuthType !== 'none') {
    return { type: configAuthType as DetectedAuth['type'], config: configAuth ?? {} };
  }

  const schemes = spec.components?.securitySchemes ?? {};

  for (const [, scheme] of Object.entries(schemes)) {
    if ('$ref' in scheme) continue;

    if (scheme.type === 'apiKey') {
      return {
        type: 'api-key',
        config: {
          headerName: scheme.in === 'header' ? scheme.name : 'X-API-Key',
          in: scheme.in,
          name: scheme.name,
        },
      };
    }

    if (scheme.type === 'http' && scheme.scheme === 'bearer') {
      return { type: 'bearer', config: { scheme: 'Bearer' } };
    }

    if (scheme.type === 'oauth2') {
      const flows = scheme.flows;
      const tokenUrl =
        flows?.clientCredentials?.tokenUrl ??
        flows?.password?.tokenUrl ??
        flows?.authorizationCode?.tokenUrl;

      return {
        type: 'oauth2',
        config: {
          tokenUrl,
          scopes: Object.keys(flows?.clientCredentials?.scopes ?? {}),
        },
      };
    }
  }

  return { type: 'none', config: {} };
}

function extractOperations(spec: OpenAPIV3.Document): AnalyzedOperation[] {
  const operations: AnalyzedOperation[] = [];

  if (!spec.paths) return operations;

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem) continue;

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as OpenAPIV3.OperationObject | undefined;
      if (!operation) continue;

      const operationId =
        operation.operationId ?? generateOperationId(method, path);

      const paramNames = (operation.parameters ?? []).map((p) =>
        '$ref' in p ? p.$ref.split('/').pop()! : p.name,
      );

      operations.push({
        operationId,
        method: method.toUpperCase(),
        path,
        summary: operation.summary ?? `${method.toUpperCase()} ${path}`,
        description: operation.description ?? operation.summary ?? '',
        tags: operation.tags ?? ['default'],
        parameters: resolveParameters(operation.parameters, spec),
        requestBody: resolveRequestBody(operation.requestBody, spec),
        responses: operation.responses ?? {},
        security: operation.security ?? spec.security ?? [],
        deprecated: operation.deprecated ?? false,
        hasPagination: paramNames.some((p) =>
          PAGINATION_PARAMS.includes(p.toLowerCase()),
        ),
        isReadOnly: method === 'get',
        isDestructive: method === 'delete',
      });
    }
  }

  return operations.filter((op) => !op.deprecated);
}

function generateOperationId(method: string, path: string): string {
  const sanitized = path
    .replace(/\{([^}]+)\}/g, 'by_$1')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  return `${method}_${sanitized}`;
}

function resolveParameters(
  parameters: (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[] | undefined,
  spec: OpenAPIV3.Document,
): OpenAPIV3.ParameterObject[] {
  if (!parameters) return [];

  return parameters.map((param) => {
    if ('$ref' in param) {
      const refName = param.$ref.split('/').pop()!;
      const resolved = spec.components?.parameters?.[refName];
      if (resolved && !('$ref' in resolved)) return resolved;
      return { name: refName, in: 'query', schema: { type: 'string' } };
    }
    return param;
  });
}

function resolveRequestBody(
  body: OpenAPIV3.RequestBodyObject | OpenAPIV3.ReferenceObject | undefined,
  spec: OpenAPIV3.Document,
): OpenAPIV3.RequestBodyObject | undefined {
  if (!body) return undefined;
  if ('$ref' in body) {
    const refName = body.$ref.split('/').pop()!;
    const resolved = spec.components?.requestBodies?.[refName];
    if (resolved && !('$ref' in resolved)) return resolved;
    return undefined;
  }
  return body;
}

function extractSchemas(spec: OpenAPIV3.Document): Record<string, OpenAPIV3.SchemaObject> {
  const schemas: Record<string, OpenAPIV3.SchemaObject> = {};
  const components = spec.components?.schemas ?? {};

  for (const [name, schema] of Object.entries(components)) {
    if (schema && !('$ref' in schema)) {
      schemas[name] = schema as OpenAPIV3.SchemaObject;
    }
  }

  return schemas;
}
