import { describe, expect, it } from 'vitest';
import { validateMcpServer } from './index.js';
import type { GeneratedMcpServer } from '@dese-mcp/shared';

const validServer: GeneratedMcpServer = {
  name: 'test-server',
  version: '1.0.0',
  description: 'Test MCP server',
  tools: [
    {
      name: 'get_user',
      description: 'Retrieve a user by ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'User ID' },
        },
        required: ['id'],
      },
    },
  ],
  resources: [
    {
      uri: 'users://list',
      name: 'users',
      description: 'List of users',
      mimeType: 'application/json',
    },
  ],
  prompts: [
    {
      name: 'summarize_user',
      description: 'Summarize user profile',
    },
  ],
  metadata: {
    generatedAt: new Date().toISOString(),
    sourceType: 'openapi',
  },
};

describe('validateMcpServer', () => {
  it('validates a correct server', () => {
    const result = validateMcpServer(validServer);
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('rejects duplicate tool names', () => {
    const server: GeneratedMcpServer = {
      ...validServer,
      tools: [
        validServer.tools[0],
        { ...validServer.tools[0], description: 'Duplicate' },
      ],
    };
    const result = validateMcpServer(server);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'TOOL_NAME_DUPLICATE')).toBe(true);
  });

  it('rejects invalid tool names', () => {
    const server: GeneratedMcpServer = {
      ...validServer,
      tools: [{ ...validServer.tools[0], name: 'invalid tool name!' }],
    };
    const result = validateMcpServer(server);
    expect(result.valid).toBe(false);
  });
});
