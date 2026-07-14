export const APP_NAME = 'Dese MCP Server Builder';
export const API_VERSION = 'v1';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const GENERATION_QUEUE = 'generation';
export const VALIDATION_QUEUE = 'validation';
export const DEPLOYMENT_QUEUE = 'deployment';
export const EXPORT_QUEUE = 'export';

export const SUPPORTED_INPUT_SOURCES = [
  'openapi',
  'graphql',
  'postgresql',
  'mysql',
  'sqlite',
  'mongodb',
  'rest',
  'stripe',
  'github',
  'typescript-sdk',
  'python-package',
  'existing-mcp',
] as const;

export const SUPPORTED_EXPORT_FORMATS = [
  'typescript',
  'docker',
  'zip',
  'github',
] as const;

export const SUPPORTED_DEPLOYMENT_TARGETS = [
  'docker',
  'docker-compose',
  'railway',
  'fly-io',
  'render',
  'aws',
  'azure',
  'gcp',
  'kubernetes',
] as const;

export const PROJECT_ROLES = ['owner', 'admin', 'developer', 'viewer'] as const;

export const MCP_SERVER_STATUSES = [
  'draft',
  'generating',
  'validating',
  'ready',
  'deploying',
  'deployed',
  'failed',
  'archived',
] as const;
