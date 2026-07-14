import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DeploymentsPage() {
  return (
    <DashboardShell>
      <div className="p-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-6">Deployments</h1>
        <Card>
          <CardHeader>
            <CardTitle>Deployment History</CardTitle>
            <CardDescription>
              Deploy validated MCP servers to Docker, Railway, Fly.io, AWS, and more.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Deployments will appear here after you validate and deploy a project version.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
