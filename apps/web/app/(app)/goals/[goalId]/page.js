'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useWorkspace } from '@/store/workspace';
import { useGoals } from '@/store/goals';
import { CollaborativeDescription } from '@/components/collaborative-description';
import { formatDate, relativeTime } from '@/lib/format';
import { TrashIcon, PlusIcon, CheckIcon } from '@/components/icons';

export default function GoalDetailPage() {
  const router = useRouter();
  const { goalId } = useParams();
  const { currentId, permissions, members } = useWorkspace();
  const updateGoal = useGoals((s) => s.update);
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);

  async function reload() {
    if (!currentId || !goalId) return;
    try {
      const { goal } = await api.get(`/api/workspaces/${currentId}/goals/${goalId}`);
      setGoal(goal);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, goalId]);

  if (loading) return <div className="text-sm text-zinc-500">Loading goal…</div>;
  if (!goal) return <div className="text-sm text-zinc-500">Goal not found.</div>;

  async function saveDescription(html) {
    await updateGoal(currentId, goalId, { description: html });
    setGoal((g) => ({ ...g, description: html }));
  }

  async function addMilestone(title) {
    const { milestone } = await api.post(
      `/api/workspaces/${currentId}/goals/${goalId}/milestones`,
      { title },
    );
    setGoal((g) => ({ ...g, milestones: [...g.milestones, milestone] }));
  }

  async function patchMilestone(id, patch) {
    const { milestone } = await api.patch(
      `/api/workspaces/${currentId}/goals/${goalId}/milestones/${id}`,
      patch,
    );
    setGoal((g) => ({
      ...g,
      milestones: g.milestones.map((m) => (m.id === id ? { ...m, ...milestone } : m)),
    }));
  }

  async function removeMilestone(id) {
    await api.del(`/api/workspaces/${currentId}/goals/${goalId}/milestones/${id}`);
    setGoal((g) => ({ ...g, milestones: g.milestones.filter((m) => m.id !== id) }));
  }

  async function postUpdate(body) {
    const { update } = await api.post(`/api/workspaces/${currentId}/goals/${goalId}/updates`, {
      body,
    });
    setGoal((g) => ({ ...g, updates: [update, ...g.updates] }));
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="card p-5">
          <button onClick={() => router.back()} className="text-xs text-zinc-500 hover:underline">← Back</button>
          <div className="flex items-start justify-between mt-2 gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{goal.title}</h1>
            {permissions?.canDeleteGoal && (
              <button
                onClick={async () => {
                  if (!confirm('Delete this goal?')) return;
                  await api.del(`/api/workspaces/${currentId}/goals/${goalId}`);
                  router.push('/goals');
                }}
                className="text-zinc-400 hover:text-red-600"
              >
                <TrashIcon size={16} />
              </button>
            )}
          </div>

          <div className="mt-2 flex items-center gap-3 text-sm text-zinc-500">
            <span>Owner: {goal.owner?.name}</span>
            {goal.dueDate && <span>· Due {formatDate(goal.dueDate)}</span>}
            <span>· {goal.status.replaceAll('_', ' ')}</span>
          </div>

          {permissions?.canEditGoal && (
            <div className="mt-3 flex gap-1.5">
              {['NOT_STARTED', 'IN_PROGRESS', 'AT_RISK', 'COMPLETED'].map((s) => (
                <button
                  key={s}
                  onClick={async () => {
                    await updateGoal(currentId, goalId, { status: s });
                    setGoal((g) => ({ ...g, status: s }));
                  }}
                  className={`text-xs px-2 py-1 rounded border ${
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

          <OverallProgress milestones={goal.milestones || []} />

          <div className="mt-5">
            <h2 className="font-semibold text-sm">Description</h2>
            <p className="text-xs text-zinc-500 mb-2">
              Edits sync live to other members viewing this goal.
            </p>
            <CollaborativeDescription
              goalId={goalId}
              initial={goal.description || ''}
              onSave={saveDescription}
              readOnly={!permissions?.canEditGoal}
            />
          </div>
        </div>

        <ActivityFeed updates={goal.updates || []} onPost={postUpdate} />
      </div>

      <div className="space-y-6">
        <Milestones
          milestones={goal.milestones}
          onAdd={addMilestone}
          onPatch={patchMilestone}
          onRemove={removeMilestone}
          canEdit={permissions?.canEditGoal}
        />
        <RelatedActionItems items={goal.actionItems || []} />
      </div>
    </div>
  );
}

/**
 * Aggregate progress strip — sits below the status chips on the goal detail
 * page. Mirrors the math used in GoalCard: average of every milestone's
 * progress %, plus a count of completed/total. Renders nothing when the goal
 * has no milestones (a 0% bar would be misleading).
 */
function OverallProgress({ milestones }) {
  const total = milestones.length;
  if (total === 0) return null;
  const completed = milestones.filter((m) => m.completed).length;
  const avg = Math.round(milestones.reduce((s, m) => s + (m.progress || 0), 0) / total);

  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-600 dark:text-zinc-400">
          Overall progress · <span className="text-zinc-500">{completed}/{total} milestones complete</span>
        </span>
        <span className="font-semibold tabular-nums">{avg}%</span>
      </div>
      <div className="h-2 mt-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-fredo-700 dark:bg-fredo-500 transition-[width] duration-300 ease-out"
          style={{ width: `${avg}%` }}
        />
      </div>
    </div>
  );
}

function Milestones({ milestones, onAdd, onPatch, onRemove, canEdit }) {
  const [title, setTitle] = useState('');
  return (
    <div className="card p-4">
      <h2 className="font-semibold text-sm">Milestones</h2>
      <ul className="mt-3 space-y-2">
        {milestones.map((m) => (
          <li key={m.id} className="border border-zinc-200 dark:border-zinc-800 rounded-md p-2">
            <div className="flex items-center gap-2">
              <button
                disabled={!canEdit}
                onClick={() => onPatch(m.id, { completed: !m.completed, progress: !m.completed ? 100 : m.progress })}
                className={`h-5 w-5 rounded border grid place-items-center ${
                  m.completed
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-zinc-300 dark:border-zinc-700'
                } ${!canEdit && 'opacity-50 cursor-not-allowed'}`}
              >
                {m.completed && <CheckIcon size={12} />}
              </button>
              <span className={`text-sm flex-1 ${m.completed ? 'line-through text-zinc-400' : ''}`}>{m.title}</span>
              {canEdit && (
                <button onClick={() => onRemove(m.id)} className="text-zinc-300 hover:text-red-500">
                  <TrashIcon size={12} />
                </button>
              )}
            </div>
            {!m.completed && canEdit && (
              <input
                type="range"
                min={0}
                max={100}
                value={m.progress}
                onChange={(e) => onPatch(m.id, { progress: Number(e.target.value) })}
                className="w-full mt-1"
              />
            )}
            <div className="text-xs text-zinc-500 text-right">{m.progress}%</div>
          </li>
        ))}
      </ul>
      {canEdit && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) {
              onAdd(title.trim());
              setTitle('');
            }
          }}
          className="mt-3 flex gap-2"
        >
          <input
            className="input"
            placeholder="Add milestone…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button type="submit" className="btn-outline shrink-0">
            <PlusIcon size={14} />
          </button>
        </form>
      )}
    </div>
  );
}

function RelatedActionItems({ items }) {
  if (items.length === 0) return null;
  return (
    <div className="card p-4">
      <h2 className="font-semibold text-sm">Linked action items</h2>
      <ul className="mt-3 space-y-1.5 text-sm">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-2">
            <span className="truncate">{i.title}</span>
            <span className="badge bg-zinc-100 dark:bg-zinc-800">{i.status.replaceAll('_', ' ')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActivityFeed({ updates, onPost }) {
  const [body, setBody] = useState('');
  return (
    <div className="card p-5">
      <h2 className="font-semibold text-sm">Activity</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) {
            onPost(body.trim());
            setBody('');
          }
        }}
        className="mt-3 flex gap-2"
      >
        <textarea
          className="input"
          rows={2}
          placeholder="Post a progress update…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit" className="btn-primary shrink-0">Post</button>
      </form>
      <ul className="mt-4 space-y-3">
        {updates.length === 0 && <li className="text-sm text-zinc-500">No updates yet.</li>}
        {updates.map((u) => (
          <li key={u.id} className="flex gap-3">
            <div className="h-8 w-8 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 grid place-items-center text-xs font-medium shrink-0">
              {u.author?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.author.avatarUrl} alt={u.author.name} className="h-full w-full object-cover" />
              ) : (
                u.author?.name?.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{u.author?.name}</span>
                <span className="text-xs text-zinc-500">{relativeTime(u.createdAt)}</span>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{u.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
