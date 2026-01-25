import { Hono } from 'hono';
import { db } from '../db/client';
import * as schema from '@linearflow/database';
import type { Env } from '../lib/app';

const dev = new Hono<Env>();

/**
 * Development-only routes
 */

/**
 * POST /dev/seed
 * Seed the database with sample data
 */
dev.post('/seed', async (c) => {
  if (process.env.NODE_ENV === 'production') {
    return c.json({ error: 'Forbidden', message: 'Seed endpoint is only available in development' }, 403);
  }

  const clean = c.req.query('clean') !== 'false';

  try {
    // Import seed function dynamically to avoid bundling in production
    const { seed } = await import('@linearflow/database');
    await seed(db, { clean, verbose: true });

    return c.json({
      success: true,
      message: 'Database seeded successfully',
      options: { clean },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return c.json(
      {
        success: false,
        error: 'Seed failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /dev/reset
 * Reset the database (delete all data)
 */
dev.post('/reset', async (c) => {
  if (process.env.NODE_ENV === 'production') {
    return c.json({ error: 'Forbidden', message: 'Reset endpoint is only available in development' }, 403);
  }

  try {
    // Delete in reverse order of dependencies
    await db.delete(schema.commentReactions);
    await db.delete(schema.comments);
    await db.delete(schema.issueLabels);
    await db.delete(schema.issueSubscribers);
    await db.delete(schema.issues);
    await db.delete(schema.cycles);
    await db.delete(schema.projectMembers);
    await db.delete(schema.invitations);
    await db.delete(schema.projects);
    await db.delete(schema.labels);
    await db.delete(schema.notificationPreferences);
    await db.delete(schema.notifications);
    await db.delete(schema.activityLog);
    await db.delete(schema.sessions);
    await db.delete(schema.users);

    return c.json({
      success: true,
      message: 'Database reset successfully - all data deleted',
    });
  } catch (error) {
    console.error('Reset error:', error);
    return c.json(
      {
        success: false,
        error: 'Reset failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /dev/stats
 * Get database statistics
 */
dev.get('/stats', async (c) => {
  if (process.env.NODE_ENV === 'production') {
    return c.json({ error: 'Forbidden', message: 'Stats endpoint is only available in development' }, 403);
  }

  try {
    const [usersResult, projectsResult, cyclesResult, issuesResult, commentsResult, labelsResult] = await Promise.all([
      db.select({ id: schema.users.id }).from(schema.users),
      db.select({ id: schema.projects.id }).from(schema.projects),
      db.select({ id: schema.cycles.id }).from(schema.cycles),
      db.select({ id: schema.issues.id }).from(schema.issues),
      db.select({ id: schema.comments.id }).from(schema.comments),
      db.select({ id: schema.labels.id }).from(schema.labels),
    ]);

    return c.json({
      success: true,
      stats: {
        users: usersResult.length,
        projects: projectsResult.length,
        cycles: cyclesResult.length,
        issues: issuesResult.length,
        comments: commentsResult.length,
        labels: labelsResult.length,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default dev;
