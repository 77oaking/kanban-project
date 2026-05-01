'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useWorkspace } from '@/store/workspace';
import { useAnnouncements } from '@/store/announcements';
import { useAuth } from '@/store/auth';
import { RichTextEditor } from '@/components/rich-text-editor';
import { Modal } from '@/components/modal';
import { api } from '@/lib/api';
import { relativeTime } from '@/lib/format';
import { PinIcon, MegaphoneIcon, SmileIcon, TrashIcon, PlusIcon } from '@/components/icons';

const QUICK_EMOJI = ['👍', '🎉', '❤️', '🚀', '👀', '🙌'];

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const { currentId, permissions } = useWorkspace();
  const { load, list, create, update, remove, toggleReaction } = useAnnouncements();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (currentId) load(currentId);
  }, [currentId, load]);

  const announcements = list(currentId);

  return (
    <div>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
          <p className="text-sm text-zinc-500 mt-1">Share team-wide updates. Pinned posts stay at the top.</p>
        </div>
        {permissions?.canPostAnnouncement && (
          <button onClick={() => setCreating(true)} className="btn-primary">
            <PlusIcon size={14} /> New post
          </button>
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-zinc-500">
          <MegaphoneIcon size={32} />
          <p className="mt-2">No announcements yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {announcements.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              currentUser={user}
              canPin={permissions?.canPinAnnouncement}
              onPin={() => update(currentId, a.id, { pinned: !a.pinned })}
              onDelete={() => remove(currentId, a.id)}
              onReact={(emoji) => toggleReaction(currentId, a.id, emoji, user.id)}
            />
          ))}
        </div>
      )}

      {creating && (
        <CreateAnnouncementModal
          onClose={() => setCreating(false)}
          onSubmit={async ({ title, body, pinned }) => {
            try {
              await create(currentId, { title, body, pinned });
              toast.success('Posted');
              setCreating(false);
            } catch (err) {
              toast.error(err.message);
            }
          }}
          canPin={permissions?.canPinAnnouncement}
        />
      )}
    </div>
  );
}

function AnnouncementCard({ announcement: a, currentUser, canPin, onPin, onDelete, onReact }) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [draft, setDraft] = useState('');

  const counts = a.reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});
  const isAuthor = a.authorId === currentUser?.id;

  async function expand() {
    setExpanded(true);
    if (comments == null) {
      try {
        const { comments } = await api.get(
          `/api/workspaces/${a.workspaceId}/announcements/${a.id}/comments`,
        );
        setComments(comments);
      } catch (err) {
        toast.error(err.message);
      }
    }
  }

  async function postComment(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    try {
      const { comment } = await api.post(
        `/api/workspaces/${a.workspaceId}/announcements/${a.id}/comments`,
        { body: draft.trim() },
      );
      setComments((c) => [...(c || []), comment]);
      setDraft('');
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <article className="card p-5">
      <header className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 grid place-items-center text-sm font-medium shrink-0">
          {a.author?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.author.avatarUrl} alt={a.author.name} className="h-full w-full object-cover" />
          ) : (
            a.author?.name?.slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold leading-snug">{a.title}</h2>
            {a.pinned && (
              <span className="badge bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <PinIcon size={10} /> Pinned
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            {a.author?.name} · {relativeTime(a.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {canPin && (
            <button
              onClick={onPin}
              className="text-zinc-400 hover:text-fredo-700 dark:hover:text-fredo-400"
              title={a.pinned ? 'Unpin' : 'Pin'}
            >
              <PinIcon size={16} />
            </button>
          )}
          {isAuthor && (
            <button onClick={onDelete} className="text-zinc-400 hover:text-red-600">
              <TrashIcon size={16} />
            </button>
          )}
        </div>
      </header>

      <div className="prose-announcement mt-3 text-sm text-zinc-800 dark:text-zinc-200" dangerouslySetInnerHTML={{ __html: a.body }} />

      <footer className="mt-4 flex items-center gap-2 flex-wrap">
        {Object.entries(counts).map(([emoji, count]) => {
          const mine = a.reactions.some((r) => r.emoji === emoji && r.userId === currentUser?.id);
          return (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              className={`text-xs px-2 py-1 rounded-full border ${
                mine
                  ? 'bg-fredo-50 border-fredo-200 dark:bg-fredo-950/40 dark:border-fredo-800'
                  : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              {emoji} {count}
            </button>
          );
        })}
        <div className="relative">
          <button
            onClick={() => setShowEmoji((v) => !v)}
            className="text-xs px-2 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-flex items-center gap-1"
          >
            <SmileIcon size={14} /> React
          </button>
          {showEmoji && (
            <div
              onMouseLeave={() => setShowEmoji(false)}
              className="absolute z-10 top-full mt-1 left-0 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg p-1 flex gap-1 animate-fade-in"
            >
              {QUICK_EMOJI.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    onReact(e);
                    setShowEmoji(false);
                  }}
                  className="h-7 w-7 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-base"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => (expanded ? setExpanded(false) : expand())}
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          {expanded ? 'Hide' : 'Show'} comments ({a._count?.comments ?? (comments?.length ?? 0)})
        </button>
      </footer>

      {expanded && (
        <div className="mt-4 border-t border-zinc-100 dark:border-zinc-800 pt-3 space-y-3">
          {(comments || []).map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="h-7 w-7 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 grid place-items-center text-[10px] font-medium shrink-0">
                {c.author?.name?.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{c.author?.name}</span>
                  <span className="text-xs text-zinc-500">{relativeTime(c.createdAt)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{highlightMentions(c.body)}</p>
              </div>
            </div>
          ))}
          <form onSubmit={postComment} className="flex gap-2">
            <input
              className="input"
              placeholder="Write a comment… use @name to mention"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className="btn-primary shrink-0">Post</button>
          </form>
        </div>
      )}
    </article>
  );
}

function highlightMentions(text) {
  const parts = text.split(/(@[\w\-.]{2,40})/g);
  return parts.map((p, i) =>
    p.startsWith('@') ? (
      <span key={i} className="text-fredo-700 dark:text-fredo-400 font-medium">{p}</span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function CreateAnnouncementModal({ onClose, onSubmit, canPin }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <Modal title="New announcement" onClose={onClose} size="lg">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim() || !body.trim()) return;
          setSubmitting(true);
          await onSubmit({ title: title.trim(), body, pinned });
          setSubmitting(false);
        }}
        className="space-y-4"
      >
        <div>
          <label className="label">Title</label>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">Body</label>
          <RichTextEditor value={body} onChange={setBody} placeholder="Write something the team should know…" />
        </div>
        {canPin && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            Pin to the top of the feed
          </label>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Posting…' : 'Publish'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
