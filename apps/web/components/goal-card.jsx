'use client';

import Link from 'next/link';
import { useGoals } from '@/store/goals';
import { useWorkspace } from '@/store/workspace';
import { formatDate, isOverdue } from '@/lib/format';

const STATUS_BADGES = {
  NOT_STARTED: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  IN_PROGRESS: 'bg-fredo-50 text-fredo-800 dark:bg-fredo-950/40 dark:text-fredo-300',
  AT_RISK: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  COMPLETED: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
};

export function GoalCard({ goal }) {
  const { currentId, permissions } = useWorkspace();
  const update = useGoals((s) => s.update);

  const ms = goal.milestones || [];
  const total = ms.length;
  const completedCount = ms.filter((m) => m.completed).length;
  const avgProgress = total
    ? Math.round(ms.reduce((sum, m) => sum + (m.progress || 0), 0) / total)
    : 0;

  return (
    <Link href={`/goals/${goal.id}`} className="card p-4 hover:shadow-md transition-shadow block">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-snug line-clamp-2">{goal.title}</h3>
        <span className={`badge shrink-0 ${STATUS_BADGES[goal.status]}`}>
          {goal.status.replaceAll('_', ' ')}
        </span>
      </div>

      {goal.description && (
        <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
          {goal.description.replace(/<[^>]+>/g, '').slice(0, 140)}
        </p>
      )}

      <div className="mt-3">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>
            {completedCount}/{total} milestones
          </span>
          <span>{avgProgress}%</span>
        </div>
        <div className="h-1.5 mt-1 rounded bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded bg-fredo-700 dark:bg-fredo-500"
            style={{ width: `${avgProgress}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <div className="h-5 w-5 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 grid place-items-center text-[9px] font-medium">
            {goal.owner?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={goal.owner.avatarUrl} alt={goal.owner.name} className="h-full w-full object-cover" />
            ) : (
              goal.owner?.name?.slice(0, 2).toUpperCase()
            )}
          </div>
          <span className="truncate max-w-[120px]">{goal.owner?.name}</span>
        </div>
        {goal.dueDate && (
          <span
            className={`text-xs ${isOverdue(goal.dueDate) && goal.status !== 'COMPLETED' ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500'}`}
          >
            Due {formatDate(goal.dueDate)}
          </span>
        )}
      </div>

      {permissions?.canEditGoal && goal.status !== 'COMPLETED' && (
        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex gap-1.5">
          {(['IN_PROGRESS', 'AT_RISK', 'COMPLETED']).map((s) => (
            <button
              key={s}
              onClick={(e) => {
                e.preventDefault();
                update(currentId, goal.id, { status: s });
              }}
              className={`text-[10px] px-2 py-0.5 rounded border ${
                goal.status === s
                  ? 'border-fredo-700 text-fredo-700 dark:text-fredo-400'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              {s.replaceAll('_', ' ')}
            </button>
          ))}
        </div>
      )}
    </Link>
  );
}
