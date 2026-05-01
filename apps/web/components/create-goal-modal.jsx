'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useGoals } from '@/store/goals';
import { useWorkspace } from '@/store/workspace';
import { Modal } from '@/components/modal';

export function CreateGoalModal({ members, onClose }) {
  const { currentId } = useWorkspace();
  const create = useGoals((s) => s.create);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState(members[0]?.userId || '');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await create(currentId, {
        title,
        description: description || null,
        ownerId,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });
      toast.success('Goal created');
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New goal" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Title</label>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ship Q3 onboarding redesign" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does success look like?" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Owner</label>
            <select className="input" required value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>{m.user.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Due date</label>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Creating…' : 'Create goal'}</button>
        </div>
      </form>
    </Modal>
  );
}
