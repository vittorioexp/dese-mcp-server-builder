import type { SUPPORTED_DEPLOYMENT_TARGETS, SUPPORTED_EXPORT_FORMATS } from '../constants.js';

export type DeploymentTarget = (typeof SUPPORTED_DEPLOYMENT_TARGETS)[number];
export type ExportFormat = (typeof SUPPORTED_EXPORT_FORMATS)[number];

export interface DeploymentConfig {
  target: DeploymentTarget;
  config: Record<string, unknown>;
}

export interface Deployment {
  id: string;
  projectId: string;
  versionId: string;
  target: DeploymentTarget;
  status: 'pending' | 'running' | 'success' | 'failed' | 'rolled-back';
  url?: string | null;
  logs?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExportRequest {
  projectId: string;
  versionId: string;
  format: ExportFormat;
  options?: Record<string, unknown>;
}

export interface ExportResult {
  downloadUrl: string;
  format: ExportFormat;
  sizeBytes: number;
  expiresAt: string;
}
