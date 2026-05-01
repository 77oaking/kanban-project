import { prisma } from '../lib/prisma.js';

/**
 * Append-only audit logger. Failures here should never break the calling
 * request, so we swallow errors and console.warn instead.
 */
export async function writeAudit({ workspaceId, actorId, action, targetType, targetId, metadata }) {
  try {
    await prisma.auditLog.create({
      data: { workspaceId, actorId, action, targetType, targetId, metadata },
    });
  } catch (err) {
    console.warn('[audit] failed to write', action, err.message);
  }
}
