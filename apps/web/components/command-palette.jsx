'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { useTheme } from 'next-themes';
import { useUI } from '@/store/ui';
import { useWorkspace } from '@/store/workspace';
import { useAuth } from '@/store/auth';
import {
  HomeIcon, TargetIcon, MegaphoneIcon, KanbanIcon, UsersIcon, SettingsIcon,
  PaletteIcon, LogoutIcon, PlusIcon,
} from '@/components/icons';

export function CommandPalette() {
  const router = useRouter();
  const { paletteOpen, openPalette, closePalette } = useUI();
  const { workspaces, currentId, select } = useWorkspace();
  const { logout } = useAuth();
  const { setTheme } = useTheme();

  // Global ⌘K / Ctrl+K to toggle the palette
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (paletteOpen) closePalette();
        else openPalette();
      } else if (e.key === 'Escape' && paletteOpen) {
        closePalette();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen, openPalette, closePalette]);

  const navItems = useMemo(
    () => [
      { id: 'dashboard', label: 'Go to Dashboard', icon: HomeIcon, run: () => router.push('/dashboard') },
      { id: 'goals', label: 'Go to Goals', icon: TargetIcon, run: () => router.push('/goals') },
      { id: 'announcements', label: 'Go to Announcements', icon: MegaphoneIcon, run: () => router.push('/announcements') },
      { id: 'action-items', label: 'Go to Action Items', icon: KanbanIcon, run: () => router.push('/action-items') },
      { id: 'members', label: 'Go to Members', icon: UsersIcon, run: () => router.push('/members') },
      { id: 'settings', label: 'Go to Settings', icon: SettingsIcon, run: () => router.push('/settings') },
      { id: 'profile', label: 'Edit your profile', icon: UsersIcon, run: () => router.push('/profile') },
    ],
    [router],
  );

  if (!paletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-start pt-[10vh] p-4 bg-black/40 animate-fade-in" onClick={closePalette}>
      <div
        className="w-full max-w-xl rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="w-full" label="Command palette">
          <Command.Input
            placeholder="Type a command or search…"
            className="w-full px-4 py-3 bg-transparent border-b border-zinc-100 dark:border-zinc-800 outline-none text-sm"
          />
          <Command.List className="max-h-96 overflow-auto p-2">
            <Command.Empty className="px-3 py-6 text-sm text-zinc-500 text-center">No results.</Command.Empty>

            <Command.Group heading="Navigate">
              {navItems.map((n) => {
                const Icon = n.icon;
                return (
                  <PaletteItem
                    key={n.id}
                    onSelect={() => {
                      n.run();
                      closePalette();
                    }}
                  >
                    <Icon size={14} /> {n.label}
                  </PaletteItem>
                );
              })}
            </Command.Group>

            <Command.Group heading="Workspaces">
              {workspaces.map((w) => (
                <PaletteItem
                  key={w.id}
                  onSelect={() => {
                    select(w.id);
                    closePalette();
                  }}
                >
                  <span className="h-4 w-4 rounded grid place-items-center text-[9px] text-white" style={{ background: w.accentColor }}>
                    {w.name.slice(0, 1).toUpperCase()}
                  </span>
                  Switch to {w.name}{w.id === currentId && ' (current)'}
                </PaletteItem>
              ))}
            </Command.Group>

            <Command.Group heading="Theme">
              <PaletteItem onSelect={() => { setTheme('light'); closePalette(); }}>
                <PaletteIcon size={14} /> Switch to light theme
              </PaletteItem>
              <PaletteItem onSelect={() => { setTheme('dark'); closePalette(); }}>
                <PaletteIcon size={14} /> Switch to dark theme
              </PaletteItem>
              <PaletteItem onSelect={() => { setTheme('system'); closePalette(); }}>
                <PaletteIcon size={14} /> Match system theme
              </PaletteItem>
            </Command.Group>

            <Command.Group heading="Account">
              <PaletteItem
                onSelect={async () => {
                  await logout();
                  closePalette();
                  router.push('/login');
                }}
              >
                <LogoutIcon size={14} /> Sign out
              </PaletteItem>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function PaletteItem({ children, onSelect }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-2 px-3 py-2 text-sm rounded cursor-pointer aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800"
    >
      {children}
    </Command.Item>
  );
}
