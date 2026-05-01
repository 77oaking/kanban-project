'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useWorkspace } from '@/store/workspace';
import { useGoals } from '@/store/goals';
import { useActionItems, STATUSES } from '@/store/actionItems';
import { Modal } from '@/components/modal';
import { KanbanBoard } from '@/components/kanban-board';
import { PriorityBadge } from '@/components/priority-badge';
import { ListIcon, KanbanIcon, PlusIcon, TrashIcon } from '@/components/icons';
import { formatDate, isOverdue } from '@/lib/format';

export default function ActionItemsPage() {
  const { currentId, members, permissions } = useWorkspace();
  const { load: loadGoals, list: listGoals } = useGoals();
  const { load, list, create, update, remove, reorder } = useActionItems();
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState('board');

  useEffect(() => {
    if (currentId) {
      load(currentId);
      loadGoals(currentId);
    }
  }, [currentId, load, loadGoals]);

  const items = list(currentId);
  const goals = listGoals(currentId);

  return (
    <div>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Action items</h1>
          <p className="text-sm text-zinc-500 mt-1">Drag across columns to update status. Updates broadcast in real time.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-zinc-200 dark:border-zinc-800 p-0.5">
            <button
              onClick={() => setView('board')}
              className={`px-3 py-1.5 text-xs rounded inline-flex items-center gap-1 ${view === 'board' ? 'bg-zinc-100 dark:bg-zinc-800' : ''}`}
            >
              <KanbanIcon size={12} /> Board
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-xs rounded inline-flex items-center gap-1 ${view === 'list' ? 'bg-zinc-100 dark:bg-zinc-800' : ''}`}
            >
              <ListIcon size={12} /> List
            </button>
          </div>
          {permissions?.canCreateActionItem && (
            <button onClick={() => setCreating(true)} className="btn-primary">
              <PlusIcon size={14} /> New item
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        {view === 'board' ? (
          <KanbanBoard items={items} onUpdate={(id, patch) => update(currentId, id, patch)} onReorder={(moves) => reorder(currentId, moves)} />
        ) : (
          <ListView items={items} onUpdate={(id, patch) => update(currentId, id, patch)} onDelete={(id) => remove(currentId, id)} />
        )}
      </div>

      {creating && (
        <CreateActionItemModal
          onClose={() => setCreating(false)}
          onSubmit={async (payload) => {
            try {
              await create(currentId, payload);
              toast.success('Action item created');
              setCreating(false);
            } catch (err) {
              toast.error(err.message);
            }
          }}
          members={members}
          goals={goals}
        />
      )}
    </div>
  );
}

function ListView({ items, onUpdate, onDelete }) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-xs uppercase text-zinc-500">
          <tr>
            <th className="text-left p-3">Title</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">Assignee</th>
            <th className="text-left p-3">Goal</th>
            <th className="text-left p-3">Priority</th>
            <th className="text-left p-3">Due</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
              <td className="p-3 max-w-xs truncate">{i.title}</td>
              <td className="p-3">
                <select
                  className="input py-1 text-xs"
                  value={i.status}
                  onChange={(e) => onUpdate(i.id, { status: e.target.value })}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}
                </select>
              </td>
              <td className="p-3">{i.assignee?.name || '—'}</td>
              <td className="p-3 max-w-[160px] truncate">{i.goal?.title || '—'}</td>
              <td className="p-3"><PriorityBadge p={i.priority} /></td>
              <td className={`p-3 ${i.dueDate && isOverdue(i.dueDate) && i.status !== 'DONE' ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                {i.dueDate ? formatDate(i.dueDate) : '—'}
              </td>
              <td className="p-3 text-right">
                <button onClick={() => onDelete(i.id)} className="text-zinc-400 hover:text-red-600">
                  <TrashIcon size={14} />
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={7} className="p-10 text-center text-zinc-500">No action items.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function CreateActionItemModal({ onClose, onSubmit, members, goals }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    goalId: '',
    assigneeId: '',
    priority: 'MEDIUM',
    status: 'TODO',
    dueDate: '',
  });
  const [submitting, setSubmitting] = useState(false);

  return (
    <Modal title="New action item" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          await onSubmit({
            ...form,
            goalId: form.goalId || null,
            assigneeId: form.assigneeId || null,
            description: form.description || null,
            dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
          });
          setSubmitting(false);
        }}
        className="space-y-4"
      >
        <div>
          <label className="label">Title</label>
          <input className="input" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Assignee</label>
            <select className="input" value={form.assigneeId} onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}>
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.userId} value={m.userId}>{m.user.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Linked goal</label>
            <select className="input" value={form.goalId} onChange={(e) => setForm((f) => ({ ...f, goalId: e.target.value }))}>
              <option value="">None</option>
              {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Due date</label>
            <input type="date" className="input" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
