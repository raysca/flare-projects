import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { invitations, projectMembers, projects, users } from '@linearflow/database';
import { eq, and } from 'drizzle-orm';
import type { Env } from '../lib/app';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<Env>();

const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

const createInvitationSchema = z.object({
  projectId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'guest']).default('member'),
});

/**
 * POST /invitations
 * Create a new invitation
 */
app.post('/', authMiddleware, zValidator('json', createInvitationSchema), async (c) => {
  const user = c.get('user')!;
  const { projectId, email, role } = c.req.valid('json');
  const db = c.get('db');

  const [member] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)));

  if (!member) {
    return c.json({ error: 'Access denied' }, 403);
  }

  const [targetUser] = await db.select().from(users).where(eq(users.email, email));
  if (targetUser) {
    const [existingMember] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, targetUser.id)));

    if (existingMember) {
      return c.json({ error: 'User is already a member of this project' }, 400);
    }
  }

  const expireDate = new Date();
  expireDate.setDate(expireDate.getDate() + 7);

  const token = crypto.randomUUID();
  const id = crypto.randomUUID();

  await db.insert(invitations).values({
    id,
    projectId,
    email,
    role,
    token,
    invitedBy: user.id,
    expiresAt: expireDate,
  });

  const [newInvitation] = await db.select().from(invitations).where(eq(invitations.id, id));

  return c.json(newInvitation, 201);
});

/**
 * POST /invitations/accept
 * Accept an invitation token
 */
app.post('/accept', authMiddleware, zValidator('json', acceptInvitationSchema), async (c) => {
  const user = c.get('user')!;
  const { token } = c.req.valid('json');
  const db = c.get('db');

  const [invitation] = await db.select().from(invitations).where(eq(invitations.token, token));

  if (!invitation) {
    return c.json({ error: 'Invalid invitation' }, 404);
  }

  if (invitation.status !== 'pending') {
    return c.json({ error: 'Invitation is no longer valid' }, 400);
  }

  if (new Date() > invitation.expiresAt) {
    await db.update(invitations).set({ status: 'expired' }).where(eq(invitations.id, invitation.id));
    return c.json({ error: 'Invitation is expired' }, 400);
  }

  if (invitation.email !== user.email) {
    return c.json({ error: 'This invitation was sent to a different email address.' }, 403);
  }

  const [existingMember] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, invitation.projectId), eq(projectMembers.userId, user.id)));

  if (existingMember) {
    await db.update(invitations).set({ status: 'accepted' }).where(eq(invitations.id, invitation.id));
    return c.json({ message: 'Already a member of this project' });
  }

  await db.insert(projectMembers).values({
    projectId: invitation.projectId,
    userId: user.id,
    role: invitation.role,
  });

  await db.update(invitations).set({ status: 'accepted' }).where(eq(invitations.id, invitation.id));

  const [project] = await db.select().from(projects).where(eq(projects.id, invitation.projectId));

  return c.json({
    message: 'Invitation accepted',
    project,
  });
});

export default app;
