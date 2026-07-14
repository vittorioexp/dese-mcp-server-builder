'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { ArrowLeft, Play, ShieldCheck, Download, Loader2 } from 'lucide-react';
import type { McpProject, McpProjectVersion, ValidationResult } from '@dese-mcp/shared';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<McpProject | null>(null);
  const [versions, setVersions] = useState<McpProjectVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getAuth = () => ({
    orgId: localStorage.getItem('dese-mcp:orgId')!,
    token: localStorage.getItem('dese-mcp:token')!,
  });

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

  const loadProject = useCallback(async () => {
    const { orgId, token } = getAuth();
    if (!orgId || !token) {
      setError('Configure organization and API token in Settings');
      setLoading(false);
      return;
    }

    try {
      const [projectRes, versionsRes] = await Promise.all([
        fetch(`${apiBase}/organizations/${orgId}/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${token}`, 'X-Organization-Id': orgId },
        }),
        fetch(`${apiBase}/organizations/${orgId}/projects/${projectId}/versions`, {
          headers: { Authorization: `Bearer ${token}`, 'X-Organization-Id': orgId },
        }),
      ]);

      if (!projectRes.ok) throw new Error('Project not found');
      setProject(await projectRes.json());
      if (versionsRes.ok) setVersions(await versionsRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [projectId, apiBase]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleGenerate = async () => {
    const { orgId, token } = getAuth();
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(
        `${apiBase}/organizations/${orgId}/projects/${projectId}/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Organization-Id': orgId,
          },
          body: JSON.stringify({ options: { includeTests: true, includeDocker: true, includeDocs: true } }),
        },
      );

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message ?? 'Generation failed');
      }

      await loadProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleValidate = async (versionId: string) => {
    const { orgId, token } = getAuth();
    setValidating(true);
    setError(null);

    try {
      const res = await fetch(
        `${apiBase}/organizations/${orgId}/projects/${projectId}/versions/${versionId}/validate`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'X-Organization-Id': orgId },
        },
      );

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message ?? 'Validation failed');
      }

      const result: ValidationResult = await res.json();
      setValidation(result);
      await loadProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleExport = async (versionId: string) => {
    const { orgId, token } = getAuth();

    try {
      const res = await fetch(
        `${apiBase}/organizations/${orgId}/projects/${projectId}/versions/${versionId}/export`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Organization-Id': orgId,
          },
          body: JSON.stringify({ format: 'zip' }),
        },
      );

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message ?? 'Export failed');
      }

      const result = await res.json();
      window.open(result.downloadUrl, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardShell>
    );
  }

  if (!project) {
    return (
      <DashboardShell>
        <div className="p-8">
          <p className="text-destructive">{error ?? 'Project not found'}</p>
        </div>
      </DashboardShell>
    );
  }

  const latestVersion = versions[0];

  return (
    <DashboardShell>
      <div className="flex flex-col gap-6 p-8">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            {project.description && (
              <p className="text-muted-foreground mt-1">{project.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Source: {project.inputSource}
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={generating || project.status === 'generating'}>
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Generate
            </Button>
            {latestVersion && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleValidate(latestVersion.id)}
                  disabled={validating}
                >
                  {validating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  Validate
                </Button>
                {latestVersion.isValidated && (
                  <Button variant="outline" onClick={() => handleExport(latestVersion.id)}>
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {validation && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Validation {validation.valid ? 'Passed' : 'Failed'}
              </CardTitle>
              <CardDescription>
                {validation.issues.length} issue(s) found in {validation.durationMs}ms
              </CardDescription>
            </CardHeader>
            {validation.issues.length > 0 && (
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {validation.issues.map((issue, i) => (
                    <li
                      key={i}
                      className={`rounded-md border p-3 ${
                        issue.severity === 'error'
                          ? 'border-destructive/50 bg-destructive/5'
                          : 'border-border'
                      }`}
                    >
                      <span className="font-mono text-xs text-muted-foreground">{issue.code}</span>
                      <p className="mt-1">{issue.message}</p>
                      {issue.suggestion && (
                        <p className="mt-1 text-muted-foreground">{issue.suggestion}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Versions</CardTitle>
            <CardDescription>Generated server versions</CardDescription>
          </CardHeader>
          <CardContent>
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No versions yet. Click Generate to create your first version.
              </p>
            ) : (
              <ul className="divide-y">
                {versions.map((v) => (
                  <li key={v.id} className="flex items-center justify-between py-3">
                    <div>
                      <span className="font-medium">v{v.version}</span>
                      {v.changelog && (
                        <p className="text-sm text-muted-foreground">{v.changelog}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {v.isValidated ? (
                        <StatusBadge status="ready" />
                      ) : (
                        <StatusBadge status="draft" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
