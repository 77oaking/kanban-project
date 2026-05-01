'use client';

import { useWorkspace } from '@/store/workspace';

export function PresenceDots() {
  const { presence, members, current } = useWorkspace();
  if (!current) return null;

  const online = members.filter((m) => presence.includes(m.userId)).slice(0, 5);
  if (online.length === 0) {
    return (
      <span className="text-xs text-zinc-500 hidden md:inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-zinc-300" />
        No one else online
      </span>
    );
  }

  return (
    <div className="hidden md:flex items-center gap-2">
      <div className="flex -space-x-2">
        {online.map((m) => (
          <div
            key={m.id}
            className="relative h-7 w-7 rounded-full border-2 border-white dark:border-zinc-900 overflow-hidden bg-zinc-200 dark:bg-zinc-700 grid place-items-center text-[10px] font-medium"
            title={`${m.user.name} — online`}
          >
            {m.user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.user.avatarUrl} alt={m.user.name} className="h-full w-full object-cover" />
            ) : (
              m.user.name.slice(0, 2).toUpperCase()
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900" />
          </div>
        ))}
      </div>
      <span className="text-xs text-zinc-500">{online.length} online</span>
    </div>
  );
}
