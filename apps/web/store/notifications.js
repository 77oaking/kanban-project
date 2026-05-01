'use client';

import { create } from 'zustand';
import { api } from '@/lib/api';

export const useNotifications = create((set, get) => ({
  items: [],

  load: async () => {
    const { notifications } = await api.get('/api/notifications');
    set({ items: notifications });
  },

  unreadCount: () => get().items.filter((n) => !n.read).length,

  pushFromSocket: (n) => set({ items: [n, ...get().items] }),

  markRead: async (id) => {
    set({ items: get().items.map((n) => (n.id === id ? { ...n, read: true } : n)) });
    try {
      await api.post(`/api/notifications/${id}/read`);
    } catch {
      /* ignore — UI already optimistic */
    }
  },

  markAllRead: async () => {
    set({ items: get().items.map((n) => ({ ...n, read: true })) });
    try {
      await api.post('/api/notifications/read-all');
    } catch {
      /* ignore */
    }
  },
}));
