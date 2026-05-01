'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useWorkspace } from '@/store/workspace';
import { Modal } from '@/components/modal';

const PRESET_COLORS = ['#7A1F2B', '#1F4E7A', '#1F7A4E', '#7A6A1F', '#5C1F7A', '#1F7A6F'];

export function CreateWorkspaceModal({ onClose }) {
  const router = useRouter();
  const create = useWorkspace((s) => s.create);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [accentColor, setAccentColor] = useState('#7A1F2B');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const ws = await create({ name, description, accentColor });
      toast.success('Workspace created');
      onClose();
      router.push('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Create a workspace" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Engineering" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this team work on?" />
        </div>
        <div>
          <label className="label">Accent color</label>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAccentColor(c)}
                className={`h-8 w-8 rounded-full border-2 ${accentColor === c ? 'border-zinc-900 dark:border-white' : 'border-transparent'}`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-8 w-12 rounded border border-zinc-200 dark:border-zinc-800"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Creating…' : 'Create workspace'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
