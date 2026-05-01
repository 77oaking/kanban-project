'use client';

import { useEffect } from 'react';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuth } from '@/store/auth';
import { useWorkspace } from '@/store/workspace';
import { useGoals } from '@/store/goals';
import { useActionItems } from '@/store/actionItems';
import { useAnnouncements } from '@/store/announcements';
import { useNotifications } from '@/store/notifications';
import { toast } from 'sonner';

/**
 * Custom hook (rendered as a no-op component from layout) that:
 *   - opens the socket once on mount
 *   - joins/leaves the workspace room when currentId changes
 *   - dispatches incoming events into the relevant Zustand store
 */
export function useSocketSync() {
  const user = useAuth((s) => s.user);
  const currentId = useWorkspace((s) => s.currentId);
  const setPresence = useWorkspace((s) => s.setPresence);

  useEffect(() => {
    if (!user) return;
    const s = connectSocket();
    if (!s) return;

    const onConnect = () => {
      if (currentId) s.emit('workspace:join', currentId);
    };
    const onPresence = ({ workspaceId, online }) => {
      if (workspaceId === currentId) setPresence(online);
    };
    const onGoalCreated = (goal) => useGoals.getState().upsertFromSocket(goal.workspaceId, goal);
    const onGoalUpdated = (goal) => useGoals.getState().upsertFromSocket(goal.workspaceId, goal);
    const onGoalDeleted = ({ id }) => {
      // We don't know which workspace; iterate.
      const map = useGoals.getState().byWorkspace;
      for (const wsId of Object.keys(map)) useGoals.getState().removeFromSocket(wsId, id);
    };

    const onItemCreated = (item) =>
      useActionItems.getState().upsertFromSocket(item.workspaceId, item);
    const onItemUpdated = (item) =>
      useActionItems.getState().upsertFromSocket(item.workspaceId, item);
    const onItemDeleted = ({ id }) => {
      const map = useActionItems.getState().byWorkspace;
      for (const wsId of Object.keys(map)) useActionItems.getState().removeFromSocket(wsId, id);
    };
    const onItemReordered = ({ moves }) => {
      if (currentId) useActionItems.getState().applyMovesFromSocket(currentId, moves);
    };

    const onAnnouncementCreated = (ann) =>
      useAnnouncements.getState().upsertFromSocket(ann.workspaceId, ann);
    const onAnnouncementUpdated = (ann) =>
      useAnnouncements.getState().upsertFromSocket(ann.workspaceId, ann);
    const onAnnouncementDeleted = ({ id }) => {
      const map = useAnnouncements.getState().byWorkspace;
      for (const wsId of Object.keys(map)) useAnnouncements.getState().removeFromSocket(wsId, id);
    };
    const onAnnouncementReaction = (payload) => {
      if (currentId) useAnnouncements.getState().applyReactionFromSocket(currentId, payload);
    };

    const onNotification = (n) => {
      useNotifications.getState().pushFromSocket(n);
      toast(`${n.title}`, { description: n.body?.slice(0, 100) });
    };

    s.on('connect', onConnect);
    s.on('presence:update', onPresence);
    s.on('goal:created', onGoalCreated);
    s.on('goal:updated', onGoalUpdated);
    s.on('goal:deleted', onGoalDeleted);
    s.on('actionItem:created', onItemCreated);
    s.on('actionItem:updated', onItemUpdated);
    s.on('actionItem:deleted', onItemDeleted);
    s.on('actionItem:reordered', onItemReordered);
    s.on('announcement:created', onAnnouncementCreated);
    s.on('announcement:updated', onAnnouncementUpdated);
    s.on('announcement:deleted', onAnnouncementDeleted);
    s.on('announcement:reaction', onAnnouncementReaction);
    s.on('notification:new', onNotification);

    if (s.connected && currentId) s.emit('workspace:join', currentId);

    return () => {
      s.off('connect', onConnect);
      s.off('presence:update', onPresence);
      s.off('goal:created', onGoalCreated);
      s.off('goal:updated', onGoalUpdated);
      s.off('goal:deleted', onGoalDeleted);
      s.off('actionItem:created', onItemCreated);
      s.off('actionItem:updated', onItemUpdated);
      s.off('actionItem:deleted', onItemDeleted);
      s.off('actionItem:reordered', onItemReordered);
      s.off('announcement:created', onAnnouncementCreated);
      s.off('announcement:updated', onAnnouncementUpdated);
      s.off('announcement:deleted', onAnnouncementDeleted);
      s.off('announcement:reaction', onAnnouncementReaction);
      s.off('notification:new', onNotification);
    };
  }, [user, currentId, setPresence]);

  // Switch workspace rooms when currentId changes.
  useEffect(() => {
    const s = connectSocket();
    if (!s || !currentId) return;
    const join = () => s.emit('workspace:join', currentId);
    if (s.connected) join();
    else s.once('connect', join);
    return () => {
      if (s.connected) s.emit('workspace:leave', currentId);
    };
  }, [currentId]);

  // Disconnect when the user logs out.
  useEffect(() => {
    if (!user) disconnectSocket();
  }, [user]);
}
