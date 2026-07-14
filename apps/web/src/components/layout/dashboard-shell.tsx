'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { CommandPalette } from './command-palette';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onSearchOpen={() => setSearchOpen(true)} />
      <main className="flex-1 overflow-y-auto">
        <div className="animate-fade-in">{children}</div>
      </main>
      <CommandPalette />
    </div>
  );
}
