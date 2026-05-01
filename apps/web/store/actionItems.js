'use client';

import { create } from 'zustand';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export const STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

export const useActionItems = create((set, get) => ({
  byWorkspace: {},

  load: async (workspaceId) => {
    const { items } = await api.get(`/api/workspaces/${workspaceId}/action-items`);
    set({ byWorkspace: { ...get().byWorkspace, [workspaceId]: items } });
  },

  list: (workspaceId) => get().byWorkspace[workspaceId] || [],

  create: async (workspaceId, payload) => {
    const { item } = await api.post(`/api/workspaces/${workspaceId}/action-items`, payload);
    set({
      byWorkspace: {
        ...get().byWorkspace,
        [workspaceId]: [...(get().byWorkspace[workspaceId] || []), item],
      },
    });
    return item;
  },

  update: async (workspaceId, id, patch) => {
    const prev = get().byWorkspace[workspaceId] || [];
    const optimistic = prev.map((i) => (i.id === id ? { ...i, ...patch } : i));
    set({ byWorkspace: { ...get().byWorkspace, [workspaceId]: optimistic } });
    try {
      const { item } = await api.patch(`/api/workspaces/${workspaceId}/action-items/${id}`, patch);
      set({
        byWorkspace: {
          ...get().byWorkspace,
          [workspaceId]: get().byWorkspace[workspaceId].map((i) =>
            i.id === id ? { ...i, ...item } : i,
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
        [workspaceId]: prev.filter((i) => i.id !== id),
      },
    });
    try {
      await api.del(`/api/workspaces/${workspaceId}/action-items/${id}`);
    } catch (err) {
      set({ byWorkspace: { ...get().byWorkspace, [workspaceId]: prev } });
      toast.error(`Delete failed: ${err.message}`);
    }
  },

  reorder: async (workspaceId, moves) => {
    const prev = get().byWorkspace[workspaceId] || [];
    const map = new Map(moves.map((m) => [m.id, m]));
    const optimistic = prev.map((i) => {
      const m = map.get(i.id);
      return m ? { ...i, status: m.status, position: m.position } : i;
    });
    set({ byWorkspace: { ...get().byWorkspace, [workspaceId]: optimistic } });
    try {
      await api.post(`/api/workspaces/${workspaceId}/action-items/reorder`, { moves });
    } catch (err) {
      set({ byWorkspace: { ...get().byWorkspace, [workspaceId]: prev } });
      toast.error(`Reorder failed: ${err.message}`);
    }
  },

  upsertFromSocket: (workspaceId, item) => {
    const list = get().byWorkspace[workspaceId] || [];
    const exists = list.some((i) => i.id === item.id);
    set({
      byWorkspace: {
        ...get().byWorkspace,
        [workspaceId]: exists ? list.map((i) => (i.id === item.id ? { ...i, ...item } : i)) : [...list, item],
      },
    });
  },

  removeFromSocket: (workspaceId, id) => {
    set({
      byWorkspace: {
        ...get().byWorkspace,
        [workspaceId]: (get().byWorkspace[workspaceId] || []).filter((i) => i.id !== id),
      },
    });
  },

  applyMovesFromSocket: (workspaceId, moves) => {
    const list = get().byWorkspace[workspaceId] || [];
    const map = new Map(moves.map((m) => [m.id, m]));
    set({
      byWorkspace: {
        ...get().byWorkspace,
        [workspaceId]: list.map((i) => {
          const m = map.get(i.id);
          return m ? { ...i, status: m.status, position: m.position } : i;
        }),
      },
    });
  },
}));
