'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '@/store/workspace';
import { useGoals } from '@/store/goals';
import { GoalCard } from '@/components/goal-card';
import { CreateGoalModal } from '@/components/create-goal-modal';
import { PlusIcon, TargetIcon } from '@/components/icons';

const STATUS_COLUMNS = ['NOT_STARTED', 'IN_PROGRESS', 'AT_RISK', 'COMPLETED'];

export default function GoalsPage() {
  const { currentId, permissions, members } = useWorkspace();
  const { load, list } = useGoals();
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    if (currentId) load(currentId);
  }, [currentId, load]);

  const goals = list(currentId);
  const filtered = filter === 'ALL' ? goals : goals.filter((g) => g.status === filter);

  return (
    <div>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
          <p className="text-sm text-zinc-500 mt-1">Track team outcomes with milestones and an activity feed.</p>
        </div>
        {permissions?.canCreateGoal && (
          <button onClick={() => setCreating(true)} className="btn-primary">
            <PlusIcon size={14} /> New goal
          </button>
        )}
      </div>

      <div className="mt-5 flex gap-1 flex-wrap">
        {['ALL', ...STATUS_COLUMNS].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs ${
              filter === s
                ? 'bg-fredo-800 text-white'
                : 'border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {s === 'ALL' ? 'All' : s.replaceAll('_', ' ')}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <TargetIcon size={32} />
          <p className="mt-2 text-zinc-500">No goals yet.</p>
          {permissions?.canCreateGoal && (
            <button onClick={() => setCreating(true)} className="btn-primary mt-3">Create the first one</button>
          )}
        </div>
      ) : (
        <div className="mt-5 grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      )}

      {creating && (
        <CreateGoalModal members={members} onClose={() => setCreating(false)} />
      )}
    </div>
  );
}
