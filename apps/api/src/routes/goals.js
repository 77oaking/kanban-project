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

const GoalStatus = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'AT_RISK', 'COMPLETED']);

const goalCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional().nullable(),
  ownerId: z.string().min(1),
  dueDate: z.string().datetime().optional().nullable(),
  status: GoalStatus.optional(),
});

const goalUpdateSchema = goalCreateSchema.partial();

const milestoneSchema = z.object({
  title: z.string().min(1).max(200),
  progress: z.number().int().min(0).max(100).optional(),
  completed: z.boolean().optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

const updateBodySchema = z.object({ body: z.string().min(1).max(2000) });

// --- list / create
router.get('/', async (req, res, next) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { workspaceId: req.params.workspaceId },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        milestones: { orderBy: { createdAt: 'asc' } },
        _count: { select: { actionItems: true, updates: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ goals });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  requirePerm('canCreateGoal'),
  validate({ body: goalCreateSchema }),
  async (req, res, next) => {
    try {
      const goal = await prisma.goal.create({
        data: {
          workspaceId: req.params.workspaceId,
          title: req.body.title,
          description: req.body.description ?? null,
          ownerId: req.body.ownerId,
          dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
          status: req.body.status || 'NOT_STARTED',
        },
        include: { owner: { select: { id: true, name: true, avatarUrl: true } }, milestones: true },
      });
      await writeAudit({
        workspaceId: req.params.workspaceId,
        actorId: req.user.id,
        action: 'goal.created',
        targetType: 'Goal',
        targetId: goal.id,
      });
      broadcast(req.params.workspaceId, 'goal:created', goal);
      res.status(201).json({ goal });
    } catch (err) {
      next(err);
    }
  },
);

// --- single goal
router.get('/:goalId', async (req, res, next) => {
  try {
    const goal = await prisma.goal.findFirst({
      where: { id: req.params.goalId, workspaceId: req.params.workspaceId },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        milestones: { orderBy: { createdAt: 'asc' } },
        updates: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { author: { select: { id: true, name: true, avatarUrl: true } } },
        },
        actionItems: true,
      },
    });
    if (!goal) throw new HttpError(404, 'Goal not found');
    res.json({ goal });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/:goalId',
  requirePerm('canEditGoal'),
  validate({ body: goalUpdateSchema }),
  async (req, res, next) => {
    try {
      const data = { ...req.body };
      if (data.dueDate) data.dueDate = new Date(data.dueDate);
      if (data.dueDate === null) data.dueDate = null;

      const goal = await prisma.goal.update({
        where: { id: req.params.goalId },
        data,
        include: { owner: { select: { id: true, name: true, avatarUrl: true } }, milestones: true },
      });
      if (goal.workspaceId !== req.params.workspaceId) throw new HttpError(404, 'Goal not found');
      await writeAudit({
        workspaceId: req.params.workspaceId,
        actorId: req.user.id,
        action: 'goal.updated',
        targetType: 'Goal',
        targetId: goal.id,
        metadata: req.body,
      });
      broadcast(req.params.workspaceId, 'goal:updated', goal);
      res.json({ goal });
    } catch (err) {
      next(err);
    }
  },
);

router.delete('/:goalId', requirePerm('canDeleteGoal'), async (req, res, next) => {
  try {
    const goal = await prisma.goal.findFirst({
      where: { id: req.params.goalId, workspaceId: req.params.workspaceId },
    });
    if (!goal) throw new HttpError(404, 'Goal not found');
    await prisma.goal.delete({ where: { id: goal.id } });
    await writeAudit({
      workspaceId: req.params.workspaceId,
      actorId: req.user.id,
      action: 'goal.deleted',
      targetType: 'Goal',
      targetId: goal.id,
    });
    broadcast(req.params.workspaceId, 'goal:deleted', { id: goal.id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// --- milestones
router.post(
  '/:goalId/milestones',
  requirePerm('canEditGoal'),
  validate({ body: milestoneSchema }),
  async (req, res, next) => {
    try {
      const goal = await prisma.goal.findFirst({
        where: { id: req.params.goalId, workspaceId: req.params.workspaceId },
      });
      if (!goal) throw new HttpError(404, 'Goal not found');
      const milestone = await prisma.milestone.create({
        data: {
          ...req.body,
          dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
          goalId: goal.id,
        },
      });
      broadcast(req.params.workspaceId, 'milestone:created', { goalId: goal.id, milestone });
      res.status(201).json({ milestone });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:goalId/milestones/:milestoneId',
  requirePerm('canEditGoal'),
  validate({ body: milestoneSchema.partial() }),
  async (req, res, next) => {
    try {
      const milestone = await prisma.milestone.findUnique({
        where: { id: req.params.milestoneId },
      });
      if (!milestone || milestone.goalId !== req.params.goalId) {
        throw new HttpError(404, 'Milestone not found');
      }
      const data = { ...req.body };
      if (data.dueDate) data.dueDate = new Date(data.dueDate);
      const updated = await prisma.milestone.update({
        where: { id: milestone.id },
        data,
      });
      broadcast(req.params.workspaceId, 'milestone:updated', {
        goalId: req.params.goalId,
        milestone: updated,
      });
      res.json({ milestone: updated });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/:goalId/milestones/:milestoneId',
  requirePerm('canEditGoal'),
  async (req, res, next) => {
    try {
      await prisma.milestone.delete({ where: { id: req.params.milestoneId } });
      broadcast(req.params.workspaceId, 'milestone:deleted', {
        goalId: req.params.goalId,
        id: req.params.milestoneId,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);

// --- goal activity feed
router.post(
  '/:goalId/updates',
  validate({ body: updateBodySchema }),
  async (req, res, next) => {
    try {
      const goal = await prisma.goal.findFirst({
        where: { id: req.params.goalId, workspaceId: req.params.workspaceId },
      });
      if (!goal) throw new HttpError(404, 'Goal not found');
      const update = await prisma.goalUpdate.create({
        data: {
          goalId: goal.id,
          authorId: req.user.id,
          body: req.body.body,
        },
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      });
      broadcast(req.params.workspaceId, 'goal:update', { goalId: goal.id, update });
      res.status(201).json({ update });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
