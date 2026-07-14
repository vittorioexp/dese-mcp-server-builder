'use client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

export default function SettingsPage() {
  const [orgId, setOrgId] = useState('');
  const [token, setToken] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setOrgId(localStorage.getItem('dese-mcp:orgId') ?? '');
    setToken(localStorage.getItem('dese-mcp:token') ?? '');
  }, []);

  const handleSave = () => {
    localStorage.setItem('dese-mcp:orgId', orgId);
    localStorage.setItem('dese-mcp:token', token);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-6">Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle>API Connection</CardTitle>
            <CardDescription>
              Configure your organization ID and session token to connect to the Dese MCP Server Builder API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgId">Organization ID</Label>
              <Input
                id="orgId"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="org_..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">Session Token</Label>
              <Input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Bearer token from authentication"
              />
            </div>
            <Button onClick={handleSave}>{saved ? 'Saved!' : 'Save Configuration'}</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
