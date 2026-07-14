import type { GeneratedFile, GeneratedMcpServer, GenerationResult } from '@dese-mcp/shared';
import type { GeneratorContext } from '@dese-mcp/generator-core';
import { BaseMcpGenerator } from '@dese-mcp/generator-core';
import { toKebabCase, toPascalCase } from '@dese-mcp/mcp-core';
import { analyzeOpenApiSpec, loadOpenApiSpec } from './analyzer.js';
import { generateFromAnalysis } from './tool-generator.js';
import type { OpenApiAnalysis, ToolWithOperation } from './types.js';

export class OpenApiMcpGenerator extends BaseMcpGenerator<OpenApiAnalysis> {
  readonly sourceType = 'openapi' as const;

  async analyze(context: GeneratorContext): Promise<OpenApiAnalysis> {
    const spec = await loadOpenApiSpec(context);
    return analyzeOpenApiSpec(spec, context);
  }

  async generate(context: GeneratorContext, analysis: OpenApiAnalysis): Promise<GenerationResult> {
    const warnings: string[] = [];
    const { pairs, resources, prompts } = generateFromAnalysis(analysis, {
      toolNamePrefix: context.options.toolNamePrefix,
    });

    const tools = pairs.map((p) => p.tool);

    if (tools.length === 0) {
      warnings.push('No operations found in OpenAPI specification');
    }

    const serverName = toKebabCase(context.projectName);
    const server: GeneratedMcpServer = {
      name: serverName,
      version: '1.0.0',
      description: analysis.spec.info.description ?? analysis.spec.info.title,
      tools,
      resources,
      prompts,
      authentication: {
        type: analysis.authType,
        config: analysis.authConfig,
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        sourceType: 'openapi',
        sourceHash: await hashSpec(analysis.spec.info.title + analysis.spec.info.version),
      },
    };

    const files = generateProjectFiles(server, analysis, pairs);

    if (context.options.includeTests) {
      files.push(...generateTestFiles(server));
    }

    if (context.options.includeDocker) {
      files.push(...generateDockerFiles(serverName));
    }

    if (context.options.includeDocs) {
      files.push(generateReadme(server, analysis));
    }

    return { server, files, warnings };
  }
}

async function hashSpec(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

function generateProjectFiles(
  server: GeneratedMcpServer,
  analysis: OpenApiAnalysis,
  pairs: ToolWithOperation[],
): GeneratedFile[] {
  const className = toPascalCase(server.name);
  const files: GeneratedFile[] = [];

  files.push({
    path: 'package.json',
    language: 'json',
    content: JSON.stringify(
      {
        name: `@mcp/${server.name}`,
        version: server.version,
        description: server.description,
        type: 'module',
        main: './dist/index.js',
        scripts: {
          build: 'tsc',
          start: 'node dist/index.js',
          dev: 'tsx watch src/index.ts',
          test: 'vitest run',
          lint: 'eslint src/',
        },
        dependencies: {
          '@modelcontextprotocol/sdk': '^1.12.1',
          zod: '^3.24.1',
        },
        devDependencies: {
          '@types/node': '^22.10.5',
          tsx: '^4.19.2',
          typescript: '^5.7.3',
          vitest: '^2.1.8',
        },
        engines: { node: '>=20' },
      },
      null,
      2,
    ),
  });

  files.push({
    path: 'tsconfig.json',
    language: 'json',
    content: JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          declaration: true,
        },
        include: ['src/**/*'],
      },
      null,
      2,
    ),
  });

  files.push({
    path: 'src/index.ts',
    language: 'typescript',
    content: generateServerEntry(className),
  });

  files.push({
    path: 'src/server.ts',
    language: 'typescript',
    content: generateServerClass(className, server),
  });

  files.push({
    path: 'src/tools/index.ts',
    language: 'typescript',
    content: generateToolsIndex(server),
  });

  for (const { tool, operation } of pairs) {
    files.push({
      path: `src/tools/${tool.name}.ts`,
      language: 'typescript',
      content: generateToolHandler(tool, operation),
    });
  }

  files.push({
    path: 'src/resources/index.ts',
    language: 'typescript',
    content: generateResourcesIndex(server, analysis),
  });

  files.push({
    path: 'src/prompts/index.ts',
    language: 'typescript',
    content: generatePromptsIndex(server),
  });

  files.push({
    path: 'src/config.ts',
    language: 'typescript',
    content: generateConfig(analysis),
  });

  files.push({
    path: 'src/lib/http-client.ts',
    language: 'typescript',
    content: generateHttpClient(analysis),
  });

  return files;
}

function generateServerEntry(className: string): string {
  return `import { ${className}Server } from './server.js';

const server = new ${className}Server();

server.start().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});
`;
}

function generateServerClass(
  className: string,
  server: GeneratedMcpServer,
): string {
  return `import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { toolDefinitions, toolHandlers } from './tools/index.js';
import { resourceDefinitions, readResource } from './resources/index.js';
import { promptDefinitions, getPrompt } from './prompts/index.js';

export class ${className}Server {
  private server: Server;
  private transport: StdioServerTransport | null = null;

  constructor() {
    this.server = new Server(
      { name: '${server.name}', version: '${server.version}' },
      { capabilities: { tools: {}, resources: {}, prompts: {} } },
    );
    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: toolDefinitions,
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const handler = toolHandlers[request.params.name];
      if (!handler) {
        return {
          content: [{ type: 'text' as const, text: \`Unknown tool: \${request.params.name}\` }],
          isError: true,
        };
      }
      return handler(request.params.arguments ?? {});
    });

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: resourceDefinitions,
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const content = await readResource(request.params.uri);
      return { contents: [content] };
    });

    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: promptDefinitions,
    }));

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      return getPrompt(request.params.name, request.params.arguments ?? {});
    });
  }

  async start(): Promise<void> {
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
  }

  async stop(): Promise<void> {
    if (this.transport) {
      await this.server.close();
      this.transport = null;
    }
  }
}
`;
}

function generateToolsIndex(server: GeneratedMcpServer): string {
  const imports = server.tools
    .map((t) => `import { ${t.name}Handler, ${t.name}Definition } from './${t.name}.js';`)
    .join('\n');

  const definitions = server.tools.map((t) => `${t.name}Definition`).join(',\n  ');
  const handlers = server.tools.map((t) => `  ${t.name}: ${t.name}Handler`).join(',\n');

  return `${imports}

export const toolDefinitions = [
  ${definitions},
];

export const toolHandlers: Record<string, (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }>> = {
${handlers},
};
`;
}

function generateToolHandler(
  tool: GeneratedMcpServer['tools'][0],
  operation: import('./types.js').AnalyzedOperation,
): string {
  const method = operation.method;
  const path = operation.path;
  const pathParams = operation.parameters.filter((p) => p.in === 'path');
  const queryParams = operation.parameters.filter((p) => p.in === 'query');
  const headerParams = operation.parameters.filter((p) => p.in === 'header');

  let pathTemplate = path;
  for (const param of pathParams) {
    pathTemplate = pathTemplate.replace(`{${param.name}}`, `\${encodeURIComponent(String(args.${param.name}))}`);
  }

  const isTemplate = pathTemplate.includes('${');
  const pathExpr = isTemplate ? `\`${pathTemplate}\`` : `'${path}'`;

  return `import { httpClient } from '../lib/http-client.js';

export const ${tool.name}Definition = ${JSON.stringify(
    {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      ...(tool.annotations ? { annotations: tool.annotations } : {}),
    },
    null,
    2,
  )};

export async function ${tool.name}Handler(args: Record<string, unknown>) {
  try {
    ${pathParams.map((p) => `    if (args.${p.name} === undefined) throw new Error('Missing required parameter: ${p.name}');`).join('\n')}

    const url = new URL(${isTemplate ? pathExpr : `'${path}'`}, httpClient.baseUrl);
    ${queryParams.map((p) => `    if (args.${p.name} !== undefined) url.searchParams.set('${p.name}', String(args.${p.name}));`).join('\n')}

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    ${headerParams.map((p) => `    if (args.${p.name} !== undefined) headers['${p.name}'] = String(args.${p.name});`).join('\n')}

    const response = await httpClient.request('${method}', url.toString(), {
      headers,
      ${method !== 'GET' && method !== 'DELETE' ? 'body: args.body ? JSON.stringify(args.body) : undefined,' : ''}
    });

    const data = await response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      parsed = data;
    }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(parsed, null, 2) }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text' as const, text: \`Error executing ${tool.name}: \${message}\` }],
      isError: true,
    };
  }
}
`;
}

function generateResourcesIndex(server: GeneratedMcpServer, analysis: OpenApiAnalysis): string {
  return `import type { Resource } from '@modelcontextprotocol/sdk/types.js';

export const resourceDefinitions: Resource[] = ${JSON.stringify(
    server.resources.map((r) => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      mimeType: r.mimeType,
    })),
    null,
    2,
  )};

export async function readResource(uri: string): Promise<{ uri: string; mimeType: string; text: string }> {
  if (uri === 'openapi://schemas') {
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(${JSON.stringify(analysis.schemas, null, 2)}, null, 2),
    };
  }

  const tag = uri.replace('openapi://', '');
  const endpoints = ${JSON.stringify(
    analysis.operations.map((op) => ({
      method: op.method,
      path: op.path,
      summary: op.summary,
      tags: op.tags,
    })),
  )}.filter((ep) => ep.tags.some((t) => t.toLowerCase().replace(/\\s+/g, '-') === tag));

  return {
    uri,
    mimeType: 'application/json',
    text: JSON.stringify({ tag, endpoints }, null, 2),
  };
}
`;
}

function generatePromptsIndex(server: GeneratedMcpServer): string {
  return `import type { Prompt, PromptMessage } from '@modelcontextprotocol/sdk/types.js';

export const promptDefinitions: Prompt[] = ${JSON.stringify(
    server.prompts.map((p) => ({
      name: p.name,
      description: p.description,
      arguments: p.arguments,
    })),
    null,
    2,
  )};

export async function getPrompt(
  name: string,
  args: Record<string, unknown>,
): Promise<{ description?: string; messages: PromptMessage[] }> {
  const task = String(args.task ?? 'Explore the API');

  return {
    description: \`Assistance for \${name}\`,
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: \`\${task}\\n\\nUse the available tools to help accomplish this task. Always confirm destructive operations before executing them.\`,
        },
      },
    ],
  };
}
`;
}

function generateConfig(analysis: OpenApiAnalysis): string {
  return `export const config = {
  baseUrl: '${analysis.baseUrl}',
  auth: {
    type: '${analysis.authType}' as const,
    config: ${JSON.stringify(analysis.authConfig, null, 2)},
  },
} as const;
`;
}

function generateHttpClient(analysis: OpenApiAnalysis): string {
  const authSetup =
    analysis.authType === 'api-key'
      ? `    const headerName = (config.auth.config.headerName as string) ?? 'X-API-Key';
    const apiKey = process.env.API_KEY;
    if (apiKey) headers[headerName] = apiKey;`
      : analysis.authType === 'bearer'
        ? `    const token = process.env.API_TOKEN ?? process.env.BEARER_TOKEN;
    if (token) headers['Authorization'] = \`Bearer \${token}\`;`
        : '';

  return `import { config } from '../config.js';

export const httpClient = {
  baseUrl: config.baseUrl,

  async request(
    method: string,
    url: string,
    options: { headers?: Record<string, string>; body?: string } = {},
  ): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...options.headers,
    };

${authSetup}

    const response = await fetch(url, {
      method,
      headers,
      body: options.body,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(\`HTTP \${response.status}: \${body}\`);
    }

    return response;
  },
};
`;
}

function generateTestFiles(server: GeneratedMcpServer): GeneratedFile[] {
  return [
    {
      path: 'src/tools/tools.test.ts',
      language: 'typescript',
      content: `import { describe, it, expect } from 'vitest';
import { toolDefinitions } from './index.js';

describe('Tool definitions', () => {
  it('exports ${server.tools.length} tools', () => {
    expect(toolDefinitions).toHaveLength(${server.tools.length});
  });

  it('each tool has required fields', () => {
    for (const tool of toolDefinitions) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it('tool names are unique', () => {
    const names = toolDefinitions.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
`,
    },
  ];
}

function generateDockerFiles(serverName: string): GeneratedFile[] {
  return [
    {
      path: 'Dockerfile',
      language: 'dockerfile',
      content: `FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
USER node
CMD ["node", "dist/index.js"]
`,
    },
    {
      path: 'docker-compose.yml',
      language: 'yaml',
      content: `services:
  ${serverName}:
    build: .
    environment:
      - API_KEY=\${API_KEY:-}
      - API_TOKEN=\${API_TOKEN:-}
    stdin_open: true
    tty: true
`,
    },
  ];
}

function generateReadme(server: GeneratedMcpServer, analysis: OpenApiAnalysis): GeneratedFile {
  return {
    path: 'README.md',
    language: 'markdown',
    content: `# ${server.name}

${server.description}

Generated by [Dese MCP Server Builder](https://github.com/vittorioexp/dese-mcp-server-builder) from an OpenAPI specification.

## Overview

- **Tools:** ${server.tools.length}
- **Resources:** ${server.resources.length}
- **Prompts:** ${server.prompts.length}
- **Base URL:** ${analysis.baseUrl}
- **Authentication:** ${analysis.authType}

## Installation

\`\`\`bash
npm install
npm run build
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`

Configure via environment variables:

| Variable | Description |
|----------|-------------|
| \`API_KEY\` | API key for authentication |
| \`API_TOKEN\` | Bearer token for authentication |

## Docker

\`\`\`bash
docker compose up --build
\`\`\`

## Tools

${server.tools.map((t) => `- **${t.name}**: ${t.description.split('\n')[0]}`).join('\n')}

## License

MIT
`,
  };
}

export const openApiGenerator = new OpenApiMcpGenerator();
