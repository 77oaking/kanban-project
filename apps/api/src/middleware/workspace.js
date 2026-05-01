import { prisma } from '../lib/prisma.js';
import { HttpError } from './error.js';

/**
 * Loads the membership for the authenticated user in the route's :workspaceId
 * and attaches:
 *   req.workspace    → workspace row
 *   req.membership   → membership row including permission
 *   req.role         → 'ADMIN' | 'MEMBER'
 *   req.permissions  → resolved permission flags
 *
 * Resolution rule: an ADMIN's flags default to true unless explicitly overridden
 * in the Permission row. A MEMBER falls back to the Permission row defaults.
 */
export async function requireWorkspaceMember(req, _res, next) {
  try {
    const workspaceId = req.params.workspaceId;
    if (!workspaceId) return next(new HttpError(400, 'workspaceId required'));

    const membership = await prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.user.id } },
      include: {
        workspace: true,
        permission: true,
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
    if (!membership) return next(new HttpError(403, 'Not a member of this workspace'));

    req.workspace = membership.workspace;
    req.membership = membership;
    req.role = membership.role;
    req.permissions = resolvePermissions(membership);
    next();
  } catch (err) {
    next(err);
  }
}

export function resolvePermissions(membership) {
  const isAdmin = membership.role === 'ADMIN';
  const p = membership.permission || {};
  const def = (key, memberDefault) =>
    typeof p[key] === 'boolean' ? p[key] : isAdmin ? true : memberDefault;

  return {
    canCreateGoal: def('canCreateGoal', true),
    canEditGoal: def('canEditGoal', true),
    canDeleteGoal: def('canDeleteGoal', false),
    canCreateActionItem: def('canCreateActionItem', true),
    canPostAnnouncement: def('canPostAnnouncement', false),
    canPinAnnouncement: def('canPinAnnouncement', false),
    canInviteMember: def('canInviteMember', false),
    canManageMembers: def('canManageMembers', false),
    canExportData: def('canExportData', true),
  };
}

/**
 * Higher-order middleware: requirePerm('canPostAnnouncement') etc.
 * Must be used AFTER requireWorkspaceMember.
 */
export function requirePerm(permKey) {
  return (req, _res, next) => {
    if (!req.permissions) return next(new HttpError(500, 'requirePerm used without requireWorkspaceMember'));
    if (!req.permissions[permKey]) return next(new HttpError(403, `Missing permission: ${permKey}`));
    next();
  };
}

/** Admin-only gate (workspace admin, not user role). */
export function requireWorkspaceAdmin(req, _res, next) {
  if (req.role !== 'ADMIN') return next(new HttpError(403, 'Admin only'));
  next();
}
