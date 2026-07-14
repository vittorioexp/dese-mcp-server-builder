export interface McpToolDefinition {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
}

export interface McpResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  annotations?: {
    audience?: ('user' | 'assistant')[];
    priority?: number;
  };
}

export interface McpPromptDefinition {
  name: string;
  title?: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface GeneratedMcpServer {
  name: string;
  version: string;
  description: string;
  tools: McpToolDefinition[];
  resources: McpResourceDefinition[];
  prompts: McpPromptDefinition[];
  authentication?: {
    type: 'none' | 'api-key' | 'oauth2' | 'bearer';
    config?: Record<string, unknown>;
  };
  metadata: {
    generatedAt: string;
    sourceType: string;
    sourceHash?: string;
  };
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface GenerationResult {
  server: GeneratedMcpServer;
  files: GeneratedFile[];
  warnings: string[];
}

export interface GenerationJobPayload {
  projectId: string;
  versionId: string;
  inputSource: string;
  inputConfig: Record<string, unknown>;
  options?: GenerationOptions;
}

export interface GenerationOptions {
  includeTests?: boolean;
  includeDocker?: boolean;
  includeDocs?: boolean;
  toolNamePrefix?: string;
  enableStreaming?: boolean;
}
