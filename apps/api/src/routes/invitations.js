import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { writeAudit } from '../services/audit.js';

const router = express.Router();
router.use(requireAuth);

const acceptSchema = z.object({ token: z.string().min(8) });

/**
 * @openapi
 * /api/invitations/accept:
 *   post:
 *     tags: [Members]
 *     summary: Accept an invitation by token (resolves workspace server-side)
 */
router.post('/accept', validate({ body: acceptSchema }), async (req, res, next) => {
  try {
    const invite = await prisma.invitation.findUnique({ where: { token: req.body.token } });
    if (!invite) throw new HttpError(404, 'Invitation not found');
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
        // No permission row by default — see workspaces.js for rationale.
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

    res.json({ workspaceId: invite.workspaceId, membership });
  } catch (err) {
    next(err);
  }
});

export default router;
