import type { MCP_SERVER_STATUSES, SUPPORTED_INPUT_SOURCES } from '../constants.js';

export type InputSourceType = (typeof SUPPORTED_INPUT_SOURCES)[number];
export type McpServerStatus = (typeof MCP_SERVER_STATUSES)[number];

export interface McpProject {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string | null;
  inputSource: InputSourceType;
  inputConfig: Record<string, unknown>;
  status: McpServerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface McpProjectVersion {
  id: string;
  projectId: string;
  version: string;
  changelog?: string | null;
  artifactPath?: string | null;
  isValidated: boolean;
  createdAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  inputSource: InputSourceType;
  inputConfig: Record<string, unknown>;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  inputConfig?: Record<string, unknown>;
}
