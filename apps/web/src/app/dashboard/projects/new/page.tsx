'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProjectSchema, SUPPORTED_INPUT_SOURCES } from '@dese-mcp/shared';
import type { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

type FormData = z.infer<typeof createProjectSchema>;

const inputSourceLabels: Record<string, string> = {
  openapi: 'OpenAPI Specification',
  graphql: 'GraphQL Endpoint',
  postgresql: 'PostgreSQL Database',
  mysql: 'MySQL Database',
  sqlite: 'SQLite Database',
  mongodb: 'MongoDB',
  rest: 'REST API',
  stripe: 'Stripe Account',
  github: 'GitHub Repository',
  'typescript-sdk': 'TypeScript SDK',
  'python-package': 'Python Package',
  'existing-mcp': 'Existing MCP Server',
};

export default function NewProjectPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [specContent, setSpecContent] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      description: '',
      inputSource: 'openapi',
      inputConfig: {},
    },
  });

  const inputSource = watch('inputSource');

  const onSubmit = async (data: FormData) => {
    setError(null);

    const inputConfig: Record<string, unknown> = {};

    if (data.inputSource === 'openapi') {
      if (!specContent.trim()) {
        setError('OpenAPI specification content is required');
        return;
      }
      inputConfig.specContent = specContent;
      if (baseUrl) inputConfig.baseUrl = baseUrl;
      inputConfig.authType = 'none';
    }

    try {
      const orgId = localStorage.getItem('dese-mcp:orgId');
      const token = localStorage.getItem('dese-mcp:token');

      if (!orgId || !token) {
        setError('Please configure your organization and API token in Settings');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}/organizations/${orgId}/projects`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Organization-Id': orgId,
          },
          body: JSON.stringify({ ...data, inputConfig }),
        },
      );

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message ?? 'Failed to create project');
      }

      const project = await response.json();
      router.push(`/dashboard/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-2xl p-8">
        <Link
          href="/dashboard/projects"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Create MCP Project</CardTitle>
            <CardDescription>
              Define your input source and Dese MCP Server Builder will generate a complete MCP server.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input id="name" placeholder="My API Server" {...register('name')} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional description"
                  {...register('description')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inputSource">Input Source</Label>
                <select
                  id="inputSource"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  {...register('inputSource')}
                >
                  {SUPPORTED_INPUT_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {inputSourceLabels[source] ?? source}
                    </option>
                  ))}
                </select>
              </div>

              {inputSource === 'openapi' && (
                <div className="space-y-4 rounded-md border p-4">
                  <div className="space-y-2">
                    <Label htmlFor="baseUrl">Base URL</Label>
                    <Input
                      id="baseUrl"
                      placeholder="https://api.example.com"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specContent">OpenAPI Specification (JSON)</Label>
                    <Textarea
                      id="specContent"
                      placeholder='{"openapi": "3.0.0", ...}'
                      className="min-h-[200px] font-mono text-xs"
                      value={specContent}
                      onChange={(e) => setSpecContent(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {inputSource !== 'openapi' && (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Configuration for {inputSourceLabels[inputSource]} will be available in the project
                  settings after creation. OpenAPI is fully supported in this release.
                </div>
              )}

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
              )}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard/projects">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
