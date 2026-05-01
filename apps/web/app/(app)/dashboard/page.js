'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useWorkspace } from '@/store/workspace';
import { api } from '@/lib/api';
import { CreateWorkspaceModal } from '@/components/create-workspace-modal';
import { DownloadIcon, TargetIcon, KanbanIcon, UsersIcon, CheckIcon, SparkleIcon } from '@/components/icons';

const Chart = dynamic(() => import('@/components/dashboard-chart').then((m) => m.DashboardChart), {
  ssr: false,
  loading: () => <div className="h-64 grid place-items-center text-sm text-zinc-500">Loading chart…</div>,
});

export default function DashboardPage() {
  const { current, workspaces, currentId, permissions } = useWorkspace();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!currentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get(`/api/workspaces/${currentId}/stats`)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [currentId]);

  // Empty state — user has zero workspaces
  if (workspaces.length === 0) {
    return (
      <div className="grid place-items-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <SparkleIcon size={32} />
          <h1 className="text-2xl font-semibold mt-3">Welcome to your Team Hub</h1>
          <p className="text-zinc-500 mt-2">
            Create your first workspace to start tracking goals, posting announcements, and managing action items.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-5">
            Create your first workspace
          </button>
        </div>
        {showCreate && <CreateWorkspaceModal onClose={() => setShowCreate(false)} />}
      </div>
    );
  }

  function exportCsv() {
    window.open(`${api.base}/api/workspaces/${currentId}/export`, '_blank');
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            {current?.name}
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: current?.accentColor || '#7A1F2B' }}
            />
          </h1>
          {current?.description && <p className="text-sm text-zinc-500 mt-1">{current.description}</p>}
        </div>
        {permissions?.canExportData && (
          <button onClick={exportCsv} className="btn-outline">
            <DownloadIcon size={14} /> Export CSV
          </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total goals" value={stats?.totals?.goals ?? '—'} icon={TargetIcon} />
        <StatCard label="Done this week" value={stats?.totals?.completedThisWeek ?? '—'} icon={CheckIcon} accent />
        <StatCard label="Overdue" value={stats?.totals?.overdue ?? '—'} icon={KanbanIcon} danger />
        <StatCard label="Members" value={stats?.totals?.members ?? '—'} icon={UsersIcon} />
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2 p-5">
          <h2 className="font-semibold">Completion this month</h2>
          <p className="text-xs text-zinc-500">Action items completed per day, last 30 days.</p>
          <div className="mt-3 h-64">
            {loading ? (
              <div className="h-full grid place-items-center text-sm text-zinc-500">Loading…</div>
            ) : stats ? (
              <Chart series={stats.completionSeries} accent={current?.accentColor || '#7A1F2B'} />
            ) : (
              <div className="h-full grid place-items-center text-sm text-zinc-500">No data yet</div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Goals by status</h2>
          <div className="mt-3 space-y-2">
            {(['NOT_STARTED', 'IN_PROGRESS', 'AT_RISK', 'COMPLETED']).map((s) => {
              const count = stats?.goalsByStatus?.[s] ?? 0;
              const total = Object.values(stats?.goalsByStatus || {}).reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={s}>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-600 dark:text-zinc-400">{s.replaceAll('_', ' ')}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-1.5 mt-1 rounded bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${pct}%`,
                        background: statusColor(s),
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function statusColor(s) {
  return {
    NOT_STARTED: '#94a3b8',
    IN_PROGRESS: '#7A1F2B',
    AT_RISK: '#f59e0b',
    COMPLETED: '#10b981',
  }[s];
}

function StatCard({ label, value, icon: Icon, accent, danger }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">{label}</span>
        <span
          className={
            accent
              ? 'text-emerald-600 dark:text-emerald-400'
              : danger
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-zinc-400'
          }
        >
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
