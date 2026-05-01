import express from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember } from '../middleware/workspace.js';

const router = express.Router({ mergeParams: true });
router.use(requireAuth, requireWorkspaceMember);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/stats:
 *   get:
 *     tags: [Analytics]
 *     summary: Dashboard stats — totals, this-week completions, overdue, chart series
 */
router.get('/', async (req, res, next) => {
  try {
    const wsId = req.params.workspaceId;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalGoals, goalsByStatus, completedThisWeek, overdueItems, members, recentCompletions] =
      await Promise.all([
        prisma.goal.count({ where: { workspaceId: wsId } }),
        prisma.goal.groupBy({
          by: ['status'],
          where: { workspaceId: wsId },
          _count: { _all: true },
        }),
        prisma.actionItem.count({
          where: { workspaceId: wsId, status: 'DONE', completedAt: { gte: weekAgo } },
        }),
        prisma.actionItem.count({
          where: {
            workspaceId: wsId,
            status: { not: 'DONE' },
            dueDate: { lt: now, not: null },
          },
        }),
        prisma.membership.count({ where: { workspaceId: wsId } }),
        // Build a 30-day series for the goal-completion chart.
        prisma.actionItem.findMany({
          where: { workspaceId: wsId, status: 'DONE', completedAt: { gte: monthAgo } },
          select: { completedAt: true },
        }),
      ]);

    // Bucket by ISO date (YYYY-MM-DD) for the last 30 days, dense.
    const buckets = new Map();
    for (let d = new Date(monthAgo); d <= now; d.setDate(d.getDate() + 1)) {
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const row of recentCompletions) {
      const key = row.completedAt?.toISOString().slice(0, 10);
      if (key && buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
    }
    const completionSeries = Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));

    res.json({
      totals: {
        goals: totalGoals,
        members,
        completedThisWeek,
        overdue: overdueItems,
      },
      goalsByStatus: Object.fromEntries(goalsByStatus.map((g) => [g.status, g._count._all])),
      completionSeries,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
