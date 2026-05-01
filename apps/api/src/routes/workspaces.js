import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember, requireWorkspaceAdmin } from '../middleware/workspace.js';
import { validate } from '../middleware/validate.js';
import { writeAudit } from '../services/audit.js';

const router = express.Router();

router.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

const updateSchema = createSchema.partial();

/**
 * @openapi
 * /api/workspaces:
 *   get:
 *     tags: [Workspaces]
 *     summary: List workspaces the current user belongs to
 */
router.get('/', async (req, res, next) => {
  try {
    const memberships = await prisma.membership.findMany({
      where: { userId: req.user.id },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({
      workspaces: memberships.map((m) => ({ ...m.workspace, role: m.role })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/workspaces:
 *   post:
 *     tags: [Workspaces]
 *     summary: Create a workspace; the creator becomes ADMIN
 */
router.post('/', validate({ body: createSchema }), async (req, res, next) => {
  try {
    const workspace = await prisma.workspace.create({
      data: {
        ...req.body,
        ownerId: req.user.id,
        memberships: {
          create: {
            userId: req.user.id,
            role: 'ADMIN',
            permission: { create: {} }, // defaults
          },
        },
      },
    });
    await writeAudit({
      workspaceId: workspace.id,
      actorId: req.user.id,
      action: 'workspace.created',
      targetType: 'Workspace',
      targetId: workspace.id,
    });
    res.status(201).json({ workspace });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/workspaces/{workspaceId}:
 *   get:
 *     tags: [Workspaces]
 *     summary: Get a workspace by id
 */
router.get('/:workspaceId', requireWorkspaceMember, async (req, res) => {
  res.json({
    workspace: req.workspace,
    role: req.role,
    permissions: req.permissions,
  });
});

/**
 * @openapi
 * /api/workspaces/{workspaceId}:
 *   patch:
 *     tags: [Workspaces]
 *     summary: Update workspace metadata (admin only)
 */
router.patch(
  '/:workspaceId',
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  validate({ body: updateSchema }),
  async (req, res, next) => {
    try {
      const workspace = await prisma.workspace.update({
        where: { id: req.params.workspaceId },
        data: req.body,
      });
      await writeAudit({
        workspaceId: workspace.id,
        actorId: req.user.id,
        action: 'workspace.updated',
        targetType: 'Workspace',
        targetId: workspace.id,
        metadata: req.body,
      });
      res.json({ workspace });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}:
 *   delete:
 *     tags: [Workspaces]
 *     summary: Delete a workspace (owner only)
 */
router.delete(
  '/:workspaceId',
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  async (req, res, next) => {
    try {
      // Only the owner can hard-delete to avoid an admin nuking another admin's
      // workspace.
      if (req.workspace.ownerId !== req.user.id) {
        return res.status(403).json({ error: 'Only the owner can delete the workspace' });
      }
      await prisma.workspace.delete({ where: { id: req.params.workspaceId } });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);

export default router;
