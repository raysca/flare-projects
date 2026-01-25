import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { users } from '@linearflow/database';
import { eq } from 'drizzle-orm';
import type { Env } from '../lib/app';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<Env>();

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  avatarUrl: z.string().url().optional(),
});

// Require auth for all routes
app.use('*', authMiddleware);

/**
 * GET /users
 * List users (searchable)
 */
app.get('/', async (c) => {
  const q = c.req.query('q');
  const db = c.get('db');

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      email: users.email,
    })
    .from(users);

  // Filter in memory for case-insensitive search
  if (q) {
    const searchTerm = q.toLowerCase();
    const filteredUsers = allUsers.filter(
      (user) =>
        user.name?.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm)
    );
    return c.json(filteredUsers);
  }

  return c.json(allUsers);
});

/**
 * GET /users/me
 * Get current user profile
 */
app.get('/me', async (c) => {
  const authUser = c.get('user')!;
  const db = c.get('db');

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, authUser.id));

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json(user);
});

/**
 * PUT /users/me
 * Update current user profile
 */
app.put('/me', zValidator('json', updateUserSchema), async (c) => {
  const authUser = c.get('user')!;
  const { name, avatarUrl } = c.req.valid('json');
  const db = c.get('db');

  await db
    .update(users)
    .set({
      name,
      avatarUrl,
      updatedAt: new Date(),
    })
    .where(eq(users.id, authUser.id));

  const [updatedUser] = await db.select().from(users).where(eq(users.id, authUser.id));

  if (!updatedUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    avatarUrl: updatedUser.avatarUrl,
  });
});

/**
 * GET /users/:id
 * Get public profile of a user
 */
app.get('/:id', async (c) => {
  const userId = c.req.param('id');
  const db = c.get('db');

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json(user);
});

export default app;
