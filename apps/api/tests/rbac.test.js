import { resolvePermissions } from '../src/middleware/workspace.js';

describe('resolvePermissions', () => {
  test('admin defaults to true on every flag when no override', () => {
    const m = { role: 'ADMIN', permission: null };
    const p = resolvePermissions(m);
    expect(p.canCreateGoal).toBe(true);
    expect(p.canDeleteGoal).toBe(true);
    expect(p.canPostAnnouncement).toBe(true);
    expect(p.canInviteMember).toBe(true);
  });

  test('admin can be downgraded with explicit false', () => {
    const m = { role: 'ADMIN', permission: { canDeleteGoal: false, canInviteMember: false } };
    const p = resolvePermissions(m);
    expect(p.canDeleteGoal).toBe(false);
    expect(p.canInviteMember).toBe(false);
    // Untouched flags remain admin-default true
    expect(p.canCreateGoal).toBe(true);
  });

  test('member uses schema defaults when permission row absent', () => {
    const m = { role: 'MEMBER', permission: null };
    const p = resolvePermissions(m);
    expect(p.canCreateGoal).toBe(true);
    expect(p.canPostAnnouncement).toBe(false); // member default
    expect(p.canDeleteGoal).toBe(false);
    expect(p.canInviteMember).toBe(false);
    expect(p.canExportData).toBe(true);
  });

  test('member can be elevated per-flag', () => {
    const m = { role: 'MEMBER', permission: { canPostAnnouncement: true, canPinAnnouncement: true } };
    const p = resolvePermissions(m);
    expect(p.canPostAnnouncement).toBe(true);
    expect(p.canPinAnnouncement).toBe(true);
    // Other member defaults still apply
    expect(p.canInviteMember).toBe(false);
  });

  test('explicit false overrides member default true', () => {
    const m = { role: 'MEMBER', permission: { canCreateGoal: false } };
    const p = resolvePermissions(m);
    expect(p.canCreateGoal).toBe(false);
  });
});
