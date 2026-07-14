import type { GENERATION_QUEUE, VALIDATION_QUEUE, DEPLOYMENT_QUEUE, EXPORT_QUEUE } from '../constants.js';

export type QueueName =
  | typeof GENERATION_QUEUE
  | typeof VALIDATION_QUEUE
  | typeof DEPLOYMENT_QUEUE
  | typeof EXPORT_QUEUE;

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: Record<string, unknown>;
}

export interface HealthCheck {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  timestamp: string;
  services: Record<string, { status: 'up' | 'down'; latencyMs?: number }>;
}
