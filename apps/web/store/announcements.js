'use client';

import { create } from 'zustand';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export const useAnnouncements = create((set, get) => ({
  byWorkspace: {},

  load: async (workspaceId) => {
    const { announcements } = await api.get(`/api/workspaces/${workspaceId}/announcements`);
    set({ byWorkspace: { ...get().byWorkspace, [workspaceId]: announcements } });
  },

  list: (workspaceId) => get().byWorkspace[workspaceId] || [],

  create: async (workspaceId, payload) => {
    const { announcement } = await api.post(`/api/workspaces/${workspaceId}/announcements`, payload);
    const list = get().byWorkspace[workspaceId] || [];
    set({
      byWorkspace: {
        ...get().byWorkspace,
        [workspaceId]: [announcement, ...list].sort(
          (a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.createdAt) - new Date(a.createdAt),
        ),
      },
    });
    return announcement;
  },

  update: async (workspaceId, id, patch) => {
    const prev = get().byWorkspace[workspaceId] || [];
    const optimistic = prev.map((a) => (a.id === id ? { ...a, ...patch } : a));
    set({
      byWorkspace: {
        ...get().byWorkspace,
        [workspaceId]: [...optimistic].sort(
          (a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.createdAt) - new Date(a.createdAt),
        ),
      },
    });
    try {
      const { announcement } = await api.patch(
        `/api/workspaces/${workspaceId}/announcements/${id}`,
        patch,
      );
      set({
        byWorkspace: {
          ...get().byWorkspace,
          [workspaceId]: get()
            .byWorkspace[workspaceId].map((a) => (a.id === id ? { ...a, ...announcement } : a))
            .sort(
              (a, b) =>
                Number(b.pinned) - Number(a.pinned) || new Date(b.createdAt) - new Date(a.createdAt),
            ),
        },
      });
    } catch (err) {
      set({ byWorkspace: { ...get().byWorkspace, [workspaceId]: prev } });
      toast.error(`Update failed: ${err.message}`);
    }
  },

  remove: async (workspaceId, id) => {
    const prev = get().byWorkspace[workspaceId] || [];
    set({
      byWorkspace: {
        ...get().byWorkspace,
        [workspaceId]: prev.filter((a) => a.id !== id),
      },
    });
    try {
      await api.del(`/api/workspaces/${workspaceId}/announcements/${id}`);
    } catch (err) {
      set({ byWorkspace: { ...get().byWorkspace, [workspaceId]: prev } });
      toast.error(`Delete failed: ${err.message}`);
    }
  },

  /**
   * Optimistic toggle: flip presence locally, hit API. Server returns
   * `{ added }` so we can reconcile if it disagrees.
   */
  toggleReaction: async (workspaceId, id, emoji, currentUserId) => {
    const prev = get().byWorkspace[workspaceId] || [];
    const target = prev.find((a) => a.id === id);
    if (!target) return;
    const has = target.reactions.some((r) => r.emoji === emoji && r.userId === currentUserId);
    const optimistic = prev.map((a) =>
      a.id !== id
        ? a
        : {
            ...a,
            reactions: has
              ? a.reactions.filter((r) => !(r.emoji === emoji && r.userId === currentUserId))
              : [...a.reactions, { id: `temp-${Date.now()}`, emoji, userId: currentUserId, user: { id: currentUserId } }],
          },
    );
    set({ byWorkspace: { ...get().byWorkspace, [workspaceId]: optimistic } });
    try {
      await api.post(`/api/workspaces/${workspaceId}/announcements/${id}/reactions`, { emoji });
    } catch (err) {
      set({ byWorkspace: { ...get().byWorkspace, [workspaceId]: prev } });
      toast.error(`Reaction failed: ${err.message}`);
    }
  },

  upsertFromSocket: (workspaceId, announcement) => {
    const list = get().byWorkspace[workspaceId] || [];
    const exists = list.some((a) => a.id === announcement.id);
    const next = exists
      ? list.map((a) =>
          a.id === announcement.id ? { ...a, ...announcement, reactions: a.reactions || [] } : a,
        )
      : [{ ...announcement, reactions: [] }, ...list];
    set({
      byWorkspace: {
        ...get().byWorkspace,
        [workspaceId]: next.sort(
          (a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.createdAt) - new Date(a.createdAt),
        ),
      },
    });
  },

  removeFromSocket: (workspaceId, id) => {
    set({
      byWorkspace: {
        ...get().byWorkspace,
        [workspaceId]: (get().byWorkspace[workspaceId] || []).filter((a) => a.id !== id),
      },
    });
  },

  applyReactionFromSocket: (workspaceId, { announcementId, userId, emoji, added }) => {
    const list = get().byWorkspace[workspaceId] || [];
    set({
      byWorkspace: {
        ...get().byWorkspace,
        [workspaceId]: list.map((a) => {
          if (a.id !== announcementId) return a;
          const has = a.reactions.some((r) => r.emoji === emoji && r.userId === userId);
          if (added && !has) {
            return { ...a, reactions: [...a.reactions, { id: `srv-${Date.now()}`, emoji, userId, user: { id: userId } }] };
          }
          if (!added && has) {
            return { ...a, reactions: a.reactions.filter((r) => !(r.emoji === emoji && r.userId === userId)) };
          }
          return a;
        }),
      },
    });
  },
}));
