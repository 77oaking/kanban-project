'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useWorkspace } from '@/store/workspace';

const PRESET_COLORS = ['#7A1F2B', '#1F4E7A', '#1F7A4E', '#7A6A1F', '#5C1F7A', '#1F7A6F'];

export default function SettingsPage() {
  const { current, update, role } = useWorkspace();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [accentColor, setAccentColor] = useState('#7A1F2B');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (current) {
      setName(current.name || '');
      setDescription(current.description || '');
      setAccentColor(current.accentColor || '#7A1F2B');
    }
  }, [current]);

  const canEdit = role === 'ADMIN';

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Workspace settings</h1>
      <p className="text-sm text-zinc-500 mt-1">Edit name, description, and accent.</p>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            await update({ name, description, accentColor });
            toast.success('Saved');
          } catch (err) {
            toast.error(err.message);
          } finally {
            setSaving(false);
          }
        }}
        className="card mt-6 p-5 space-y-4"
      >
        <fieldset disabled={!canEdit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="label">Accent color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAccentColor(c)}
                  className={`h-8 w-8 rounded-full border-2 ${accentColor === c ? 'border-zinc-900 dark:border-white' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
              <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-8 w-12" />
            </div>
          </div>
        </fieldset>
        {canEdit && (
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
        {!canEdit && <p className="text-xs text-zinc-500">Only admins can edit workspace settings.</p>}
      </form>
    </div>
  );
}
