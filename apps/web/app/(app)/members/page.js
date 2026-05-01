'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useWorkspace } from '@/store/workspace';
import { useAuth } from '@/store/auth';
import { Modal } from '@/components/modal';
import { PlusIcon, TrashIcon } from '@/components/icons';

const PERM_KEYS = [
  ['canCreateGoal', 'Create goals'],
  ['canEditGoal', 'Edit goals'],
  ['canDeleteGoal', 'Delete goals'],
  ['canCreateActionItem', 'Create action items'],
  ['canPostAnnouncement', 'Post announcements'],
  ['canPinAnnouncement', 'Pin announcements'],
  ['canInviteMember', 'Invite members'],
  ['canManageMembers', 'Manage members'],
  ['canExportData', 'Export data'],
];

export default function MembersPage() {
  const { user } = useAuth();
  const { current, members, permissions, role, invite, updateMember, removeMember } =
    useWorkspace();
  const [inviting, setInviting] = useState(false);

  const canManage = permissions?.canManageMembers || role === 'ADMIN';
  const canInvite = permissions?.canInviteMember || role === 'ADMIN';

  return (
    <div>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="text-sm text-zinc-500 mt-1">{members.length} in {current?.name}</p>
        </div>
        {canInvite && (
          <button onClick={() => setInviting(true)} className="btn-primary">
            <PlusIcon size={14} /> Invite member
          </button>
        )}
      </div>

      <div className="card mt-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Permissions</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <MemberRow
                key={m.id}
                m={m}
                canManage={canManage}
                isMe={m.userId === user.id}
                onUpdate={(patch) => updateMember(m.id, patch)}
                onRemove={() => removeMember(m.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {inviting && <InviteModal onClose={() => setInviting(false)} onInvite={invite} />}
    </div>
  );
}

function MemberRow({ m, canManage, isMe, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <tr className="border-t border-zinc-100 dark:border-zinc-800">
        <td className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 grid place-items-center text-xs font-medium">
              {m.user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.user.avatarUrl} alt={m.user.name} className="h-full w-full object-cover" />
              ) : (
                m.user.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <div className="font-medium">{m.user.name}{isMe && <span className="ml-1 text-xs text-zinc-500">(you)</span>}</div>
              <div className="text-xs text-zinc-500">{m.user.email}</div>
            </div>
          </div>
        </td>
        <td className="p-3">
          {canManage && !isMe ? (
            <select
              className="input py-1 text-xs"
              value={m.role}
              onChange={(e) => onUpdate({ role: e.target.value })}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          ) : (
            <span className={`badge ${m.role === 'ADMIN' ? 'bg-fredo-50 text-fredo-800 dark:bg-fredo-950/40 dark:text-fredo-300' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}`}>
              {m.role}
            </span>
          )}
        </td>
        <td className="p-3">
          <div className="flex flex-wrap gap-1">
            {PERM_KEYS.filter(([k]) => m.permissions[k]).slice(0, 4).map(([k, label]) => (
              <span key={k} className="badge bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">{label}</span>
            ))}
            {PERM_KEYS.filter(([k]) => m.permissions[k]).length > 4 && (
              <span className="text-xs text-zinc-500">+{PERM_KEYS.filter(([k]) => m.permissions[k]).length - 4} more</span>
            )}
          </div>
        </td>
        <td className="p-3 text-right whitespace-nowrap">
          {canManage && (
            <>
              <button onClick={() => setEditing((v) => !v)} className="text-xs text-zinc-500 hover:underline mr-3">
                {editing ? 'Hide' : 'Permissions'}
              </button>
              {!isMe && (
                <button onClick={() => { if (confirm('Remove this member?')) onRemove(); }} className="text-zinc-400 hover:text-red-600">
                  <TrashIcon size={14} />
                </button>
              )}
            </>
          )}
        </td>
      </tr>
      {editing && (
        <tr className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <td colSpan={4} className="p-4">
            <div className="grid sm:grid-cols-3 gap-2">
              {PERM_KEYS.map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!m.permissions[k]}
                    onChange={(e) => onUpdate({ permissions: { [k]: e.target.checked } })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function InviteModal({ onClose, onInvite }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [submitting, setSubmitting] = useState(false);
  const [link, setLink] = useState(null);

  return (
    <Modal title="Invite a member" onClose={onClose}>
      {link ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Invitation created. Share this link with the invitee:
          </p>
          <input className="input" value={link} readOnly onClick={(e) => e.target.select()} />
          <p className="text-xs text-zinc-500">
            In production this would be emailed automatically (Nodemailer / EmailJS bonus).
          </p>
          <div className="flex justify-end">
            <button onClick={onClose} className="btn-primary">Done</button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            try {
              const inv = await onInvite(email, role);
              setLink(inv.acceptUrl);
            } catch (err) {
              toast.error(err.message);
            } finally {
              setSubmitting(false);
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="label">Email</label>
            <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Creating…' : 'Create invitation'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
