'use client';

import { create } from 'zustand';
import { api } from '@/lib/api';

export const useAuth = create((set, get) => ({
  user: null,
  loading: true,
  error: null,

  bootstrap: async () => {
    try {
      const data = await api.get('/api/auth/me');
      set({ user: data.user, loading: false, error: null });
    } catch {
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    set({ error: null });
    try {
      const { user } = await api.post('/api/auth/login', { email, password });
      set({ user });
      return user;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  register: async (email, password, name) => {
    set({ error: null });
    try {
      const { user } = await api.post('/api/auth/register', { email, password, name });
      set({ user });
      return user;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      /* ignore */
    }
    set({ user: null });
  },

  updateProfile: async (patch) => {
    const { user } = await api.patch('/api/auth/me', patch);
    set({ user });
    return user;
  },

  isAuthed: () => !!get().user,
}));
