import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, FolderKanban, CheckCircle2, Rocket, Activity } from 'lucide-react';

const stats = [
  { label: 'Total Projects', value: '—', icon: FolderKanban, href: '/dashboard/projects' },
  { label: 'Ready Servers', value: '—', icon: CheckCircle2, href: '/dashboard/projects' },
  { label: 'Deployments', value: '—', icon: Rocket, href: '/dashboard/deployments' },
  { label: 'Active Jobs', value: '—', icon: Activity, href: '/dashboard/logs' },
];

export default function DashboardPage() {
  return (
    <DashboardShell>
      <div className="flex flex-col gap-8 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Generate, validate, and deploy MCP servers from your APIs and data sources.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/projects/new">
              <Plus className="h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href}>
              <Card className="transition-colors hover:bg-accent/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Start</CardTitle>
              <CardDescription>Create your first MCP server in minutes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    1
                  </span>
                  <span>Create a project from OpenAPI, GraphQL, SQL schema, or existing SDK</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    2
                  </span>
                  <span>Generate tools, resources, and prompts automatically</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    3
                  </span>
                  <span>Validate MCP compliance and export as TypeScript, Docker, or ZIP</span>
                </li>
              </ol>
              <Button asChild className="w-full">
                <Link href="/dashboard/projects/new">Get Started</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supported Input Sources</CardTitle>
              <CardDescription>Connect to your existing infrastructure</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[
                  'OpenAPI',
                  'GraphQL',
                  'PostgreSQL',
                  'MySQL',
                  'SQLite',
                  'MongoDB',
                  'REST API',
                  'Stripe',
                  'GitHub',
                  'TypeScript SDK',
                  'Python Package',
                  'Existing MCP',
                ].map((source) => (
                  <span
                    key={source}
                    className="rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {source}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
