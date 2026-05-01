'use client';

import { create } from 'zustand';
import { api } from '@/lib/api';

const LS_KEY = 'fredocloud:lastWorkspaceId';

export const useWorkspace = create((set, get) => ({
  workspaces: [],
  currentId: null,
  current: null,
  members: [],
  permissions: null,
  role: null,
  presence: [], // userIds online in current workspace
  loading: false,

  loadAll: async () => {
    set({ loading: true });
    const { workspaces } = await api.get('/api/workspaces');
    let nextId = get().currentId;
    if (typeof window !== 'undefined' && !nextId) {
      nextId = localStorage.getItem(LS_KEY);
    }
    if (!nextId || !workspaces.find((w) => w.id === nextId)) {
      nextId = workspaces[0]?.id || null;
    }
    set({ workspaces, loading: false });
    if (nextId) await get().select(nextId);
  },

  select: async (id) => {
    if (!id) return;
    if (typeof window !== 'undefined') localStorage.setItem(LS_KEY, id);
    set({ currentId: id });
    const [{ workspace, role, permissions }, { members }] = await Promise.all([
      api.get(`/api/workspaces/${id}`),
      api.get(`/api/workspaces/${id}/members`),
    ]);
    set({ current: workspace, role, permissions, members });
  },

  create: async ({ name, description, accentColor }) => {
    const { workspace } = await api.post('/api/workspaces', { name, description, accentColor });
    set({ workspaces: [...get().workspaces, { ...workspace, role: 'ADMIN' }] });
    await get().select(workspace.id);
    return workspace;
  },

  update: async (patch) => {
    const id = get().currentId;
    const { workspace } = await api.patch(`/api/workspaces/${id}`, patch);
    set({
      current: workspace,
      workspaces: get().workspaces.map((w) => (w.id === id ? { ...w, ...workspace } : w)),
    });
  },

  invite: async (email, role) => {
    const id = get().currentId;
    const { invitation } = await api.post(`/api/workspaces/${id}/members/invitations`, {
      email,
      role,
    });
    return invitation;
  },

  updateMember: async (membershipId, patch) => {
    const id = get().currentId;
    const { member } = await api.patch(`/api/workspaces/${id}/members/${membershipId}`, patch);
    set({
      members: get().members.map((m) => (m.id === membershipId ? member : m)),
    });
  },

  removeMember: async (membershipId) => {
    const id = get().currentId;
    await api.del(`/api/workspaces/${id}/members/${membershipId}`);
    set({ members: get().members.filter((m) => m.id !== membershipId) });
  },

  setPresence: (online) => set({ presence: online }),
}));
