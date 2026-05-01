'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/store/auth';
import { useWorkspace } from '@/store/workspace';
import { api } from '@/lib/api';

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const { user, loading } = useAuth();
  const loadAll = useWorkspace((s) => s.loadAll);
  const select = useWorkspace((s) => s.select);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/accept-invite?token=${token}`)}`);
    }
  }, [loading, user, token, router]);

  if (loading || !user) {
    return <div className="min-h-screen grid place-items-center text-sm text-zinc-500">Loading…</div>;
  }

  async function accept() {
    if (!token) return;
    setWorking(true);
    try {
      const { workspaceId } = await api.post('/api/invitations/accept', { token });
      toast.success('Welcome to the workspace!');
      await loadAll();
      await select(workspaceId);
      router.push('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="card max-w-md w-full p-6 text-center">
        <h1 className="text-xl font-semibold">You've been invited</h1>
        <p className="text-sm text-zinc-500 mt-2">Click below to accept and join the workspace.</p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Link href="/dashboard" className="btn-ghost">Decline</Link>
          <button onClick={accept} disabled={working || !token} className="btn-primary">
            {working ? 'Joining…' : 'Accept invitation'}
          </button>
        </div>
        {!token && <p className="mt-3 text-xs text-amber-600">No token in the URL.</p>}
      </div>
    </div>
  );
}
