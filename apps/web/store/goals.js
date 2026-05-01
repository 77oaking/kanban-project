'use client';

import { create } from 'zustand';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export const useGoals = create((set, get) => ({
  byWorkspace: {}, // workspaceId -> goals[]
  loading: false,

  load: async (workspaceId) => {
    set({ loading: true });
    const { goals } = await api.get(`/api/workspaces/${workspaceId}/goals`);
    set({ byWorkspace: { ...get().byWorkspace, [workspaceId]: goals }, loading: false });
  },

  list: (workspaceId) => get().byWorkspace[workspaceId] || [],

  create: async (workspaceId, payload) => {
    const { goal } = await api.post(`/api/workspaces/${workspaceId}/goals`, payload);
    set({
      byWorkspace: {
        ...get().byWorkspace,
        [workspaceId]: [goal, ...(get().byWorkspace[workspaceId] || [])],
      },
    });
    return goal;
  },

  /**
   * Optimistic update: applies the patch immediately, sends the request, and
   * rolls back if the server rejects.
   */
  update: async (workspaceId, goalId, patch) => {
    const prev = get().byWorkspace[workspaceId] || [];
    const optimistic = prev.map((g) => (g.id === goalId ? { ...g, ...patch } : g));
    set({ byWorkspace: { ...get().byWorkspace, [workspaceId]: optimistic } });
    try {
      const { goal } = await api.patch(`/api/workspaces/${workspaceId}/goals/${goalId}`, patch);
      set({
        byWorkspace: {
          ...get().byWorkspace,
          [workspaceId]: get().byWorkspace[workspaceId].map((g) =>
            g.id === goalId ? { ...g, ...goal } : g,
          ),
        },
      });
      return goal;
    } catch (err) {
      set({ byWorkspace: { ...get().byWorkspace, [workspaceId]: prev } });
      toast.error(`Failed to update goal: ${err.message}`);
      throw err;
    }
  },

  remove: async (workspaceId, goalId) => {
    const prev = get().byWorkspace[workspaceId] || [];
    set({
      byWorkspace: {
        ...get().byWorkspace,
        [workspaceId]: prev.filter((g) => g.id !== goalId),
      },
    });
    try {
      await api.del(`/api/workspaces/${workspaceId}/goals/${goalId}`);
    } catch (err) {
      set({ byWorkspace: { ...get().byWorkspace, [workspaceId]: prev } });
      toast.error(`Failed to delete goal: ${err.message}`);
    }
  },

  // Realtime merge helpers — called from the socket listener.
  upsertFromSocket: (workspaceId, goal) => {
    const list = get().byWorkspace[workspaceId] || [];
    const exists = list.some((g) => g.id === goal.id);
    set({
      byWorkspace: {
        ...get().byWorkspace,
        [workspaceId]: exists
          ? list.map((g) => (g.id === goal.id ? { ...g, ...goal } : g))
          : [goal, ...list],
      },
    });
  },

  removeFromSocket: (workspaceId, id) => {
    set({
      byWorkspace: {
        ...get().byWorkspace,
        [workspaceId]: (get().byWorkspace[workspaceId] || []).filter((g) => g.id !== id),
      },
    });
  },
}));
