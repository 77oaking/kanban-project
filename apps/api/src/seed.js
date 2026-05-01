/**
 * Seed script — idempotent.
 * - Creates demo + 3 teammates
 * - Creates a sample workspace, makes demo the ADMIN
 * - Adds goals, milestones, action items, and an announcement so the
 *   dashboard isn't empty on first login
 *
 * Pass `--if-empty` to no-op when the User table already has rows (Railway
 * `start` script does this so deploys don't reseed every restart).
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@fredocloud.test';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

async function main() {
  const ifEmpty = process.argv.includes('--if-empty');
  if (ifEmpty) {
    const count = await prisma.user.count();
    if (count > 0) {
      console.log('[seed] users already exist, skipping');
      return;
    }
  }

  console.log('[seed] starting…');

  const hash = (pw) => bcrypt.hash(pw, 12);
  const [demoHash, teamHash] = await Promise.all([hash(DEMO_PASSWORD), hash('Password1!')]);

  const demo = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: 'Demo Admin',
      passwordHash: demoHash,
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
    },
  });

  const teammates = await Promise.all(
    [
      { email: 'alex@fredocloud.test', name: 'Alex Rivera' },
      { email: 'sam@fredocloud.test', name: 'Sam Chen' },
      { email: 'priya@fredocloud.test', name: 'Priya Nair' },
    ].map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          ...u,
          passwordHash: teamHash,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`,
        },
      }),
    ),
  );

  // Workspace
  const workspace = await prisma.workspace.upsert({
    where: { id: 'seed-workspace-1' },
    update: {},
    create: {
      id: 'seed-workspace-1',
      name: 'FredoCloud HQ',
      description: 'Primary workspace seeded for the demo account',
      accentColor: '#7A1F2B',
      ownerId: demo.id,
    },
  });

  // Memberships — demo as ADMIN, others as MEMBER
  await prisma.membership.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: demo.id } },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: demo.id,
      role: 'ADMIN',
      permission: { create: {} },
    },
  });
  for (const t of teammates) {
    await prisma.membership.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: t.id } },
      update: {},
      create: {
        workspaceId: workspace.id,
        userId: t.id,
        role: 'MEMBER',
        permission: {
          create: {
            // Sam can post announcements as a demo of the RBAC matrix
            canPostAnnouncement: t.email === 'sam@fredocloud.test',
          },
        },
      },
    });
  }

  // Goals (idempotent via stable id)
  const goal1 = await prisma.goal.upsert({
    where: { id: 'seed-goal-1' },
    update: {},
    create: {
      id: 'seed-goal-1',
      workspaceId: workspace.id,
      title: 'Ship v1 of the Team Hub',
      description:
        'Deliver the MVP of the Collaborative Team Hub: auth, workspaces, goals, announcements, action items, real-time updates.',
      ownerId: demo.id,
      dueDate: new Date(Date.now() + 14 * 86400_000),
      status: 'IN_PROGRESS',
      milestones: {
        create: [
          { title: 'Auth + workspace scaffold', progress: 100, completed: true },
          { title: 'Goals & action items', progress: 70 },
          { title: 'Realtime + analytics', progress: 30 },
        ],
      },
    },
  });

  await prisma.goal.upsert({
    where: { id: 'seed-goal-2' },
    update: {},
    create: {
      id: 'seed-goal-2',
      workspaceId: workspace.id,
      title: 'Reach 100 weekly active users',
      ownerId: teammates[0].id,
      dueDate: new Date(Date.now() + 60 * 86400_000),
      status: 'NOT_STARTED',
      milestones: {
        create: [
          { title: 'Onboarding flow polished', progress: 0 },
          { title: 'First marketing post', progress: 0 },
        ],
      },
    },
  });

  // Action items
  const actionItems = [
    { title: 'Wire Recharts on dashboard', status: 'IN_PROGRESS', priority: 'HIGH', assigneeId: demo.id },
    { title: 'Design empty states', status: 'TODO', priority: 'MEDIUM', assigneeId: teammates[1].id },
    { title: 'Set up Cloudinary uploads', status: 'IN_REVIEW', priority: 'HIGH', assigneeId: teammates[2].id },
    {
      title: 'Write README with deploy steps',
      status: 'DONE',
      priority: 'LOW',
      assigneeId: demo.id,
      completedAt: new Date(Date.now() - 2 * 86400_000),
    },
    { title: 'Audit log filter UI', status: 'TODO', priority: 'LOW', assigneeId: teammates[0].id },
  ];
  for (let i = 0; i < actionItems.length; i++) {
    const a = actionItems[i];
    await prisma.actionItem.upsert({
      where: { id: `seed-action-${i + 1}` },
      update: {},
      create: {
        id: `seed-action-${i + 1}`,
        workspaceId: workspace.id,
        goalId: goal1.id,
        title: a.title,
        status: a.status,
        priority: a.priority,
        assigneeId: a.assigneeId,
        position: i,
        completedAt: a.completedAt ?? null,
        dueDate: new Date(Date.now() + (i - 1) * 3 * 86400_000),
      },
    });
  }

  // Announcement
  await prisma.announcement.upsert({
    where: { id: 'seed-announcement-1' },
    update: {},
    create: {
      id: 'seed-announcement-1',
      workspaceId: workspace.id,
      authorId: demo.id,
      title: 'Welcome to FredoCloud Team Hub',
      body:
        '<p>Hey team — this is your collaborative hub. <strong>Pinned</strong> announcements stay at the top.</p><p>Try reacting with an emoji or leaving a comment below.</p>',
      pinned: true,
    },
  });

  // Goal update / activity feed entry
  await prisma.goalUpdate.upsert({
    where: { id: 'seed-update-1' },
    update: {},
    create: {
      id: 'seed-update-1',
      goalId: goal1.id,
      authorId: demo.id,
      body: 'Auth and core CRUD landed. Realtime layer next.',
    },
  });

  console.log('[seed] done');
  console.log(`[seed] login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error('[seed] failed', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
