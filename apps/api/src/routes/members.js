import express from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import {
  requireWorkspaceMember,
  requirePerm,
  resolvePermissions,
} from '../middleware/workspace.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { writeAudit } from '../services/audit.js';
import { sendInvitationEmail } from '../services/email.js';

// `mergeParams: true` so we can read :workspaceId from the parent path.
const router = express.Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceMember);

const inviteSchema = z.object({
  email: z.string().email().toLowerCase(),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

const updateMemberSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']).optional(),
  permissions: z
    .object({
      canCreateGoal: z.boolean().optional(),
      canEditGoal: z.boolean().optional(),
      canDeleteGoal: z.boolean().optional(),
      canCreateActionItem: z.boolean().optional(),
      canPostAnnouncement: z.boolean().optional(),
      canPinAnnouncement: z.boolean().optional(),
      canInviteMember: z.boolean().optional(),
      canManageMembers: z.boolean().optional(),
      canExportData: z.boolean().optional(),
    })
    .optional(),
});

/**
 * @openapi
 * /api/workspaces/{workspaceId}/members:
 *   get:
 *     tags: [Members]
 *     summary: List members and resolved permissions
 */
router.get('/', async (req, res, next) => {
  try {
    const memberships = await prisma.membership.findMany({
      where: { workspaceId: req.params.workspaceId },
      include: { user: true, permission: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({
      members: memberships.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        user: { id: m.user.id, email: m.user.email, name: m.user.name, avatarUrl: m.user.avatarUrl },
        permissions: resolvePermissions(m),
        joinedAt: m.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/workspaces/{workspaceId}/members/invitations:
 *   post:
 *     tags: [Members]
 *     summary: Invite a member by email (returns invite token; deliver via your email service)
 */
router.post(
  '/invitations',
  requirePerm('canInviteMember'),
  validate({ body: inviteSchema }),
  async (req, res, next) => {
    try {
      const { email, role } = req.body;

      // If they already have an account AND are already a member, short-circuit.
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        const existingMembership = await prisma.membership.findUnique({
          where: { workspaceId_userId: { workspaceId: req.params.workspaceId, userId: existingUser.id } },
        });
        if (existingMembership) throw new HttpError(409, 'User is already a member');
      }

      const token = crypto.randomBytes(24).toString('hex');
      const invite = await prisma.invitation.create({
        data: {
          workspaceId: req.params.workspaceId,
          email,
          role,
          token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      await writeAudit({
        workspaceId: req.params.workspaceId,
        actorId: req.user.id,
        action: 'member.invited',
        targetType: 'Invitation',
        targetId: invite.id,
        metadata: { email, role },
      });

      // Deliverable URL — the frontend renders /accept-invite?token=…
      const acceptUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/accept-invite?token=${token}`;

      // Fire-and-forget email. We do NOT await — invitation creation should
      // not stall on a slow SMTP server, and the API still returns the URL
      // so the UI can show it as a fallback.
      sendInvitationEmail({
        to: email,
        inviterName: req.membership?.user?.name || 'A teammate',
        workspaceName: req.workspace.name,
        acceptUrl,
      }).catch(() => {});

      res.status(201).json({ invitation: { ...invite, acceptUrl } });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/members/invitations/accept:
 *   post:
 *     tags: [Members]
 *     summary: Accept an invitation (logged-in user; email must match invite)
 */
router.post('/invitations/accept', async (req, res, next) => {
  try {
    const { token } = req.body || {};
    if (!token) throw new HttpError(400, 'token required');

    const invite = await prisma.invitation.findUnique({ where: { token } });
    if (!invite || invite.workspaceId !== req.params.workspaceId) {
      throw new HttpError(404, 'Invitation not found');
    }
    if (invite.acceptedAt) throw new HttpError(409, 'Invitation already accepted');
    if (invite.expiresAt < new Date()) throw new HttpError(410, 'Invitation expired');

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new HttpError(403, 'Invitation email does not match the logged-in user');
    }

    const membership = await prisma.membership.upsert({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: user.id } },
      update: { role: invite.role },
      create: {
        workspaceId: invite.workspaceId,
        userId: user.id,
        role: invite.role,
        permission: { create: {} },
      },
    });
    await prisma.invitation.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
    await writeAudit({
      workspaceId: invite.workspaceId,
      actorId: user.id,
      action: 'member.joined',
      targetType: 'Membership',
      targetId: membership.id,
    });

    res.json({ membership });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/workspaces/{workspaceId}/members/{membershipId}:
 *   patch:
 *     tags: [Members]
 *     summary: Update a member's role or per-flag permissions
 */
router.patch(
  '/:membershipId',
  requirePerm('canManageMembers'),
  validate({ body: updateMemberSchema }),
  async (req, res, next) => {
    try {
      const { membershipId } = req.params;
      const target = await prisma.membership.findUnique({
        where: { id: membershipId },
        include: { permission: true },
      });
      if (!target || target.workspaceId !== req.params.workspaceId) {
        throw new HttpError(404, 'Member not found');
      }

      const data = {};
      if (req.body.role) data.role = req.body.role;

      const updated = await prisma.membership.update({
        where: { id: membershipId },
        data: {
          ...data,
          permission: req.body.permissions
            ? {
                upsert: {
                  create: req.body.permissions,
                  update: req.body.permissions,
                },
              }
            : undefined,
        },
        include: { permission: true, user: true },
      });
      await writeAudit({
        workspaceId: req.params.workspaceId,
        actorId: req.user.id,
        action: 'member.updated',
        targetType: 'Membership',
        targetId: membershipId,
        metadata: req.body,
      });
      res.json({
        member: {
          id: updated.id,
          userId: updated.userId,
          role: updated.role,
          user: {
            id: updated.user.id,
            email: updated.user.email,
            name: updated.user.name,
            avatarUrl: updated.user.avatarUrl,
          },
          permissions: resolvePermissions(updated),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/members/{membershipId}:
 *   delete:
 *     tags: [Members]
 *     summary: Remove a member from the workspace
 */
router.delete('/:membershipId', requirePerm('canManageMembers'), async (req, res, next) => {
  try {
    const target = await prisma.membership.findUnique({ where: { id: req.params.membershipId } });
    if (!target || target.workspaceId !== req.params.workspaceId) {
      throw new HttpError(404, 'Member not found');
    }
    if (target.userId === req.workspace.ownerId) {
      throw new HttpError(400, 'Cannot remove the workspace owner');
    }
    await prisma.membership.delete({ where: { id: target.id } });
    await writeAudit({
      workspaceId: req.params.workspaceId,
      actorId: req.user.id,
      action: 'member.removed',
      targetType: 'Membership',
      targetId: target.id,
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
