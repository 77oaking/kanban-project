'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/store/auth';
import { api } from '@/lib/api';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'fredocloud/avatars');
      const { url } = await api.upload('/api/upload', fd);
      await updateProfile({ avatarUrl: url });
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name });
      toast.success('Profile saved');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <p className="text-sm text-zinc-500 mt-1">How others see you across workspaces.</p>

      <div className="card mt-6 p-5">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 grid place-items-center text-lg font-semibold">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              user.name?.slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <label className="btn-outline cursor-pointer">
              {uploading ? 'Uploading…' : 'Change avatar'}
              <input type="file" accept="image/*" className="hidden" onChange={onAvatar} disabled={uploading} />
            </label>
            <p className="text-xs text-zinc-500 mt-2">PNG, JPG, GIF — up to 5MB.</p>
          </div>
        </div>

        <form onSubmit={onSave} className="mt-6 space-y-4">
          <div>
            <label className="label">Display name</label>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" disabled value={user.email} />
            <p className="text-xs text-zinc-500 mt-1">Email changes are not supported in this build.</p>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
