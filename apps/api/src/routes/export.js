import express from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember, requirePerm } from '../middleware/workspace.js';

const router = express.Router({ mergeParams: true });
router.use(requireAuth, requireWorkspaceMember, requirePerm('canExportData'));

function csvEscape(value) {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function toCsv(rows, columns) {
  const header = columns.map((c) => csvEscape(c.header)).join(',');
  const body = rows
    .map((r) => columns.map((c) => csvEscape(c.get(r))).join(','))
    .join('\n');
  return `${header}\n${body}\n`;
}

/**
 * @openapi
 * /api/workspaces/{workspaceId}/export:
 *   get:
 *     tags: [Analytics]
 *     summary: Export workspace data as a multi-section CSV bundle
 */
router.get('/', async (req, res, next) => {
  try {
    const wsId = req.params.workspaceId;
    const [workspace, goals, actionItems, announcements] = await Promise.all([
      prisma.workspace.findUnique({ where: { id: wsId } }),
      prisma.goal.findMany({
        where: { workspaceId: wsId },
        include: { owner: true, milestones: true },
      }),
      prisma.actionItem.findMany({
        where: { workspaceId: wsId },
        include: { assignee: true, goal: true },
      }),
      prisma.announcement.findMany({
        where: { workspaceId: wsId },
        include: { author: true },
      }),
    ]);

    const goalsCsv = toCsv(goals, [
      { header: 'id', get: (g) => g.id },
      { header: 'title', get: (g) => g.title },
      { header: 'status', get: (g) => g.status },
      { header: 'owner', get: (g) => g.owner.name },
      { header: 'dueDate', get: (g) => g.dueDate?.toISOString() ?? '' },
      { header: 'milestoneCount', get: (g) => g.milestones.length },
    ]);

    const itemsCsv = toCsv(actionItems, [
      { header: 'id', get: (i) => i.id },
      { header: 'title', get: (i) => i.title },
      { header: 'status', get: (i) => i.status },
      { header: 'priority', get: (i) => i.priority },
      { header: 'assignee', get: (i) => i.assignee?.name ?? '' },
      { header: 'goal', get: (i) => i.goal?.title ?? '' },
      { header: 'dueDate', get: (i) => i.dueDate?.toISOString() ?? '' },
      { header: 'completedAt', get: (i) => i.completedAt?.toISOString() ?? '' },
    ]);

    const annsCsv = toCsv(announcements, [
      { header: 'id', get: (a) => a.id },
      { header: 'title', get: (a) => a.title },
      { header: 'author', get: (a) => a.author.name },
      { header: 'pinned', get: (a) => a.pinned },
      { header: 'createdAt', get: (a) => a.createdAt.toISOString() },
    ]);

    const out =
      `# Workspace: ${workspace?.name ?? wsId}\n# Exported: ${new Date().toISOString()}\n\n` +
      `## Goals\n${goalsCsv}\n## Action Items\n${itemsCsv}\n## Announcements\n${annsCsv}`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${(workspace?.name ?? 'workspace').replaceAll(/[^a-z0-9]/gi, '_')}-export.csv"`,
    );
    res.send(out);
  } catch (err) {
    next(err);
  }
});

export default router;
