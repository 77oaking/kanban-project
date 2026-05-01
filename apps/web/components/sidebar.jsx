'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useWorkspace } from '@/store/workspace';
import {
  HomeIcon, TargetIcon, MegaphoneIcon, KanbanIcon, UsersIcon, SettingsIcon,
  ChevronDownIcon, PlusIcon,
} from '@/components/icons';
import { cn } from '@/lib/cn';
import { CreateWorkspaceModal } from '@/components/create-workspace-modal';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon, exact: true },
  { href: '/goals', label: 'Goals', icon: TargetIcon },
  { href: '/announcements', label: 'Announcements', icon: MegaphoneIcon },
  { href: '/action-items', label: 'Action Items', icon: KanbanIcon },
  { href: '/members', label: 'Members', icon: UsersIcon },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { workspaces, currentId, current, select } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  return (
    <aside className="hidden md:flex w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-col">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold mb-3">
          <div className="h-7 w-7 rounded-md bg-fredo-800 text-white grid place-items-center text-xs font-bold">FC</div>
          <span>Team Hub</span>
        </Link>

        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <div
              className="h-6 w-6 rounded grid place-items-center text-[10px] font-bold text-white shrink-0"
              style={{ background: current?.accentColor || '#7A1F2B' }}
            >
              {(current?.name || 'W').slice(0, 1).toUpperCase()}
            </div>
            <span className="flex-1 truncate text-sm text-left">
              {current?.name || 'Select workspace'}
            </span>
            <ChevronDownIcon size={14} />
          </button>
          {open && (
            <div
              className="absolute z-30 left-0 right-0 mt-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg p-1 animate-fade-in"
              onMouseLeave={() => setOpen(false)}
            >
              <div className="max-h-60 overflow-auto">
                {workspaces.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      select(w.id);
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800',
                      w.id === currentId && 'bg-zinc-100 dark:bg-zinc-800',
                    )}
                  >
                    <div
                      className="h-5 w-5 rounded grid place-items-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: w.accentColor || '#7A1F2B' }}
                    >
                      {w.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="truncate flex-1">{w.name}</span>
                    {w.role === 'ADMIN' && <span className="badge bg-fredo-50 text-fredo-800 dark:bg-fredo-950/50 dark:text-fredo-300">Admin</span>}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  setCreating(true);
                }}
                className="w-full mt-1 flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 text-fredo-700 dark:text-fredo-400"
              >
                <PlusIcon size={14} /> New workspace
              </button>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-2">
        {NAV.map((n) => {
          const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
                active
                  ? 'bg-fredo-50 text-fredo-800 dark:bg-fredo-950/40 dark:text-fredo-300'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800',
              )}
            >
              <Icon size={16} /> {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
        <kbd className="rounded border border-zinc-300 dark:border-zinc-700 px-1.5 py-0.5">⌘K</kbd>{' '}
        for command palette
      </div>

      {creating && <CreateWorkspaceModal onClose={() => setCreating(false)} />}
    </aside>
  );
}
