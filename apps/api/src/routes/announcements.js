import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember, requirePerm } from '../middleware/workspace.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { writeAudit } from '../services/audit.js';
import { broadcast, emitToUser } from '../realtime/socket.js';
import { sanitizeHtml } from '../lib/sanitize.js';
import { sendMentionEmail } from '../services/email.js';

const router = express.Router({ mergeParams: true });
router.use(requireAuth, requireWorkspaceMember);

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(20000), // HTML
  pinned: z.boolean().optional(),
});

const reactionSchema = z.object({ emoji: z.string().min(1).max(16) });
const commentSchema = z.object({ body: z.string().min(1).max(2000) });

router.get('/', async (req, res, next) => {
  try {
    const list = await prisma.announcement.findMany({
      where: { workspaceId: req.params.workspaceId },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        reactions: { include: { user: { select: { id: true, name: true } } } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ announcements: list });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  requirePerm('canPostAnnouncement'),
  validate({ body: createSchema }),
  async (req, res, next) => {
    try {
      const ann = await prisma.announcement.create({
        data: {
          workspaceId: req.params.workspaceId,
          authorId: req.user.id,
          title: req.body.title,
          body: sanitizeHtml(req.body.body),
          pinned: req.body.pinned || false,
        },
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      });
      await writeAudit({
        workspaceId: req.params.workspaceId,
        actorId: req.user.id,
        action: 'announcement.created',
        targetType: 'Announcement',
        targetId: ann.id,
      });
      broadcast(req.params.workspaceId, 'announcement:created', ann);
      res.status(201).json({ announcement: ann });
    } catch (err) {
      next(err);
    }
  },
);

router.patch('/:id', validate({ body: createSchema.partial() }), async (req, res, next) => {
  try {
    const ann = await prisma.announcement.findFirst({
      where: { id: req.params.id, workspaceId: req.params.workspaceId },
    });
    if (!ann) throw new HttpError(404, 'Announcement not found');

    // Only the author or workspace admins can edit body/title; pin requires
    // canPinAnnouncement.
    const isAuthor = ann.authorId === req.user.id;
    if (!isAuthor && req.role !== 'ADMIN') throw new HttpError(403, 'Cannot edit');
    if ('pinned' in req.body && !req.permissions.canPinAnnouncement) {
      throw new HttpError(403, 'Missing permission: canPinAnnouncement');
    }

    const data = { ...req.body };
    if (data.body) data.body = sanitizeHtml(data.body);

    const updated = await prisma.announcement.update({
      where: { id: ann.id },
      data,
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
    await writeAudit({
      workspaceId: req.params.workspaceId,
      actorId: req.user.id,
      action: 'announcement.updated',
      targetType: 'Announcement',
      targetId: ann.id,
      metadata: req.body,
    });
    broadcast(req.params.workspaceId, 'announcement:updated', updated);
    res.json({ announcement: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const ann = await prisma.announcement.findFirst({
      where: { id: req.params.id, workspaceId: req.params.workspaceId },
    });
    if (!ann) throw new HttpError(404, 'Announcement not found');
    if (ann.authorId !== req.user.id && req.role !== 'ADMIN') {
      throw new HttpError(403, 'Cannot delete');
    }
    await prisma.announcement.delete({ where: { id: ann.id } });
    broadcast(req.params.workspaceId, 'announcement:deleted', { id: ann.id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// --- reactions
router.post(
  '/:id/reactions',
  validate({ body: reactionSchema }),
  async (req, res, next) => {
    try {
      const ann = await prisma.announcement.findFirst({
        where: { id: req.params.id, workspaceId: req.params.workspaceId },
      });
      if (!ann) throw new HttpError(404, 'Announcement not found');

      // Toggle: if (announcement, user, emoji) exists, remove; else create.
      const existing = await prisma.reaction.findUnique({
        where: {
          announcementId_userId_emoji: {
            announcementId: ann.id,
            userId: req.user.id,
            emoji: req.body.emoji,
          },
        },
      });
      let reaction = null;
      if (existing) {
        await prisma.reaction.delete({ where: { id: existing.id } });
      } else {
        reaction = await prisma.reaction.create({
          data: {
            announcementId: ann.id,
            userId: req.user.id,
            emoji: req.body.emoji,
          },
          include: { user: { select: { id: true, name: true } } },
        });
      }
      broadcast(req.params.workspaceId, 'announcement:reaction', {
        announcementId: ann.id,
        userId: req.user.id,
        emoji: req.body.emoji,
        added: !existing,
      });
      res.json({ reaction, added: !existing });
    } catch (err) {
      next(err);
    }
  },
);

// --- comments (with @mention parsing)
router.get('/:id/comments', async (req, res, next) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { announcementId: req.params.id },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ comments });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:id/comments',
  validate({ body: commentSchema }),
  async (req, res, next) => {
    try {
      const ann = await prisma.announcement.findFirst({
        where: { id: req.params.id, workspaceId: req.params.workspaceId },
      });
      if (!ann) throw new HttpError(404, 'Announcement not found');

      const comment = await prisma.comment.create({
        data: {
          announcementId: ann.id,
          authorId: req.user.id,
          body: req.body.body,
        },
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      });

      // Parse @mentions of the form @name (matched loosely on name) and create
      // notifications for any matching workspace members.
      const mentionRegex = /@([\w\-.]{2,40})/g;
      const handles = Array.from(req.body.body.matchAll(mentionRegex)).map((m) => m[1].toLowerCase());
      if (handles.length) {
        const members = await prisma.membership.findMany({
          where: { workspaceId: req.params.workspaceId },
          include: { user: true },
        });
        const matched = members.filter(
          (m) =>
            m.userId !== req.user.id &&
            handles.some(
              (h) =>
                m.user.name.toLowerCase().replaceAll(' ', '') === h ||
                m.user.email.split('@')[0].toLowerCase() === h,
            ),
        );
        if (matched.length) {
          const notifs = await prisma.$transaction(
            matched.map((m) =>
              prisma.notification.create({
                data: {
                  recipientId: m.userId,
                  workspaceId: req.params.workspaceId,
                  type: 'MENTION',
                  title: `${comment.author.name} mentioned you`,
                  body: req.body.body.slice(0, 200),
                  link: `/w/${req.params.workspaceId}/announcements/${ann.id}`,
                },
              }),
            ),
          );
          notifs.forEach((n) => emitToUser(n.recipientId, 'notification:new', n));

          // Fire-and-forget mention emails (one per mentioned member).
          const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
          for (const m of matched) {
            sendMentionEmail({
              to: m.user.email,
              mentionerName: comment.author.name,
              workspaceName: req.workspace.name,
              snippet: req.body.body.slice(0, 200),
              link: `${clientUrl}/announcements`,
            }).catch(() => {});
          }
        }
      }

      broadcast(req.params.workspaceId, 'announcement:comment', {
        announcementId: ann.id,
        comment,
      });
      res.status(201).json({ comment });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
