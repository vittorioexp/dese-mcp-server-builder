'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Plus, FolderKanban } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { McpProject, PaginatedResponse } from '@dese-mcp/shared';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<McpProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const orgId = localStorage.getItem('dese-mcp:orgId');
      const token = localStorage.getItem('dese-mcp:token');

      if (!orgId || !token) {
        setError('Configure organization and API token in Settings');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}/organizations/${orgId}/projects`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Organization-Id': orgId,
            },
          },
        );

        if (!res.ok) throw new Error('Failed to load projects');
        const data: PaginatedResponse<McpProject> = await res.json();
        setProjects(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <DashboardShell>
      <div className="flex flex-col gap-6 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-1">Manage your MCP server projects</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/projects/new">
              <Plus className="h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>

        {loading && <p className="text-muted-foreground">Loading projects...</p>}
        {error && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" asChild>
                <Link href="/dashboard/settings">Go to Settings</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && projects.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center py-16">
              <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">No projects yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Create your first MCP server project to get started.
              </p>
              <Button asChild>
                <Link href="/dashboard/projects/new">Create Project</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
              <Card className="transition-colors hover:bg-accent/30">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <h3 className="font-medium">{project.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {project.inputSource} · Updated {formatRelativeTime(project.updatedAt)}
                    </p>
                  </div>
                  <StatusBadge status={project.status} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
