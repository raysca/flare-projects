import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDrizzleClient, issues, issueLabels, workspaceMembers, teams, comments, users, labels, projects } from "@linearflow/database";
// ...
// In GET /:id
// ...

import { eq, and, desc, sql, inArray, aliasedTable } from "drizzle-orm";
import type { Env } from "../index";
import { authMiddleware, type Variables } from "../middleware/auth";

const app = new Hono<Env & { Variables: Variables }>();

// Validation Schemas
const createIssueSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    teamId: z.string().uuid("Invalid Team ID"),
    workspaceId: z.string().uuid("Invalid Workspace ID"),
    status: z.enum(["backlog", "todo", "in_progress", "in_review", "done", "cancelled"]).default("backlog"),
    priority: z.enum(["urgent", "high", "medium", "low", "no_priority"]).default("no_priority"),
    type: z.enum(["bug", "feature", "improvement", "task"]).optional(),
    assigneeId: z.string().optional(),
    projectId: z.string().uuid().optional(),
    parentId: z.string().optional(),
    estimate: z.number().int().nonnegative().optional(),
    dueDate: z.string().datetime().optional(), // Expecting ISO string
    labelIds: z.array(z.string()).optional(),
});

const updateIssueSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z.enum(["backlog", "todo", "in_progress", "in_review", "done", "cancelled"]).optional(),
    priority: z.enum(["urgent", "high", "medium", "low", "no_priority"]).optional(),
    type: z.enum(["bug", "feature", "improvement", "task"]).optional(),
    assigneeId: z.string().optional().nullable(),
    projectId: z.string().uuid().optional().nullable(),
    parentId: z.string().optional().nullable(),
    estimate: z.number().int().nonnegative().optional().nullable(),
    dueDate: z.string().datetime().optional().nullable(),
    labelIds: z.array(z.string()).optional(), // Replace all labels
});

app.use("*", authMiddleware);

/**
 * GET /
 * List issues with filters
 */
app.get("/", async (c) => {
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    // Filters from query params
    const workspaceId = c.req.query("workspaceId");
    const teamId = c.req.query("teamId");
    const assigneeId = c.req.query("assigneeId");
    const status = c.req.query("status");
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");

    const conditions = [];

    // Required: User must have access to the workspace
    // If workspaceId is provided, check access.
    // If not, we theoretically should search across all workspaces user is in,
    // but for performance/simplicity let's require workspaceId for now or filter by user's memberships.
    // Let's require workspaceId for listing issues in this MPV iteration to keep it performant.
    if (!workspaceId) {
        return c.json({ error: "workspaceId query parameter is required" }, 400);
    }

    // Check membership
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied to workspace" }, 403);
    }

    conditions.push(eq(issues.workspaceId, workspaceId));

    if (teamId) conditions.push(eq(issues.teamId, teamId));
    if (assigneeId) conditions.push(eq(issues.assigneeId, assigneeId));
    if (status) conditions.push(eq(issues.status, status as any));

    // Aliases for users
    const assignee = aliasedTable(users, "assignee");
    const reporter = aliasedTable(users, "reporter");

    const result = await db
        .select({
            id: issues.id,
            workspaceId: issues.workspaceId,
            teamId: issues.teamId,
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
            createdAt: issues.createdAt,
            updatedAt: issues.updatedAt,
            assignee: {
                id: assignee.id,
                name: assignee.name,
                avatarUrl: assignee.avatarUrl,
                email: assignee.email
            },
            reporter: {
                id: reporter.id,
                name: reporter.name,
                avatarUrl: reporter.avatarUrl,
                email: reporter.email
            }
        })
        .from(issues)
        .leftJoin(assignee, eq(issues.assigneeId, assignee.id))
        .leftJoin(reporter, eq(issues.reporterId, reporter.id))
        .where(and(...conditions))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(issues.createdAt));

    return c.json(result);
});

/**
 * POST /
 * Create a new issue
 */
app.post("/", zValidator("json", createIssueSchema), async (c) => {
    const user = c.var.user;
    const data = c.req.valid("json");
    const db = createDrizzleClient(c.env.DB);

    // Check workspace access
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, data.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied to workspace" }, 403);
    }

    // Get next issue number for the team/workspace
    // Note: This relies on a sequential scan or a separate counter. 
    // For MVP we can count existing issues + 1. 
    // Racing conditions exist here but for MVP it's acceptable.
    // Ideally use a Durable Object for atomic increment or atomic update on a counters table.
    // Let's do a simple count for now.
    const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(issues)
        .where(eq(issues.workspaceId, data.workspaceId))
        .get();

    const nextNumber = (countResult?.count || 0) + 1;
    const issueId = crypto.randomUUID();

    // Create issue
    await db.insert(issues).values({
        id: issueId,
        ...data,
        number: nextNumber,
        reporterId: user.id,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    });

    // Handle Labels
    if (data.labelIds && data.labelIds.length > 0) {
        await db.insert(issueLabels).values(
            data.labelIds.map(labelId => ({
                id: crypto.randomUUID(),
                issueId: issueId,
                labelId: labelId,
            }))
        );
    }

    const newIssue = await db.select().from(issues).where(eq(issues.id, issueId)).get();

    return c.json(newIssue, 201);
});

/**
 * GET /:id
 * Get issue details
 */
app.get("/:id", async (c) => {
    const issueId = c.req.param("id");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    // Aliases for users
    const assignee = aliasedTable(users, "assignee");
    const reporter = aliasedTable(users, "reporter");

    const issue = await db
        .select({
            id: issues.id,
            workspaceId: issues.workspaceId,
            teamId: issues.teamId,
            number: issues.number,
            title: issues.title,
            description: issues.description,
            status: issues.status,
            priority: issues.priority,
            type: issues.type,
            assigneeId: issues.assigneeId,
            reporterId: issues.reporterId,
            projectId: issues.projectId,
            estimate: issues.estimate,
            dueDate: issues.dueDate,
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
                identifier: projects.identifier
            }
        })
        .from(issues)
        .leftJoin(assignee, eq(issues.assigneeId, assignee.id))
        .leftJoin(reporter, eq(issues.reporterId, reporter.id))
        .leftJoin(projects, eq(issues.projectId, projects.id))
        .where(eq(issues.id, issueId))
        .get();

    if (!issue) {
        return c.json({ error: "Issue not found" }, 404);
    }

    // Check access to workspace
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, issue.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    // Fetch labels
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
 * PUT /:id
 * Update issue
 */
app.put("/:id", zValidator("json", updateIssueSchema), async (c) => {
    const issueId = c.req.param("id");
    const user = c.var.user;
    const data = c.req.valid("json");
    const db = createDrizzleClient(c.env.DB);

    const issue = await db.select().from(issues).where(eq(issues.id, issueId)).get();

    if (!issue) {
        return c.json({ error: "Issue not found" }, 404);
    }

    // Check access
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, issue.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    // Extract labelIds to handle separately
    const { labelIds, ...updateData } = data;

    // DB Update
    await db
        .update(issues)
        .set({
            ...updateData,
            dueDate: updateData.dueDate ? new Date(updateData.dueDate) : undefined,
            updatedAt: new Date(),
        })
        .where(eq(issues.id, issueId));

    // Sync Labels if provided
    if (labelIds !== undefined) {
        // Delete existing
        await db.delete(issueLabels).where(eq(issueLabels.issueId, issueId));

        // Insert new
        if (labelIds.length > 0) {
            await db.insert(issueLabels).values(
                labelIds.map(labelId => ({
                    id: crypto.randomUUID(),
                    issueId: issueId,
                    labelId: labelId,
                }))
            );
        }
    }

    const updatedIssue = await db.select().from(issues).where(eq(issues.id, issueId)).get();

    return c.json(updatedIssue);
});

/**
 * DELETE /:id
 * Delete issue
 */
app.delete("/:id", async (c) => {
    const issueId = c.req.param("id");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    const issue = await db.select().from(issues).where(eq(issues.id, issueId)).get();

    if (!issue) {
        return c.json({ error: "Issue not found" }, 404);
    }

    // Check access
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, issue.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    await db.delete(issues).where(eq(issues.id, issueId));

    return c.json({ message: "Issue deleted" });
});


// ... (DELETE route) ...

/**
 * GET /:id/comments
 * List comments for an issue
 */
app.get("/:id/comments", async (c) => {
    const issueId = c.req.param("id");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    const issue = await db.select().from(issues).where(eq(issues.id, issueId)).get();

    if (!issue) {
        return c.json({ error: "Issue not found" }, 404);
    }

    // Check workspace access
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, issue.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    const result = await db
        .select({
            id: comments.id,
            body: comments.body,
            createdAt: comments.createdAt,
            updatedAt: comments.updatedAt,
            user: {
                id: users.id,
                name: users.name,
                avatarUrl: users.avatarUrl,
            },
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.issueId, issueId))
        .orderBy(desc(comments.createdAt));

    return c.json(result);
});

/**
 * POST /:id/comments
 * Create a comment
 */
app.post("/:id/comments", zValidator("json", z.object({ body: z.string().min(1) })), async (c) => {
    const issueId = c.req.param("id");
    const user = c.var.user;
    const { body } = c.req.valid("json");
    const db = createDrizzleClient(c.env.DB);

    const issue = await db.select().from(issues).where(eq(issues.id, issueId)).get();

    if (!issue) {
        return c.json({ error: "Issue not found" }, 404);
    }

    // Check workspace access
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, issue.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    const commentId = crypto.randomUUID();

    await db.insert(comments).values({
        id: commentId,
        issueId,
        userId: user.id,
        body,
    });

    const newComment = await db
        .select({
            id: comments.id,
            body: comments.body,
            createdAt: comments.createdAt,
            updatedAt: comments.updatedAt,
            user: {
                id: users.id,
                name: users.name,
                avatarUrl: users.avatarUrl,
            },
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.id, commentId))
        .get();

    return c.json(newComment, 201);
});

export default app;
