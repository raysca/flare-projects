import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDrizzleClient, issues, issueLabels, projectMembers, comments, users, labels, projects, cycles } from "@linearflow/database";
import { eq, and, desc, sql, inArray, aliasedTable } from "drizzle-orm";
import type { Env } from "../index";
import { authMiddleware, type Variables } from "../middleware/auth";

const app = new Hono<Env & { Variables: Variables }>();

// Validation Schemas
const createIssueSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    projectId: z.string().uuid("Invalid Project ID"),
    status: z.enum(["backlog", "todo", "in_progress", "in_review", "done", "cancelled"]).default("backlog"),
    priority: z.enum(["urgent", "high", "medium", "low", "no_priority"]).default("no_priority"),
    type: z.enum(["bug", "feature", "improvement", "task"]).optional(),
    assigneeId: z.string().optional(),
    cycleId: z.string().uuid().optional(),
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
    cycleId: z.string().uuid().optional().nullable(),
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
    const projectId = c.req.query("projectId");
    const assigneeId = c.req.query("assigneeId");
    const status = c.req.query("status");
    const cycleId = c.req.query("cycleId"); // Add support for cycle filtering
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");

    const conditions = [];

    if (!projectId) {
        // Optionally allow listing all issues assigned to user across all projects?
        // For now, let's stick to project-scoped listing or user-assigned listing.
        // If no projectId, maybe just return issues assigned to user?
        if (!assigneeId) {
            return c.json({ error: "projectId query parameter is required" }, 400);
        }
        // If assigneeId is provided (likely filter by "my issues"), strictly verify logic below or filter 
        // by all projects user is member of.
    }

    if (projectId) {
        // Check membership
        const member = await db
            .select()
            .from(projectMembers)
            .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
            .get();

        if (!member) {
            return c.json({ error: "Access denied to project" }, 403);
        }
        conditions.push(eq(issues.projectId, projectId));
    } else {
        // If no projectId, ensure we filter by projects user has access to
        // Or specific assignee check (e.g. issues assigned to me)
        const memberships = await db
            .select({ projectId: projectMembers.projectId })
            .from(projectMembers)
            .where(eq(projectMembers.userId, user.id));

        const projectIds = memberships.map(m => m.projectId);
        if (projectIds.length === 0) return c.json([]);

        conditions.push(inArray(issues.projectId, projectIds));
    }

    if (assigneeId) conditions.push(eq(issues.assigneeId, assigneeId));
    if (status) conditions.push(eq(issues.status, status as any));
    if (cycleId) conditions.push(eq(issues.cycleId, cycleId));

    // Aliases for users
    const assignee = aliasedTable(users, "assignee");
    const reporter = aliasedTable(users, "reporter");

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
                email: assignee.email
            },
            reporter: {
                id: reporter.id,
                name: reporter.name,
                avatarUrl: reporter.avatarUrl,
                email: reporter.email
            },
            project: { // return minimal project info
                id: projects.id,
                name: projects.name,
                identifier: projects.identifier
            },
            cycle: {
                id: cycles.id,
                name: cycles.name,
                startDate: cycles.startDate,
                endDate: cycles.endDate
            }
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
 * POST /
 * Create a new issue
 */
app.post("/", zValidator("json", createIssueSchema), async (c) => {
    const user = c.var.user;
    const data = c.req.valid("json");
    const db = createDrizzleClient(c.env.DB);

    // Check project access
    const member = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, data.projectId), eq(projectMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied to project" }, 403);
    }

    // Get next issue number for the project
    const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(issues)
        .where(eq(issues.projectId, data.projectId))
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
                identifier: projects.identifier
            },
            cycle: {
                id: cycles.id,
                name: cycles.name,
                startDate: cycles.startDate,
                endDate: cycles.endDate
            }
        })
        .from(issues)
        .leftJoin(assignee, eq(issues.assigneeId, assignee.id))
        .leftJoin(reporter, eq(issues.reporterId, reporter.id))
        .leftJoin(projects, eq(issues.projectId, projects.id))
        .leftJoin(cycles, eq(issues.cycleId, cycles.id))
        .where(eq(issues.id, issueId))
        .get();


    if (!issue) {
        return c.json({ error: "Issue not found" }, 404);
    }

    // Check access to project
    const member = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, issue.projectId), eq(projectMembers.userId, user.id)))
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
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, issue.projectId), eq(projectMembers.userId, user.id)))
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
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, issue.projectId), eq(projectMembers.userId, user.id)))
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

    // Check project access
    const member = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, issue.projectId), eq(projectMembers.userId, user.id)))
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
                email: users.email // Add email if useful
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

    // Check project access
    const member = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, issue.projectId), eq(projectMembers.userId, user.id)))
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
                email: users.email
            },
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.id, commentId))
        .get();

    return c.json(newComment, 201);
});

export default app;
