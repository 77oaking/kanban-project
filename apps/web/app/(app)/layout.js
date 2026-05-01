'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { useWorkspace } from '@/store/workspace';
import { useNotifications } from '@/store/notifications';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { CommandPalette } from '@/components/command-palette';
import { useSocketSync } from '@/components/socket-sync';

export default function AppLayout({ children }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { loadAll, currentId, workspaces } = useWorkspace();
  const loadNotifications = useNotifications((s) => s.load);

  // Route guard
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  // First-time data load — workspaces + notifications
  useEffect(() => {
    if (user) {
      loadAll();
      loadNotifications();
    }
  }, [user, loadAll, loadNotifications]);

  // Wires socket: connect on mount, join the current workspace room when it
  // changes, listen for events that update Zustand stores.
  useSocketSync();

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-zinc-500">Loading…</div>
    );
  }

  // First-run case — user has no workspaces yet. The dashboard handles the
  // empty state inline; we still render the shell so the create modal works.
  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 min-w-0 overflow-auto">
          <div className="mx-auto max-w-7xl p-6">{children}</div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
