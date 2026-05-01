import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember, requirePerm } from '../middleware/workspace.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { writeAudit } from '../services/audit.js';
import { broadcast } from '../realtime/socket.js';

const router = express.Router({ mergeParams: true });
router.use(requireAuth, requireWorkspaceMember);

const Priority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
const ActionItemStatus = z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']);

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  goalId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  priority: Priority.optional(),
  status: ActionItemStatus.optional(),
  dueDate: z.string().datetime().optional().nullable(),
  position: z.number().int().optional(),
});

const updateSchema = createSchema.partial();

router.get('/', async (req, res, next) => {
  try {
    const items = await prisma.actionItem.findMany({
      where: { workspaceId: req.params.workspaceId },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        goal: { select: { id: true, title: true } },
      },
      orderBy: [{ status: 'asc' }, { position: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  requirePerm('canCreateActionItem'),
  validate({ body: createSchema }),
  async (req, res, next) => {
    try {
      const data = { ...req.body, workspaceId: req.params.workspaceId };
      if (data.dueDate) data.dueDate = new Date(data.dueDate);

      // If a goalId is given, verify it belongs to this workspace.
      if (data.goalId) {
        const g = await prisma.goal.findFirst({
          where: { id: data.goalId, workspaceId: req.params.workspaceId },
        });
        if (!g) throw new HttpError(400, 'goalId does not belong to this workspace');
      }

      // Auto-assign position at the end of the column.
      if (data.position == null) {
        const last = await prisma.actionItem.findFirst({
          where: { workspaceId: req.params.workspaceId, status: data.status || 'TODO' },
          orderBy: { position: 'desc' },
          select: { position: true },
        });
        data.position = (last?.position ?? -1) + 1;
      }

      const item = await prisma.actionItem.create({
        data,
        include: {
          assignee: { select: { id: true, name: true, avatarUrl: true } },
          goal: { select: { id: true, title: true } },
        },
      });
      await writeAudit({
        workspaceId: req.params.workspaceId,
        actorId: req.user.id,
        action: 'actionItem.created',
        targetType: 'ActionItem',
        targetId: item.id,
      });
      broadcast(req.params.workspaceId, 'actionItem:created', item);
      res.status(201).json({ item });
    } catch (err) {
      next(err);
    }
  },
);

router.patch('/:id', validate({ body: updateSchema }), async (req, res, next) => {
  try {
    const existing = await prisma.actionItem.findFirst({
      where: { id: req.params.id, workspaceId: req.params.workspaceId },
    });
    if (!existing) throw new HttpError(404, 'Action item not found');

    const data = { ...req.body };
    if (data.dueDate) data.dueDate = new Date(data.dueDate);
    if (data.status === 'DONE' && existing.status !== 'DONE') data.completedAt = new Date();
    if (data.status && data.status !== 'DONE') data.completedAt = null;

    const item = await prisma.actionItem.update({
      where: { id: existing.id },
      data,
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        goal: { select: { id: true, title: true } },
      },
    });
    await writeAudit({
      workspaceId: req.params.workspaceId,
      actorId: req.user.id,
      action: 'actionItem.updated',
      targetType: 'ActionItem',
      targetId: item.id,
      metadata: req.body,
    });
    broadcast(req.params.workspaceId, 'actionItem:updated', item);
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.actionItem.findFirst({
      where: { id: req.params.id, workspaceId: req.params.workspaceId },
    });
    if (!existing) throw new HttpError(404, 'Action item not found');
    await prisma.actionItem.delete({ where: { id: existing.id } });
    await writeAudit({
      workspaceId: req.params.workspaceId,
      actorId: req.user.id,
      action: 'actionItem.deleted',
      targetType: 'ActionItem',
      targetId: existing.id,
    });
    broadcast(req.params.workspaceId, 'actionItem:deleted', { id: existing.id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/**
 * Bulk reorder: accepts an array of { id, status, position } so the kanban
 * can persist drag-and-drop in a single round trip.
 */
router.post(
  '/reorder',
  validate({
    body: z.object({
      moves: z
        .array(
          z.object({
            id: z.string(),
            status: ActionItemStatus,
            position: z.number().int(),
          }),
        )
        .max(500),
    }),
  }),
  async (req, res, next) => {
    try {
      await prisma.$transaction(
        req.body.moves.map((m) =>
          prisma.actionItem.update({
            where: { id: m.id },
            data: { status: m.status, position: m.position },
          }),
        ),
      );
      broadcast(req.params.workspaceId, 'actionItem:reordered', { moves: req.body.moves });
      res.json({ ok: true, count: req.body.moves.length });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
