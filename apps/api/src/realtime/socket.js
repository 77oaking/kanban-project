import { Server } from 'socket.io';
import cookie from 'cookie';
import { verifyAccess } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

let io = null;

// userId -> Set<socketId>
const userSockets = new Map();
// workspaceId -> Set<userId>  (presence)
const workspacePresence = new Map();

function addUserSocket(userId, socketId) {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socketId);
}

function removeUserSocket(userId, socketId) {
  const set = userSockets.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) userSockets.delete(userId);
}

function addPresence(workspaceId, userId) {
  if (!workspacePresence.has(workspaceId)) workspacePresence.set(workspaceId, new Set());
  workspacePresence.get(workspaceId).add(userId);
}

function removePresence(workspaceId, userId) {
  const set = workspacePresence.get(workspaceId);
  if (!set) return;
  set.delete(userId);
  if (set.size === 0) workspacePresence.delete(workspaceId);
}

export function initSocket(server) {
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').split(',').map((s) => s.trim());
  io = new Server(server, {
    cors: { origin: clientUrl, credentials: true },
    path: '/socket.io',
  });

  // Auth middleware: read access_token cookie from the upgrade request.
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers?.cookie || '';
      const cookies = cookie.parse(cookieHeader);
      const token = cookies.access_token;
      if (!token) return next(new Error('Unauthorized'));
      const payload = verifyAccess(token);
      socket.data.userId = payload.sub;
      socket.data.email = payload.email;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket.data;
    addUserSocket(userId, socket.id);
    socket.join(`user:${userId}`);
    logger.debug('socket connected', { userId, sid: socket.id });

    // Client tells the server which workspace it's currently viewing.
    socket.on('workspace:join', async (workspaceId) => {
      if (!workspaceId) return;
      // Verify membership before joining the room.
      const m = await prisma.membership.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
        select: { id: true },
      });
      if (!m) return;
      socket.join(`workspace:${workspaceId}`);
      socket.data.workspaceId = workspaceId;
      addPresence(workspaceId, userId);
      io.to(`workspace:${workspaceId}`).emit('presence:update', {
        workspaceId,
        online: Array.from(workspacePresence.get(workspaceId) || []),
      });
    });

    socket.on('workspace:leave', (workspaceId) => {
      if (!workspaceId) return;
      socket.leave(`workspace:${workspaceId}`);
      removePresence(workspaceId, userId);
      io.to(`workspace:${workspaceId}`).emit('presence:update', {
        workspaceId,
        online: Array.from(workspacePresence.get(workspaceId) || []),
      });
    });

    // --- Real-time collaborative editing on goal description (stretch feature)
    // Clients broadcast partial edits to peers in the same goal room. Final
    // persistence still happens via PATCH /goals/:id — this is a thin overlay
    // for live cursors and intermediate text, not an OT/CRDT engine.
    socket.on('goal:edit:join', ({ goalId }) => {
      if (!goalId) return;
      socket.join(`goal:${goalId}`);
      socket.to(`goal:${goalId}`).emit('goal:edit:peer-joined', { userId });
    });
    socket.on('goal:edit:cursor', ({ goalId, cursor }) => {
      socket.to(`goal:${goalId}`).emit('goal:edit:cursor', { userId, cursor });
    });
    socket.on('goal:edit:patch', ({ goalId, body }) => {
      socket.to(`goal:${goalId}`).emit('goal:edit:patch', { userId, body });
    });
    socket.on('goal:edit:leave', ({ goalId }) => {
      if (!goalId) return;
      socket.leave(`goal:${goalId}`);
      socket.to(`goal:${goalId}`).emit('goal:edit:peer-left', { userId });
    });

    socket.on('disconnect', () => {
      removeUserSocket(userId, socket.id);
      const ws = socket.data.workspaceId;
      if (ws) {
        // Only drop presence if this user has no other sockets in this ws
        const stillConnected = Array.from(io.sockets.sockets.values()).some(
          (s) => s.data.userId === userId && s.data.workspaceId === ws && s.id !== socket.id,
        );
        if (!stillConnected) {
          removePresence(ws, userId);
          io.to(`workspace:${ws}`).emit('presence:update', {
            workspaceId: ws,
            online: Array.from(workspacePresence.get(ws) || []),
          });
        }
      }
    });
  });

  return io;
}

/** Broadcast to everyone currently in a workspace room. */
export function broadcast(workspaceId, event, payload) {
  if (!io) return;
  io.to(`workspace:${workspaceId}`).emit(event, payload);
}

/** Push to a specific user's sockets (any workspace). */
export function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

export function getOnline(workspaceId) {
  return Array.from(workspacePresence.get(workspaceId) || []);
}
