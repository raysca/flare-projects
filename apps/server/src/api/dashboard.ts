import { Hono } from 'hono';
import {
    issues,
    issueSubscribers,
    projects,
    users,
    activityLog,
    notifications,
} from '@linearflow/database';
import { eq, and, desc, asc, lt, notInArray, count, aliasedTable, or, gte, inArray } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../lib/app';

const app = new Hono<Env>();

app.use('*', authMiddleware);

// --- 1.2 Stats ---
app.get('/stats', async (c) => {
    const user = c.get('user')!;
    const db = c.get('db');

    // Assigned issues by status
    const assignedIssues = await db
        .select({ status: issues.status, count: count() })
        .from(issues)
        .where(eq(issues.assigneeId, user.id))
        .groupBy(issues.status);

    // Convert to easy lookup
    const statusCounts = assignedIssues.reduce((acc, curr) => {
        acc[curr.status] = curr.count;
        return acc;
    }, {} as Record<string, number>);

    // Reported total
    const [createdTotal] = await db
        .select({ count: count() })
        .from(issues)
        .where(eq(issues.reporterId, user.id));

    // Open issues created by me (not done/cancelled)
    const [createdOpen] = await db
        .select({ count: count() })
        .from(issues)
        .where(and(
            eq(issues.reporterId, user.id),
            notInArray(issues.status, ['done', 'cancelled'])
        ));

    // Watching count
    const [watchingCount] = await db
        .select({ count: count() })
        .from(issueSubscribers)
        .where(eq(issueSubscribers.userId, user.id));

    // Completed counts
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = startOfToday.getDay(); // 0 is Sunday

    // Assume week starts Monday (ISO)
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - diffToMonday);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);

    const [completedThisWeek] = await db
        .select({ count: count() })
        .from(issues)
        .where(and(
            eq(issues.assigneeId, user.id),
            eq(issues.status, 'done'),
            gte(issues.completedAt, startOfWeek)
        ));

    const [completedLastWeek] = await db
        .select({ count: count() })
        .from(issues)
        .where(and(
            eq(issues.assigneeId, user.id),
            eq(issues.status, 'done'),
            gte(issues.completedAt, startOfLastWeek),
            lt(issues.completedAt, startOfWeek)
        ));

    return c.json({
        assigned: {
            backlog: statusCounts['backlog'] || 0,
            todo: statusCounts['todo'] || 0,
            inProgress: statusCounts['in_progress'] || 0,
            done: statusCounts['done'] || 0,
            cancelled: statusCounts['cancelled'] || 0,
        },
        created: {
            total: createdTotal?.count || 0,
            open: createdOpen?.count || 0,
        },
        watching: watchingCount?.count || 0,
        completed: {
            thisWeek: completedThisWeek?.count || 0,
            lastWeek: completedLastWeek?.count || 0,
        }
    });
});

// --- 1.3 Overdue ---
app.get('/overdue', async (c) => {
    const user = c.get('user')!;
    const db = c.get('db');

    const limit = parseInt(c.req.query('limit') || '5');

    const overdueIssues = await db
        .select({
            id: issues.id,
            title: issues.title,
            number: issues.number,
            dueDate: issues.dueDate,
            project: {
                id: projects.id,
                name: projects.name,
                identifier: projects.identifier,
            }
        })
        .from(issues)
        .leftJoin(projects, eq(issues.projectId, projects.id))
        .where(and(
            eq(issues.assigneeId, user.id),
            lt(issues.dueDate, new Date()), // now
            notInArray(issues.status, ['done', 'cancelled'])
        ))
        .orderBy(asc(issues.dueDate))
        .limit(limit);

    const result = overdueIssues.map(issue => {
        const due = new Date(issue.dueDate!);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - due.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            ...issue,
            daysOverdue: diffDays
        };
    });

    return c.json(result);
});

// --- 1.4 Issues ---
app.get('/issues', async (c) => {
    const user = c.get('user')!;
    const db = c.get('db');

    const filter = c.req.query('filter') as 'assigned' | 'reported' | 'watching';
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    let conditions = [];

    if (filter === 'reported') {
        conditions.push(eq(issues.reporterId, user.id));
    } else if (filter === 'watching') {
        // handled via join
    } else {
        // default assigned
        conditions.push(eq(issues.assigneeId, user.id));
    }

    const assignee = aliasedTable(users, 'assignee');

    let query = db
        .select({
            id: issues.id,
            number: issues.number,
            title: issues.title,
            status: issues.status,
            priority: issues.priority,
            dueDate: issues.dueDate,
            project: {
                id: projects.id,
                name: projects.name,
                identifier: projects.identifier,
            },
            assignee: {
                id: assignee.id,
                name: assignee.name,
                avatarUrl: assignee.avatarUrl,
            }
        })
        .from(issues)
        .leftJoin(projects, eq(issues.projectId, projects.id))
        .leftJoin(assignee, eq(issues.assigneeId, assignee.id))
        .$dynamic();

    if (filter === 'watching') {
        query = query
            .innerJoin(issueSubscribers, eq(issues.id, issueSubscribers.issueId))
            .where(eq(issueSubscribers.userId, user.id));
    } else {
        query = query.where(and(...conditions));
    }

    const items = await query
        .limit(limit)
        .offset(offset)
        .orderBy(desc(issues.createdAt));

    // Count query
    let countQuery = db.select({ count: count() }).from(issues).$dynamic();
    if (filter === 'watching') {
        countQuery = countQuery
            .innerJoin(issueSubscribers, eq(issues.id, issueSubscribers.issueId))
            .where(eq(issueSubscribers.userId, user.id));
    } else {
        countQuery = countQuery.where(and(...conditions));
    }

    const [totalResult] = await countQuery;
    const total = totalResult?.count || 0;

    return c.json({
        issues: items,
        total,
        hasMore: offset + items.length < total
    });
});

// --- 1.5 Activity ---
app.get('/activity', async (c) => {
    const user = c.get('user')!;
    const db = c.get('db');
    const limit = parseInt(c.req.query('limit') || '10');

    const activities = await db
        .select({
            id: activityLog.id,
            action: activityLog.action,
            entityType: activityLog.entityType,
            createdAt: activityLog.createdAt,
            metadata: activityLog.metadata,
            issue: {
                id: issues.id,
                number: issues.number,
                title: issues.title,
            },
            project: {
                identifier: projects.identifier
            }
        })
        .from(activityLog)
        .leftJoin(issues, eq(activityLog.issueId, issues.id))
        .leftJoin(projects, eq(issues.projectId, projects.id))
        .where(eq(activityLog.userId, user.id))
        .orderBy(desc(activityLog.createdAt))
        .limit(limit);

    return c.json(activities);
});

// --- 1.6 Mentions ---
app.get('/mentions', async (c) => {
    const user = c.get('user')!;
    const db = c.get('db');
    const limit = parseInt(c.req.query('limit') || '10');

    const mentions = await db
        .select({
            id: notifications.id,
            type: notifications.type,
            isRead: notifications.isRead,
            createdAt: notifications.createdAt,
            message: notifications.message,
            issue: {
                id: issues.id,
                number: issues.number,
                title: issues.title,
            },
            project: {
                identifier: projects.identifier
            }
        })
        .from(notifications)
        .leftJoin(issues, eq(notifications.issueId, issues.id))
        .leftJoin(projects, eq(notifications.projectId, projects.id))
        .where(and(
            eq(notifications.userId, user.id),
            inArray(notifications.type, ['issue_mentioned', 'comment_mentioned'])
        ))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);

    return c.json(mentions);
});

export default app;
