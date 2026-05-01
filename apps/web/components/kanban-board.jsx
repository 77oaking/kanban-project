'use client';

import { useState } from 'react';
import { STATUSES } from '@/store/actionItems';
import { PriorityBadge } from '@/components/priority-badge';
import { formatDate, isOverdue } from '@/lib/format';

const COLUMN_TITLES = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  IN_REVIEW: 'In review',
  DONE: 'Done',
};

/**
 * Lightweight HTML5 drag-and-drop kanban. We don't pull in dnd-kit to keep
 * the bundle small — the assessment doesn't need keyboard a11y on dnd, just
 * working pointer-driven moves.
 */
export function KanbanBoard({ items, onUpdate, onReorder }) {
  const [draggingId, setDraggingId] = useState(null);
  const [hoverCol, setHoverCol] = useState(null);

  const grouped = STATUSES.reduce((acc, s) => {
    acc[s] = items
      .filter((i) => i.status === s)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    return acc;
  }, {});

  function onDrop(targetStatus) {
    if (!draggingId) return;
    const item = items.find((i) => i.id === draggingId);
    if (!item) return;

    if (item.status === targetStatus) {
      setDraggingId(null);
      setHoverCol(null);
      return;
    }

    // Append to end of the new column.
    const targetColumn = grouped[targetStatus];
    const lastPos = targetColumn.length ? targetColumn[targetColumn.length - 1].position ?? 0 : -1;
    const moves = [{ id: draggingId, status: targetStatus, position: lastPos + 1 }];
    onReorder(moves);
    setDraggingId(null);
    setHoverCol(null);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {STATUSES.map((s) => (
        <div
          key={s}
          onDragOver={(e) => {
            e.preventDefault();
            setHoverCol(s);
          }}
          onDragLeave={() => setHoverCol((c) => (c === s ? null : c))}
          onDrop={() => onDrop(s)}
          className={`rounded-lg border ${
            hoverCol === s
              ? 'border-fredo-400 bg-fredo-50/50 dark:border-fredo-700 dark:bg-fredo-950/20'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
          } p-3 min-h-[300px]`}
        >
          <header className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">{COLUMN_TITLES[s]}</h3>
            <span className="text-xs text-zinc-500">{grouped[s].length}</span>
          </header>
          <div className="space-y-2">
            {grouped[s].map((i) => (
              <div
                key={i.id}
                draggable
                onDragStart={() => setDraggingId(i.id)}
                onDragEnd={() => setDraggingId(null)}
                className={`rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-soft cursor-grab active:cursor-grabbing ${
                  draggingId === i.id ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug">{i.title}</p>
                  <PriorityBadge p={i.priority} />
                </div>
                {i.goal && (
                  <p className="mt-1 text-xs text-zinc-500 truncate">↳ {i.goal.title}</p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {i.assignee ? (
                      <div
                        className="h-5 w-5 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 grid place-items-center text-[9px] font-medium"
                        title={i.assignee.name}
                      >
                        {i.assignee.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={i.assignee.avatarUrl} alt={i.assignee.name} className="h-full w-full object-cover" />
                        ) : (
                          i.assignee.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-400">Unassigned</span>
                    )}
                  </div>
                  {i.dueDate && (
                    <span
                      className={`text-[10px] ${
                        isOverdue(i.dueDate) && i.status !== 'DONE'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-zinc-500'
                      }`}
                    >
                      {formatDate(i.dueDate)}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {grouped[s].length === 0 && (
              <div className="rounded-md border border-dashed border-zinc-200 dark:border-zinc-800 p-4 text-center text-xs text-zinc-400">
                Drop items here
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
