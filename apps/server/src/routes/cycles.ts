import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { cycles, projectMembers, issues } from '@linearflow/database';
import { eq, and, desc } from 'drizzle-orm';
import type { Env } from '../lib/app';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<Env>();

app.use('*', authMiddleware);

const createCycleSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  autoArchive: z.boolean().default(true),
});

const updateCycleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['upcoming', 'active', 'completed']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  autoArchive: z.boolean().optional(),
  progress: z.number().min(0).max(100).optional(),
});

/**
 * GET /cycles
 * List cycles for a project
 */
app.get('/', async (c) => {
  const user = c.get('user')!;
  const projectId = c.req.query('projectId');
  const status = c.req.query('status');
  const db = c.get('db');

  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  const [member] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)));

  if (!member) {
    return c.json({ error: 'Access denied' }, 403);
  }

  let query = db.select().from(cycles).where(eq(cycles.projectId, projectId));

  if (status) {
    query = db
      .select()
      .from(cycles)
      .where(and(eq(cycles.projectId, projectId), eq(cycles.status, status as 'upcoming' | 'active' | 'completed')));
  }

  const result = await query.orderBy(desc(cycles.startDate));

  return c.json(result);
});

/**
 * POST /cycles
 * Create a new cycle
 */
app.post('/', zValidator('json', createCycleSchema), async (c) => {
  const user = c.get('user')!;
  const data = c.req.valid('json');
  const db = c.get('db');

  const [member] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, data.projectId), eq(projectMembers.userId, user.id)));

  if (!member) {
    return c.json({ error: 'Access denied' }, 403);
  }

  const cycleId = crypto.randomUUID();

  const countResult = await db
    .select({ id: cycles.id })
    .from(cycles)
    .where(eq(cycles.projectId, data.projectId));

  const nextNumber = countResult.length + 1;

  const now = new Date();
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  let status: 'upcoming' | 'active' | 'completed' = 'upcoming';

  if (now >= start && now <= end) {
    status = 'active';
  } else if (now > end) {
    status = 'completed';
  }

  await db.insert(cycles).values({
    id: cycleId,
    ...data,
    startDate: start,
    endDate: end,
    number: nextNumber,
    status,
  });

  const [newCycle] = await db.select().from(cycles).where(eq(cycles.id, cycleId));

  return c.json(newCycle, 201);
});

/**
 * GET /cycles/:id
 * Get cycle details
 */
app.get('/:id', async (c) => {
  const cycleId = c.req.param('id');
  const user = c.get('user')!;
  const db = c.get('db');

  const [cycle] = await db.select().from(cycles).where(eq(cycles.id, cycleId));

  if (!cycle) {
    return c.json({ error: 'Cycle not found' }, 404);
  }

  const [member] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, cycle.projectId), eq(projectMembers.userId, user.id)));

  if (!member) {
    return c.json({ error: 'Access denied' }, 403);
  }

  return c.json(cycle);
});

/**
 * GET /cycles/:id/stats
 * Get cycle with issue statistics
 */
app.get('/:id/stats', async (c) => {
  const cycleId = c.req.param('id');
  const user = c.get('user')!;
  const db = c.get('db');

  const [cycle] = await db.select().from(cycles).where(eq(cycles.id, cycleId));

  if (!cycle) {
    return c.json({ error: 'Cycle not found' }, 404);
  }

  const [member] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, cycle.projectId), eq(projectMembers.userId, user.id)));

  if (!member) {
    return c.json({ error: 'Access denied' }, 403);
  }

  const cycleIssues = await db.select({ status: issues.status }).from(issues).where(eq(issues.cycleId, cycleId));

  const totalIssues = cycleIssues.length;
  const completedIssues = cycleIssues.filter((i) => i.status === 'done').length;
  const inProgressIssues = cycleIssues.filter((i) => i.status === 'in_progress' || i.status === 'in_review').length;

  const progress = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

  if (cycle.progress !== progress) {
    await db.update(cycles).set({ progress, updatedAt: new Date() }).where(eq(cycles.id, cycleId));
  }

  return c.json({
    ...cycle,
    progress,
    totalIssues,
    completedIssues,
    inProgressIssues,
  });
});

/**
 * PUT /cycles/:id
 * Update cycle
 */
app.put('/:id', zValidator('json', updateCycleSchema), async (c) => {
  const cycleId = c.req.param('id');
  const user = c.get('user')!;
  const data = c.req.valid('json');
  const db = c.get('db');

  const [cycle] = await db.select().from(cycles).where(eq(cycles.id, cycleId));

  if (!cycle) {
    return c.json({ error: 'Cycle not found' }, 404);
  }

  const [member] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, cycle.projectId), eq(projectMembers.userId, user.id)));

  if (!member) {
    return c.json({ error: 'Access denied' }, 403);
  }

  const updates: Record<string, unknown> = {
    ...data,
    updatedAt: new Date(),
  };

  if (data.startDate) updates.startDate = new Date(data.startDate);
  if (data.endDate) updates.endDate = new Date(data.endDate);

  await db.update(cycles).set(updates).where(eq(cycles.id, cycleId));

  const [updated] = await db.select().from(cycles).where(eq(cycles.id, cycleId));

  return c.json(updated);
});

/**
 * DELETE /cycles/:id
 * Delete cycle
 */
app.delete('/:id', async (c) => {
  const cycleId = c.req.param('id');
  const user = c.get('user')!;
  const db = c.get('db');

  const [cycle] = await db.select().from(cycles).where(eq(cycles.id, cycleId));

  if (!cycle) {
    return c.json({ error: 'Cycle not found' }, 404);
  }

  const [member] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, cycle.projectId), eq(projectMembers.userId, user.id)));

  if (!member) {
    return c.json({ error: 'Access denied' }, 403);
  }

  await db.delete(cycles).where(eq(cycles.id, cycleId));

  return c.json({ message: 'Cycle deleted' });
});

export default app;
