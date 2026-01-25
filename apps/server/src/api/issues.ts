import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  issues,
  issueLabels,
  issueSubscribers,
  projectMembers,
  comments,
  commentReactions,
  users,
  labels,
  projects,
  cycles,
  activityLog,
} from '@linearflow/database';
import { eq, and, desc, sql, inArray, aliasedTable } from 'drizzle-orm';
import type { Env } from '../lib/app';
import { authMiddleware } from '../middleware/auth';
import { broadcast } from '../realtime/broadcast';
import { logActivity } from '../services/activity';

const app = new Hono<Env>();

app.use('*', authMiddleware);

// Status values
const STATUS_VALUES = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'] as const;
type IssueStatus = (typeof STATUS_VALUES)[number];

// Status transitions
const STATUS_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  backlog: ['todo', 'in_progress', 'cancelled'],
  todo: ['backlog', 'in_progress', 'cancelled'],
  in_progress: ['todo', 'in_review', 'done', 'cancelled'],
  in_review: ['in_progress', 'done', 'cancelled'],
  done: ['in_progress', 'in_review'],
  cancelled: ['backlog', 'todo'],
};

function isValidStatusTransition(from: IssueStatus, to: IssueStatus): boolean {
  if (from === to) return true;
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

function getStatusTimestamps(newStatus: string, oldStatus?: string) {
  const now = new Date();
  const updates: Record<string, Date | null> = {};

  if (newStatus === 'in_progress' && oldStatus !== 'in_progress') {
    updates.startedAt = now;
  }

  if (newStatus === 'done') {
    updates.completedAt = now;
  } else if (oldStatus === 'done' && newStatus !== 'done') {
    updates.completedAt = null;
  }

  if (newStatus === 'cancelled') {
    updates.cancelledAt = now;
  } else if (oldStatus === 'cancelled' && newStatus !== 'cancelled') {
    updates.cancelledAt = null;
  }

  return updates;
}

// Schemas
const createIssueSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  projectId: z.string().uuid('Invalid Project ID'),
  status: z.enum(STATUS_VALUES).default('backlog'),
  priority: z.enum(['urgent', 'high', 'medium', 'low', 'no_priority']).default('no_priority'),
  type: z.enum(['bug', 'feature', 'improvement', 'task']).optional(),
  assigneeId: z.string().optional(),
  cycleId: z.string().uuid().optional(),
  parentId: z.string().optional(),
  estimate: z.number().int().nonnegative().optional(),
  dueDate: z.string().datetime().optional(),
  labelIds: z.array(z.string()).optional(),
});

const updateIssueSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(STATUS_VALUES).optional(),
  priority: z.enum(['urgent', 'high', 'medium', 'low', 'no_priority']).optional(),
  type: z.enum(['bug', 'feature', 'improvement', 'task']).optional(),
  assigneeId: z.string().optional().nullable(),
  cycleId: z.string().uuid().optional().nullable(),
  parentId: z.string().optional().nullable(),
  estimate: z.number().int().nonnegative().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  labelIds: z.array(z.string()).optional(),
});

const createCommentSchema = z.object({
  body: z.string().min(1, 'Comment body is required'),
  parentId: z.string().optional(),
});

const updateCommentSchema = z.object({
  body: z.string().min(1),
});

/**
 * GET /issues
 * List issues with filters
 */
app.get('/', async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');

  const projectId = c.req.query('projectId');
  const assigneeId = c.req.query('assigneeId');
  const status = c.req.query('status');
  const cycleId = c.req.query('cycleId');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const conditions = [];

  if (projectId) {
    const [member] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)));

    if (!member) {
      return c.json({ error: 'Access denied to project' }, 403);
    }
    conditions.push(eq(issues.projectId, projectId));
  } else {
    const memberships = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, user.id));

    const projectIds = memberships.map((m) => m.projectId);
    if (projectIds.length === 0) return c.json([]);

    conditions.push(inArray(issues.projectId, projectIds));
  }

  if (assigneeId) conditions.push(eq(issues.assigneeId, assigneeId));
  if (status) conditions.push(eq(issues.status, status as IssueStatus));
  if (cycleId) conditions.push(eq(issues.cycleId, cycleId));

  const assignee = aliasedTable(users, 'assignee');
  const reporter = aliasedTable(users, 'reporter');

  const result = await db
    .select({
      id: issues.id,
      projectId: issues.projectId,
      number: issues.number,
      title: issues.title,
      description: issues.description,
      status: issues.status,
      priority: issues.priority,
      type: issues.type,
      assigneeId: issues.assigneeId,
      reporterId: issues.reporterId,
      estimate: issues.estimate,
      dueDate: issues.dueDate,
      cycleId: issues.cycleId,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
      assignee: {
        id: assignee.id,
        name: assignee.name,
        avatarUrl: assignee.avatarUrl,
        email: assignee.email,
      },
      reporter: {
        id: reporter.id,
        name: reporter.name,
        avatarUrl: reporter.avatarUrl,
        email: reporter.email,
      },
      project: {
        id: projects.id,
        name: projects.name,
        identifier: projects.identifier,
      },
      cycle: {
        id: cycles.id,
        name: cycles.name,
        startDate: cycles.startDate,
        endDate: cycles.endDate,
      },
    })
    .from(issues)
    .leftJoin(assignee, eq(issues.assigneeId, assignee.id))
    .leftJoin(reporter, eq(issues.reporterId, reporter.id))
    .leftJoin(projects, eq(issues.projectId, projects.id))
    .leftJoin(cycles, eq(issues.cycleId, cycles.id))
    .where(and(...conditions))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(issues.createdAt));

  return c.json(result);
});

/**
 * POST /issues
 * Create a new issue
 */
app.post('/', zValidator('json', createIssueSchema), async (c) => {
  const user = c.get('user')!;
  const data = c.req.valid('json');
  const db = c.get('db');

  const [member] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, data.projectId), eq(projectMembers.userId, user.id)));

  if (!member) {
    return c.json({ error: 'Access denied to project' }, 403);
  }

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(issues)
    .where(eq(issues.projectId, data.projectId));

  const nextNumber = (countResult?.count || 0) + 1;
  const issueId = crypto.randomUUID();

  const statusTimestamps = data.status ? getStatusTimestamps(data.status) : {};

  await db.insert(issues).values({
    id: issueId,
    ...data,
    number: nextNumber,
    reporterId: user.id,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    ...statusTimestamps,
  });

  if (data.labelIds && data.labelIds.length > 0) {
    await db.insert(issueLabels).values(
      data.labelIds.map((labelId) => ({
        id: crypto.randomUUID(),
        issueId: issueId,
        labelId: labelId,
      }))
    );
  }

  await db.insert(issueSubscribers).values({
    id: crypto.randomUUID(),
    issueId: issueId,
    userId: user.id,
  });

  if (data.assigneeId && data.assigneeId !== user.id) {
    await db.insert(issueSubscribers).values({
      id: crypto.randomUUID(),
      issueId: issueId,
      userId: data.assigneeId,
    });
  }

  // Log activity
  await logActivity(db, {
    projectId: data.projectId,
    userId: user.id,
    issueId: issueId,
    action: 'created',
    entityType: 'issue',
    entityId: issueId,
    metadata: {
      title: data.title,
      status: data.status || 'backlog',
      priority: data.priority || 'no_priority',
    },
  });

  const [newIssue] = await db.select().from(issues).where(eq(issues.id, issueId));

  if (newIssue) {
    broadcast.issueCreated(data.projectId, newIssue, user.id);
  }

  return c.json(newIssue, 201);
});

/**
 * GET /issues/:id
 * Get issue details
 */
app.get('/:id', async (c) => {
  const issueId = c.req.param('id');
  const user = c.get('user')!;
  const db = c.get('db');

  const assignee = aliasedTable(users, 'assignee');
  const reporter = aliasedTable(users, 'reporter');

  const [issue] = await db
    .select({
      id: issues.id,
      projectId: issues.projectId,
      number: issues.number,
      title: issues.title,
      description: issues.description,
      status: issues.status,
      priority: issues.priority,
      type: issues.type,
      assigneeId: issues.assigneeId,
      reporterId: issues.reporterId,
      estimate: issues.estimate,
      dueDate: issues.dueDate,
      cycleId: issues.cycleId,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
      assignee: {
        id: assignee.id,
        name: assignee.name,
        avatarUrl: assignee.avatarUrl,
        email: assignee.email,
      },
      reporter: {
        id: reporter.id,
        name: reporter.name,
        avatarUrl: reporter.avatarUrl,
        email: reporter.email,
      },
      project: {
        id: projects.id,
        name: projects.name,
        identifier: projects.identifier,
      },
      cycle: {
        id: cycles.id,
        name: cycles.name,
        startDate: cycles.startDate,
        endDate: cycles.endDate,
      },
    })
    .from(issues)
    .leftJoin(assignee, eq(issues.assigneeId, assignee.id))
    .leftJoin(reporter, eq(issues.reporterId, reporter.id))
    .leftJoin(projects, eq(issues.projectId, projects.id))
    .leftJoin(cycles, eq(issues.cycleId, cycles.id))
    .where(eq(issues.id, issueId));

  if (!issue) {
    return c.json({ error: 'Issue not found' }, 404);
  }

  const [member] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, issue.projectId), eq(projectMembers.userId, user.id)));

  if (!member) {
    return c.json({ error: 'Access denied' }, 403);
  }

  const issueLabelsData = await db
    .select({
      id: labels.id,
      name: labels.name,
      color: labels.color,
    })
    .from(issueLabels)
    .innerJoin(labels, eq(issueLabels.labelId, labels.id))
    .where(eq(issueLabels.issueId, issueId));

  return c.json({
    ...issue,
    labels: issueLabelsData,
  });
});

/**
 * PUT /issues/:id
 * Update issue
 */
app.put('/:id', zValidator('json', updateIssueSchema), async (c) => {
  const issueId = c.req.param('id');
  const user = c.get('user')!;
  const data = c.req.valid('json');
  const db = c.get('db');

  const [issue] = await db.select().from(issues).where(eq(issues.id, issueId));

  if (!issue) {
    return c.json({ error: 'Issue not found' }, 404);
  }

  const [member] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, issue.projectId), eq(projectMembers.userId, user.id)));

  if (!member) {
    return c.json({ error: 'Access denied' }, 403);
  }

  if (data.status && data.status !== issue.status) {
    if (!isValidStatusTransition(issue.status as IssueStatus, data.status)) {
      return c.json(
        {
          error: `Invalid status transition from "${issue.status}" to "${data.status}"`,
          allowedTransitions: STATUS_TRANSITIONS[issue.status as IssueStatus],
        },
        400
      );
    }
  }

  const { labelIds, ...updateData } = data;
  const statusTimestamps = data.status ? getStatusTimestamps(data.status, issue.status as IssueStatus) : {};

  const updateValues: Record<string, unknown> = {
    updatedAt: new Date(),
    ...statusTimestamps,
  };

  Object.entries(updateData).forEach(([key, value]) => {
    if (value !== undefined) {
      if (key === 'dueDate') {
        updateValues[key] = value ? new Date(value as string) : null;
      } else {
        updateValues[key] = value;
      }
    }
  });

  await db.update(issues).set(updateValues).where(eq(issues.id, issueId));

  // Sync Labels if provided
  if (labelIds !== undefined) {
    // Get current labels for activity logging
    const currentLabels = await db
      .select({ labelId: issueLabels.labelId })
      .from(issueLabels)
      .where(eq(issueLabels.issueId, issueId));
    const currentLabelIds = currentLabels.map((l) => l.labelId);

    await db.delete(issueLabels).where(eq(issueLabels.issueId, issueId));
    if (labelIds.length > 0) {
      await db.insert(issueLabels).values(
        labelIds.map((labelId) => ({
          id: crypto.randomUUID(),
          issueId: issueId,
          labelId: labelId,
        }))
      );
    }

    // Log label changes
    const addedLabels = labelIds.filter((id) => !currentLabelIds.includes(id));
    const removedLabels = currentLabelIds.filter((id) => !labelIds.includes(id));

    if (addedLabels.length > 0) {
      await logActivity(db, {
        projectId: issue.projectId,
        userId: user.id,
        issueId: issueId,
        action: 'labeled',
        entityType: 'issue',
        entityId: issueId,
        newValue: addedLabels.join(','),
      });
    }

    if (removedLabels.length > 0) {
      await logActivity(db, {
        projectId: issue.projectId,
        userId: user.id,
        issueId: issueId,
        action: 'unlabeled',
        entityType: 'issue',
        entityId: issueId,
        oldValue: removedLabels.join(','),
      });
    }
  }

  // Log status change
  if (data.status && data.status !== issue.status) {
    await logActivity(db, {
      projectId: issue.projectId,
      userId: user.id,
      issueId: issueId,
      action: 'status_changed',
      entityType: 'issue',
      entityId: issueId,
      oldValue: issue.status,
      newValue: data.status,
    });
  }

  // Log assignee change
  if (data.assigneeId !== undefined && data.assigneeId !== issue.assigneeId) {
    if (data.assigneeId === null && issue.assigneeId) {
      await logActivity(db, {
        projectId: issue.projectId,
        userId: user.id,
        issueId: issueId,
        action: 'unassigned',
        entityType: 'issue',
        entityId: issueId,
        oldValue: issue.assigneeId,
      });
    } else if (data.assigneeId) {
      await logActivity(db, {
        projectId: issue.projectId,
        userId: user.id,
        issueId: issueId,
        action: 'assigned',
        entityType: 'issue',
        entityId: issueId,
        oldValue: issue.assigneeId || undefined,
        newValue: data.assigneeId,
      });

      // Auto-subscribe new assignee if not already subscribed
      const [existingSub] = await db
        .select()
        .from(issueSubscribers)
        .where(
          and(eq(issueSubscribers.issueId, issueId), eq(issueSubscribers.userId, data.assigneeId))
        );

      if (!existingSub) {
        await db.insert(issueSubscribers).values({
          id: crypto.randomUUID(),
          issueId: issueId,
          userId: data.assigneeId,
        });
      }
    }
  }

  // Log general update if other fields changed
  const otherFieldsChanged =
    Object.keys(updateData).filter(
      (key) =>
        key !== 'status' &&
        key !== 'assigneeId' &&
        updateData[key as keyof typeof updateData] !== undefined
    ).length > 0;

  if (otherFieldsChanged) {
    await logActivity(db, {
      projectId: issue.projectId,
      userId: user.id,
      issueId: issueId,
      action: 'updated',
      entityType: 'issue',
      entityId: issueId,
      metadata: { fields: Object.keys(updateData) },
    });
  }

  const [updated] = await db.select().from(issues).where(eq(issues.id, issueId));

  if (updated) {
    broadcast.issueUpdated(issueId, issue.projectId, updated, user.id);
  }

  return c.json(updated);
});

/**
 * DELETE /issues/:id
 * Delete issue
 */
app.delete('/:id', async (c) => {
  const issueId = c.req.param('id');
  const user = c.get('user')!;
  const db = c.get('db');

  const [issue] = await db.select().from(issues).where(eq(issues.id, issueId));

  if (!issue) {
    return c.json({ error: 'Issue not found' }, 404);
  }

  const [member] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, issue.projectId), eq(projectMembers.userId, user.id)));

  if (!member) {
    return c.json({ error: 'Access denied' }, 403);
  }

  await db.delete(issues).where(eq(issues.id, issueId));

  broadcast.issueDeleted(issueId, issue.projectId, { id: issueId }, user.id);

  return c.json({ message: 'Issue deleted' });
});

/**
 * GET /issues/:id/comments
 * List comments for an issue
 */
app.get('/:id/comments', async (c) => {
  const issueId = c.req.param('id');
  const user = c.get('user')!;
  const db = c.get('db');

  const [issue] = await db.select().from(issues).where(eq(issues.id, issueId));

  if (!issue) {
    return c.json({ error: 'Issue not found' }, 404);
  }

  const [member] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, issue.projectId), eq(projectMembers.userId, user.id)));

  if (!member) {
    return c.json({ error: 'Access denied' }, 403);
  }

  const issueComments = await db
    .select({
      id: comments.id,
      body: comments.body,
      userId: comments.userId,
      parentId: comments.parentId,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.issueId, issueId))
    .orderBy(comments.createdAt);

  // Get reactions for all comments
  const commentIds = issueComments.map((c) => c.id);
  const reactions =
    commentIds.length > 0
      ? await db.select().from(commentReactions).where(inArray(commentReactions.commentId, commentIds))
      : [];

  const commentsWithReactions = issueComments.map((comment) => ({
    ...comment,
    reactions: reactions.filter((r) => r.commentId === comment.id),
  }));

  return c.json(commentsWithReactions);
});

/**
 * POST /issues/:id/comments
 * Add a comment to an issue
 */
app.post('/:id/comments', zValidator('json', createCommentSchema), async (c) => {
  const issueId = c.req.param('id');
  const user = c.get('user')!;
  const { body, parentId } = c.req.valid('json');
  const db = c.get('db');

  const [issue] = await db.select().from(issues).where(eq(issues.id, issueId));

  if (!issue) {
    return c.json({ error: 'Issue not found' }, 404);
  }

  const [member] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, issue.projectId), eq(projectMembers.userId, user.id)));

  if (!member) {
    return c.json({ error: 'Access denied' }, 403);
  }

  const commentId = crypto.randomUUID();

  await db.insert(comments).values({
    id: commentId,
    issueId,
    userId: user.id,
    body,
    parentId,
  });

  const [newComment] = await db
    .select({
      id: comments.id,
      body: comments.body,
      userId: comments.userId,
      parentId: comments.parentId,
      createdAt: comments.createdAt,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.id, commentId));

  if (newComment) {
    broadcast.commentCreated(issueId, newComment, user.id);
  }

  return c.json(newComment, 201);
});

/**
 * PUT /issues/:id/comments/:commentId
 * Update a comment
 */
app.put('/:id/comments/:commentId', zValidator('json', updateCommentSchema), async (c) => {
  const issueId = c.req.param('id');
  const commentId = c.req.param('commentId');
  const user = c.get('user')!;
  const { body } = c.req.valid('json');
  const db = c.get('db');

  const [comment] = await db.select().from(comments).where(eq(comments.id, commentId));

  if (!comment || comment.issueId !== issueId) {
    return c.json({ error: 'Comment not found' }, 404);
  }

  if (comment.userId !== user.id) {
    return c.json({ error: 'You can only edit your own comments' }, 403);
  }

  await db.update(comments).set({ body, updatedAt: new Date() }).where(eq(comments.id, commentId));

  const [updated] = await db.select().from(comments).where(eq(comments.id, commentId));

  if (updated) {
    broadcast.commentUpdated(issueId, updated, user.id);
  }

  return c.json(updated);
});

/**
 * DELETE /issues/:id/comments/:commentId
 * Delete a comment
 */
app.delete('/:id/comments/:commentId', async (c) => {
  const issueId = c.req.param('id');
  const commentId = c.req.param('commentId');
  const user = c.get('user')!;
  const db = c.get('db');

  const [comment] = await db.select().from(comments).where(eq(comments.id, commentId));

  if (!comment || comment.issueId !== issueId) {
    return c.json({ error: 'Comment not found' }, 404);
  }

  if (comment.userId !== user.id) {
    return c.json({ error: 'You can only delete your own comments' }, 403);
  }

  await db.delete(comments).where(eq(comments.id, commentId));

  broadcast.commentDeleted(issueId, commentId, user.id);

  return c.json({ message: 'Comment deleted' });
});

/**
 * POST /issues/:id/comments/:commentId/reactions
 * Toggle a reaction on a comment
 */
app.post('/:id/comments/:commentId/reactions', async (c) => {
  const issueId = c.req.param('id');
  const commentId = c.req.param('commentId');
  const user = c.get('user')!;
  const db = c.get('db');

  const body = await c.req.json<{ emoji: string }>();
  const emoji = body.emoji;

  if (!emoji) {
    return c.json({ error: 'Emoji is required' }, 400);
  }

  const [comment] = await db.select().from(comments).where(eq(comments.id, commentId));

  if (!comment || comment.issueId !== issueId) {
    return c.json({ error: 'Comment not found' }, 404);
  }

  // Check if reaction exists
  const [existingReaction] = await db
    .select()
    .from(commentReactions)
    .where(and(eq(commentReactions.commentId, commentId), eq(commentReactions.userId, user.id), eq(commentReactions.emoji, emoji)));

  if (existingReaction) {
    // Remove reaction
    await db.delete(commentReactions).where(eq(commentReactions.id, existingReaction.id));
    broadcast.reactionRemoved(
      issueId,
      { commentId, reactionId: existingReaction.id, userId: user.id, emoji },
      user.id
    );
    return c.json({ removed: true, emoji });
  } else {
    // Add reaction
    const reactionId = crypto.randomUUID();
    await db.insert(commentReactions).values({
      id: reactionId,
      commentId,
      userId: user.id,
      emoji,
    });
    broadcast.reactionAdded(issueId, { commentId, reactionId, userId: user.id, emoji }, user.id);
    return c.json({ added: true, emoji, reactionId });
  }
});

export default app;
