import { Suspense } from 'react';
import AcceptInviteClient from './accept-invite-client';

export default function AcceptInvitePage({ searchParams }) {
  const token = typeof searchParams?.token === 'string' ? searchParams.token : null;

  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center text-sm text-zinc-500">Loading…</div>}>
      <AcceptInviteClient token={token} />
    </Suspense>
  );
}
