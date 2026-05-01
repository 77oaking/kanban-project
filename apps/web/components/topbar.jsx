'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { useWorkspace } from '@/store/workspace';
import { useNotifications } from '@/store/notifications';
import { ThemeToggle } from '@/components/theme-toggle';
import { BellIcon, SearchIcon, LogoutIcon } from '@/components/icons';
import { useUI } from '@/store/ui';
import { PresenceDots } from '@/components/presence-dots';

export function Topbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { current } = useWorkspace();
  const openPalette = useUI((s) => s.openPalette);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur sticky top-0 z-20">
      <div className="h-full px-4 md:px-6 flex items-center gap-3">
        <button
          onClick={openPalette}
          className="hidden sm:flex items-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 w-72"
        >
          <SearchIcon size={14} />
          <span className="flex-1 text-left">Search or jump to…</span>
          <kbd className="rounded border border-zinc-300 dark:border-zinc-700 px-1 text-[10px]">⌘K</kbd>
        </button>

        <div className="flex-1" />

        {current && <PresenceDots />}
        <NotificationBell />
        <ThemeToggle />

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="h-8 w-8 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 grid place-items-center bg-zinc-100 dark:bg-zinc-800 text-xs font-medium"
            aria-label="User menu"
          >
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              user?.name?.slice(0, 2).toUpperCase()
            )}
          </button>
          {menuOpen && (
            <div
              onMouseLeave={() => setMenuOpen(false)}
              className="absolute right-0 mt-1 w-56 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg p-1 animate-fade-in"
            >
              <div className="px-2 py-2 border-b border-zinc-100 dark:border-zinc-800">
                <div className="text-sm font-medium truncate">{user?.name}</div>
                <div className="text-xs text-zinc-500 truncate">{user?.email}</div>
              </div>
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="block px-2 py-1.5 rounded text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Profile
              </Link>
              <button
                onClick={async () => {
                  await logout();
                  router.push('/login');
                }}
                className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 text-red-600 dark:text-red-400"
              >
                <LogoutIcon size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NotificationBell() {
  const { items, markAllRead, markRead } = useNotifications();
  const unread = items.filter((n) => !n.read).length;
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
        aria-label="Notifications"
      >
        <BellIcon size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-fredo-700 text-white text-[10px] grid place-items-center px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          onMouseLeave={() => setOpen(false)}
          className="absolute right-0 mt-1 w-80 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg animate-fade-in"
        >
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-sm font-medium">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-fredo-700 dark:text-fredo-400 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-auto">
            {items.length === 0 ? (
              <div className="p-4 text-sm text-zinc-500 text-center">You're all caught up.</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className="w-full text-left p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-fredo-700 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{n.title}</div>
                      {n.body && <div className="text-xs text-zinc-500 truncate mt-0.5">{n.body}</div>}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
