export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  code: string;
  message: string;
  severity: ValidationSeverity;
  path?: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  validatedAt: string;
  durationMs: number;
}

export interface ValidationJobPayload {
  projectId: string;
  versionId: string;
  artifactPath: string;
}

export type ValidationCategory =
  | 'mcp-compliance'
  | 'schema'
  | 'types'
  | 'authentication'
  | 'prompts'
  | 'resources'
  | 'security';
