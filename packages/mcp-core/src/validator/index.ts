import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { generatedMcpServerSchema, type GeneratedMcpServerDto } from '@dese-mcp/shared';
import type { GeneratedMcpServer, ValidationIssue, ValidationResult } from '@dese-mcp/shared';
import { isValidPromptName, isValidToolName } from '../naming.js';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

export interface ValidateOptions {
  strict?: boolean;
}

export function validateMcpServer(
  server: GeneratedMcpServer,
  options: ValidateOptions = {},
): ValidationResult {
  const start = Date.now();
  const issues: ValidationIssue[] = [];

  const zodResult = generatedMcpServerSchema.safeParse(server);
  if (!zodResult.success) {
    for (const issue of zodResult.error.issues) {
      issues.push({
        code: 'SCHEMA_INVALID',
        message: issue.message,
        severity: 'error',
        path: issue.path.join('.'),
      });
    }
  }

  validateToolDefinitions(server, issues);
  validateResourceDefinitions(server, issues);
  validatePromptDefinitions(server, issues);
  validateAuthentication(server, issues);

  if (options.strict) {
    validateUniqueNames(server, issues);
    validateSchemaReferences(server, issues);
  }

  const hasErrors = issues.some((i) => i.severity === 'error');

  return {
    valid: !hasErrors,
    issues,
    validatedAt: new Date().toISOString(),
    durationMs: Date.now() - start,
  };
}

function validateToolDefinitions(server: GeneratedMcpServer, issues: ValidationIssue[]): void {
  const seenNames = new Set<string>();

  for (const tool of server.tools) {
    if (!isValidToolName(tool.name)) {
      issues.push({
        code: 'TOOL_NAME_INVALID',
        message: `Tool name "${tool.name}" does not match MCP naming requirements`,
        severity: 'error',
        path: `tools.${tool.name}`,
        suggestion: 'Use alphanumeric characters, underscores, or hyphens (max 64 chars)',
      });
    }

    if (seenNames.has(tool.name)) {
      issues.push({
        code: 'TOOL_NAME_DUPLICATE',
        message: `Duplicate tool name: ${tool.name}`,
        severity: 'error',
        path: `tools.${tool.name}`,
      });
    }
    seenNames.add(tool.name);

    if (!tool.description?.trim()) {
      issues.push({
        code: 'TOOL_DESCRIPTION_MISSING',
        message: `Tool "${tool.name}" is missing a description`,
        severity: 'error',
        path: `tools.${tool.name}.description`,
      });
    }

    const schemaValid = validateInputSchema(tool.inputSchema, `tools.${tool.name}.inputSchema`, issues);
    if (!schemaValid && !tool.inputSchema?.type) {
      issues.push({
        code: 'TOOL_SCHEMA_INVALID',
        message: `Tool "${tool.name}" has an invalid input schema`,
        severity: 'error',
        path: `tools.${tool.name}.inputSchema`,
      });
    }
  }
}

function validateResourceDefinitions(server: GeneratedMcpServer, issues: ValidationIssue[]): void {
  const seenUris = new Set<string>();

  for (const resource of server.resources) {
    if (!resource.uri?.trim()) {
      issues.push({
        code: 'RESOURCE_URI_MISSING',
        message: `Resource "${resource.name}" is missing a URI`,
        severity: 'error',
        path: `resources.${resource.name}.uri`,
      });
    }

    if (seenUris.has(resource.uri)) {
      issues.push({
        code: 'RESOURCE_URI_DUPLICATE',
        message: `Duplicate resource URI: ${resource.uri}`,
        severity: 'error',
        path: `resources.${resource.uri}`,
      });
    }
    seenUris.add(resource.uri);

    try {
      if (resource.uri.includes('://')) {
        new URL(resource.uri);
      }
    } catch {
      issues.push({
        code: 'RESOURCE_URI_INVALID',
        message: `Resource URI "${resource.uri}" is not a valid URI`,
        severity: 'warning',
        path: `resources.${resource.name}.uri`,
        suggestion: 'Use a valid URI format like "resource://category/name"',
      });
    }
  }
}

function validatePromptDefinitions(server: GeneratedMcpServer, issues: ValidationIssue[]): void {
  const seenNames = new Set<string>();

  for (const prompt of server.prompts) {
    if (!isValidPromptName(prompt.name)) {
      issues.push({
        code: 'PROMPT_NAME_INVALID',
        message: `Prompt name "${prompt.name}" does not match MCP naming requirements`,
        severity: 'error',
        path: `prompts.${prompt.name}`,
      });
    }

    if (seenNames.has(prompt.name)) {
      issues.push({
        code: 'PROMPT_NAME_DUPLICATE',
        message: `Duplicate prompt name: ${prompt.name}`,
        severity: 'error',
        path: `prompts.${prompt.name}`,
      });
    }
    seenNames.add(prompt.name);
  }
}

function validateAuthentication(server: GeneratedMcpServer, issues: ValidationIssue[]): void {
  const auth = server.authentication;
  if (!auth || auth.type === 'none') return;

  if (auth.type === 'api-key' && !auth.config?.headerName) {
    issues.push({
      code: 'AUTH_CONFIG_INCOMPLETE',
      message: 'API key authentication requires headerName in config',
      severity: 'warning',
      path: 'authentication.config.headerName',
      suggestion: 'Set headerName to the header used for the API key (e.g., X-API-Key)',
    });
  }

  if (auth.type === 'oauth2' && !auth.config?.tokenUrl) {
    issues.push({
      code: 'AUTH_CONFIG_INCOMPLETE',
      message: 'OAuth2 authentication requires tokenUrl in config',
      severity: 'error',
      path: 'authentication.config.tokenUrl',
    });
  }
}

function validateUniqueNames(server: GeneratedMcpServer, issues: ValidationIssue[]): void {
  const allNames = [
    ...server.tools.map((t) => t.name),
    ...server.prompts.map((p) => p.name),
  ];
  const duplicates = allNames.filter((name, index) => allNames.indexOf(name) !== index);

  for (const name of new Set(duplicates)) {
    issues.push({
      code: 'NAME_COLLISION',
      message: `Name "${name}" is used by both a tool and a prompt`,
      severity: 'error',
    });
  }
}

function validateSchemaReferences(server: GeneratedMcpServer, issues: ValidationIssue[]): void {
  if (server.tools.length === 0) {
    issues.push({
      code: 'NO_TOOLS',
      message: 'MCP server has no tools defined',
      severity: 'warning',
      suggestion: 'Consider adding at least one tool for agent interaction',
    });
  }
}

function validateInputSchema(
  schema: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[],
): boolean {
  try {
    ajv.compile(schema);
    return true;
  } catch (error) {
    issues.push({
      code: 'JSON_SCHEMA_INVALID',
      message: error instanceof Error ? error.message : 'Invalid JSON Schema',
      severity: 'error',
      path,
    });
    return false;
  }
}

export function parseGeneratedServer(data: unknown): GeneratedMcpServerDto {
  return generatedMcpServerSchema.parse(data);
}
