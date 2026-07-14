const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
  organizationId?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, organizationId, headers: customHeaders, ...init } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (organizationId) headers['X-Organization-Id'] = organizationId;

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      body.message ?? `Request failed with status ${response.status}`,
      body.details,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  organizations: {
    list: (token: string) => request('/organizations', { token }),
    create: (token: string, name: string) =>
      request('/organizations', { method: 'POST', token, body: JSON.stringify({ name }) }),
  },

  projects: {
    list: (token: string, orgId: string, page = 1) =>
      request(`/organizations/${orgId}/projects?page=${page}`, { token, organizationId: orgId }),
    get: (token: string, orgId: string, projectId: string) =>
      request(`/organizations/${orgId}/projects/${projectId}`, { token, organizationId: orgId }),
    create: (token: string, orgId: string, data: Record<string, unknown>) =>
      request(`/organizations/${orgId}/projects`, {
        method: 'POST',
        token,
        organizationId: orgId,
        body: JSON.stringify(data),
      }),
    versions: (token: string, orgId: string, projectId: string) =>
      request(`/organizations/${orgId}/projects/${projectId}/versions`, {
        token,
        organizationId: orgId,
      }),
  },

  generation: {
    trigger: (token: string, orgId: string, projectId: string, options?: Record<string, unknown>) =>
      request(`/organizations/${orgId}/projects/${projectId}/generate`, {
        method: 'POST',
        token,
        organizationId: orgId,
        body: JSON.stringify({ options }),
      }),
    status: (token: string, orgId: string, projectId: string, jobId: string) =>
      request(`/organizations/${orgId}/projects/${projectId}/generate/jobs/${jobId}`, {
        token,
        organizationId: orgId,
      }),
  },

  validation: {
    run: (token: string, orgId: string, projectId: string, versionId: string) =>
      request(`/organizations/${orgId}/projects/${projectId}/versions/${versionId}/validate`, {
        method: 'POST',
        token,
        organizationId: orgId,
      }),
  },

  export: {
    create: (token: string, orgId: string, projectId: string, versionId: string, format: string) =>
      request(`/organizations/${orgId}/projects/${projectId}/versions/${versionId}/export`, {
        method: 'POST',
        token,
        organizationId: orgId,
        body: JSON.stringify({ format }),
      }),
  },
};
