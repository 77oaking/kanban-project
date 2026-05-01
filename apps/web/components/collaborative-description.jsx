'use client';

import { useEffect, useRef, useState } from 'react';
import { connectSocket } from '@/lib/socket';
import { useAuth } from '@/store/auth';
import { useWorkspace } from '@/store/workspace';

/**
 * Real-time collaborative editing on a goal description.
 *
 * Approach (intentionally simple, not a full CRDT):
 *   - Editor is a <textarea> rendering plain text.
 *   - On every change, we broadcast `goal:edit:patch` with the full body.
 *   - Last-writer-wins for the broadcast preview; persistence happens on blur
 *     or an explicit Save button via the REST PATCH that the parent owns.
 *   - Peer cursors are rendered as labelled lines positioned at the peer's
 *     character index.
 *
 * Trade-off: at this scope OT/CRDT is overkill — collisions are rare in goal
 * descriptions, and falling back to last-write-wins keeps the code reviewable.
 */
export function CollaborativeDescription({ goalId, initial, onSave, readOnly }) {
  const user = useAuth((s) => s.user);
  const { currentId, members } = useWorkspace();
  const [value, setValue] = useState(initial || '');
  const [peers, setPeers] = useState({}); // userId -> { cursor, name }
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const taRef = useRef(null);
  const lastBroadcast = useRef(0);

  useEffect(() => {
    setValue(initial || '');
  }, [initial]);

  useEffect(() => {
    if (!goalId) return;
    const s = connectSocket();
    if (!s) return;
    const enter = () => s.emit('goal:edit:join', { goalId });
    if (s.connected) enter();
    else s.once('connect', enter);

    const onPatch = ({ userId, body }) => {
      if (userId === user?.id) return;
      setValue(body);
    };
    const onCursor = ({ userId, cursor }) => {
      if (userId === user?.id) return;
      const member = members.find((m) => m.userId === userId);
      setPeers((p) => ({ ...p, [userId]: { cursor, name: member?.user?.name || 'Someone' } }));
    };
    const onPeerLeft = ({ userId }) => {
      setPeers((p) => {
        const next = { ...p };
        delete next[userId];
        return next;
      });
    };

    s.on('goal:edit:patch', onPatch);
    s.on('goal:edit:cursor', onCursor);
    s.on('goal:edit:peer-left', onPeerLeft);

    return () => {
      s.emit('goal:edit:leave', { goalId });
      s.off('goal:edit:patch', onPatch);
      s.off('goal:edit:cursor', onCursor);
      s.off('goal:edit:peer-left', onPeerLeft);
    };
  }, [goalId, user?.id, members]);

  function broadcastChange(body, cursor) {
    const s = connectSocket();
    if (!s || !s.connected) return;
    const now = Date.now();
    // Throttle to 12 messages/sec — enough to feel live, light on the wire.
    if (now - lastBroadcast.current < 80) return;
    lastBroadcast.current = now;
    s.emit('goal:edit:patch', { goalId, body });
    s.emit('goal:edit:cursor', { goalId, cursor });
  }

  async function save() {
    if (!dirty) return;
    setSaving(true);
    try {
      await onSave(value);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={taRef}
        readOnly={readOnly}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setDirty(true);
          broadcastChange(e.target.value, e.target.selectionStart);
        }}
        onBlur={save}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            save();
          }
        }}
        rows={6}
        className="input font-mono text-sm leading-relaxed"
        placeholder={readOnly ? 'No description.' : 'Describe what success looks like…'}
      />
      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          {Object.entries(peers).length > 0 && (
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {Object.values(peers).map((p) => p.name).join(', ')} editing
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-amber-600 dark:text-amber-400">Unsaved</span>}
          {!readOnly && (
            <button onClick={save} disabled={!dirty || saving} className="btn-outline">
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
