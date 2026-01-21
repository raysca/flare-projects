import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDrizzleClient, issues, issueLabels, issueSubscribers, projectMembers, comments, commentReactions, users, labels, projects, cycles, activityLog, notifications } from "@linearflow/database";
import { eq, and, desc, sql, inArray, aliasedTable } from "drizzle-orm";
import type { Env } from "../index";
import { authMiddleware, type Variables } from "../middleware/auth";
import { WebSocketMessage } from "../durable-objects/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDB = ReturnType<typeof createDrizzleClient>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ContextWithEnv = any; // Helper type for binding access

// ... (previous types and helper functions)

// Helper to broadcast to IssueDO
async function broadcastToIssue(c: ContextWithEnv, issueId: string, message: WebSocketMessage) {
    try {
        const id = c.env.ISSUE_DO.idFromName(issueId);
        const stub = c.env.ISSUE_DO.get(id);
        c.executionCtx.waitUntil(stub.fetch("http://internal/broadcast", {
            method: "POST",
            body: JSON.stringify(message)
        }));
    } catch (e) {
        console.error("Failed to broadcast to IssueDO", e);
    }
}

// Helper to broadcast to WorkspaceDO (Project Scope)
async function broadcastToProject(c: ContextWithEnv, projectId: string, message: WebSocketMessage) {
    try {
        const id = c.env.WORKSPACE_DO.idFromName(projectId);
        const stub = c.env.WORKSPACE_DO.get(id);
        c.executionCtx.waitUntil(stub.fetch("http://internal/broadcast", {
            method: "POST",
            body: JSON.stringify(message)
        }));
    } catch (e) {
        console.error("Failed to broadcast to WorkspaceDO", e);
    }
}

// Status values for type safety
const STATUS_VALUES = ["backlog", "todo", "in_progress", "in_review", "done", "cancelled"] as const;
type IssueStatus = typeof STATUS_VALUES[number];

// Status transition rules - defines allowed transitions from each status
const STATUS_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
    backlog: ["todo", "in_progress", "cancelled"],
    todo: ["backlog", "in_progress", "cancelled"],
    in_progress: ["todo", "in_review", "done", "cancelled"],
    in_review: ["in_progress", "done", "cancelled"],
    done: ["in_progress", "in_review"], // Allow reopening
    cancelled: ["backlog", "todo"], // Allow uncancelling
};

// Helper function to validate status transition
function isValidStatusTransition(from: IssueStatus, to: IssueStatus): boolean {
    if (from === to) return true; // Same status is always valid
    return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// Helper function to get status timestamp updates
function getStatusTimestamps(newStatus: string, oldStatus?: string): Partial<{
    startedAt: Date | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
}> {
    const now = new Date();
    const updates: Partial<{
        startedAt: Date | null;
        completedAt: Date | null;
        cancelledAt: Date | null;
    }> = {};

    // Set startedAt when moving to in_progress for the first time
    if (newStatus === "in_progress" && oldStatus !== "in_progress") {
        updates.startedAt = now;
    }

    // Set completedAt when moving to done
    if (newStatus === "done") {
        updates.completedAt = now;
    } else if (oldStatus === "done" && newStatus !== "done") {
        // Clear completedAt when reopening
        updates.completedAt = null;
    }

    // Set cancelledAt when cancelling
    if (newStatus === "cancelled") {
        updates.cancelledAt = now;
    } else if (oldStatus === "cancelled" && newStatus !== "cancelled") {
        // Clear cancelledAt when uncancelling
        updates.cancelledAt = null;
    }

    return updates;
}

// Activity log action types
type ActivityAction = "created" | "updated" | "deleted" | "status_changed" | "assigned" | "unassigned" | "commented" | "labeled" | "unlabeled" | "archived" | "unarchived";

// Helper function to check for circular references in parent-child relationships
async function wouldCreateCircularReference(
    db: DrizzleDB,
    issueId: string,
    newParentId: string
): Promise<boolean> {
    // If setting parent to itself, it's circular
    if (issueId === newParentId) return true;

    // Walk up the parent chain from newParentId to check if we'd encounter issueId
    let currentId: string | null = newParentId;
    const visited = new Set<string>();

    while (currentId) {
        if (visited.has(currentId)) {
            // Already visited this node, there's an existing cycle (shouldn't happen with proper validation)
            return true;
        }
        visited.add(currentId);

        if (currentId === issueId) {
            // Found the issue we're trying to make a child - this would create a cycle
            return true;
        }

        const parent = await db
            .select({ parentId: issues.parentId })
            .from(issues)
            .where(eq(issues.id, currentId))
            .get();

        currentId = parent?.parentId || null;
    }

    return false;
}

// Helper function to log activity
async function logActivity(
    db: DrizzleDB,
    params: {
        projectId: string;
        userId: string;
        issueId?: string;
        action: ActivityAction;
        entityType: "issue" | "comment" | "project" | "cycle";
        entityId: string;
        oldValue?: string;
        newValue?: string;
        metadata?: Record<string, unknown>;
    }
) {
    await db.insert(activityLog).values({
        id: crypto.randomUUID(),
        projectId: params.projectId,
        userId: params.userId,
        issueId: params.issueId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValue: params.oldValue,
        newValue: params.newValue,
        metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
    });
}

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

    // Validate parent issue if provided
    if (data.parentId) {
        const parentIssue = await db
            .select({ id: issues.id, projectId: issues.projectId })
            .from(issues)
            .where(eq(issues.id, data.parentId))
            .get();

        if (!parentIssue) {
            return c.json({ error: "Parent issue not found" }, 404);
        }

        // Ensure parent is in the same project
        if (parentIssue.projectId !== data.projectId) {
            return c.json({ error: "Parent issue must be in the same project" }, 400);
        }
    }

    // Get next issue number for the project
    const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(issues)
        .where(eq(issues.projectId, data.projectId))
        .get();

    const nextNumber = (countResult?.count || 0) + 1;
    const issueId = crypto.randomUUID();

    // Get status timestamps if status is set to something other than backlog
    const statusTimestamps = data.status ? getStatusTimestamps(data.status) : {};

    // Create issue
    await db.insert(issues).values({
        id: issueId,
        ...data,
        number: nextNumber,
        reporterId: user.id,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        ...statusTimestamps,
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

    // Auto-subscribe reporter to the issue
    await db.insert(issueSubscribers).values({
        id: crypto.randomUUID(),
        issueId: issueId,
        userId: user.id,
    });

    // Auto-subscribe assignee if different from reporter
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
        action: "created",
        entityType: "issue",
        entityId: issueId,
        metadata: {
            title: data.title,
            status: data.status || "backlog",
            priority: data.priority || "no_priority",
        },
    });

    const newIssue = await db.select().from(issues).where(eq(issues.id, issueId)).get();

    if (newIssue) {
        // Broadcast to project
        await broadcastToProject(c, data.projectId, {
            type: "issue_created",
            payload: newIssue,
            senderId: user.id,
            timestamp: Date.now()
        });
    }

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

    // Validate status transition if status is being changed
    if (data.status && data.status !== issue.status) {
        if (!isValidStatusTransition(issue.status as IssueStatus, data.status)) {
            return c.json({
                error: `Invalid status transition from "${issue.status}" to "${data.status}"`,
                allowedTransitions: STATUS_TRANSITIONS[issue.status as IssueStatus],
            }, 400);
        }
    }

    // Validate parent issue if being changed
    if (data.parentId !== undefined && data.parentId !== issue.parentId) {
        if (data.parentId !== null) {
            // Check if parent exists and is in the same project
            const parentIssue = await db
                .select({ id: issues.id, projectId: issues.projectId })
                .from(issues)
                .where(eq(issues.id, data.parentId))
                .get();

            if (!parentIssue) {
                return c.json({ error: "Parent issue not found" }, 404);
            }

            const targetProjectId = data.projectId || issue.projectId;
            if (parentIssue.projectId !== targetProjectId) {
                return c.json({ error: "Parent issue must be in the same project" }, 400);
            }

            // Check for circular reference
            if (await wouldCreateCircularReference(db, issueId, data.parentId)) {
                return c.json({ error: "Cannot set parent: would create circular reference" }, 400);
            }
        }
    }

    // Extract labelIds to handle separately
    const { labelIds, ...updateData } = data;

    // Get status timestamps if status is changing
    const statusTimestamps = data.status ? getStatusTimestamps(data.status, issue.status as IssueStatus) : {};

    // Build update object, handling null values explicitly
    const updateValues: Record<string, unknown> = {
        updatedAt: new Date(),
        ...statusTimestamps,
    };

    // Handle each field, preserving null for clearing values
    if (updateData.title !== undefined) updateValues.title = updateData.title;
    if (updateData.description !== undefined) updateValues.description = updateData.description;
    if (updateData.status !== undefined) updateValues.status = updateData.status;
    if (updateData.priority !== undefined) updateValues.priority = updateData.priority;
    if (updateData.type !== undefined) updateValues.type = updateData.type;
    if (updateData.assigneeId !== undefined) updateValues.assigneeId = updateData.assigneeId;
    if (updateData.projectId !== undefined) updateValues.projectId = updateData.projectId;
    if (updateData.cycleId !== undefined) updateValues.cycleId = updateData.cycleId;
    if (updateData.parentId !== undefined) updateValues.parentId = updateData.parentId;
    if (updateData.estimate !== undefined) updateValues.estimate = updateData.estimate;
    if (updateData.dueDate !== undefined) {
        updateValues.dueDate = updateData.dueDate ? new Date(updateData.dueDate) : null;
    }

    // DB Update
    await db
        .update(issues)
        .set(updateValues)
        .where(eq(issues.id, issueId));

    // Sync Labels if provided
    if (labelIds !== undefined) {
        // Get current labels for activity logging
        const currentLabels = await db
            .select({ labelId: issueLabels.labelId })
            .from(issueLabels)
            .where(eq(issueLabels.issueId, issueId));
        const currentLabelIds = currentLabels.map(l => l.labelId);

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

        // Log label changes
        const addedLabels = labelIds.filter(id => !currentLabelIds.includes(id));
        const removedLabels = currentLabelIds.filter(id => !labelIds.includes(id));

        if (addedLabels.length > 0) {
            await logActivity(db, {
                projectId: issue.projectId,
                userId: user.id,
                issueId: issueId,
                action: "labeled",
                entityType: "issue",
                entityId: issueId,
                newValue: addedLabels.join(","),
            });
        }

        if (removedLabels.length > 0) {
            await logActivity(db, {
                projectId: issue.projectId,
                userId: user.id,
                issueId: issueId,
                action: "unlabeled",
                entityType: "issue",
                entityId: issueId,
                oldValue: removedLabels.join(","),
            });
        }
    }

    // Log status change
    if (data.status && data.status !== issue.status) {
        await logActivity(db, {
            projectId: issue.projectId,
            userId: user.id,
            issueId: issueId,
            action: "status_changed",
            entityType: "issue",
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
                action: "unassigned",
                entityType: "issue",
                entityId: issueId,
                oldValue: issue.assigneeId,
            });
        } else if (data.assigneeId) {
            await logActivity(db, {
                projectId: issue.projectId,
                userId: user.id,
                issueId: issueId,
                action: "assigned",
                entityType: "issue",
                entityId: issueId,
                oldValue: issue.assigneeId || undefined,
                newValue: data.assigneeId,
            });

            // Auto-subscribe new assignee if not already subscribed
            const existingSub = await db
                .select()
                .from(issueSubscribers)
                .where(and(eq(issueSubscribers.issueId, issueId), eq(issueSubscribers.userId, data.assigneeId)))
                .get();

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
    const otherFieldsChanged = Object.keys(updateData).filter(
        key => key !== "status" && key !== "assigneeId" && updateData[key as keyof typeof updateData] !== undefined
    ).length > 0;

    if (otherFieldsChanged) {
        await logActivity(db, {
            projectId: issue.projectId,
            userId: user.id,
            issueId: issueId,
            action: "updated",
            entityType: "issue",
            entityId: issueId,
            metadata: { fields: Object.keys(updateData) },
        });
    }

    const updatedIssue = await db.select().from(issues).where(eq(issues.id, issueId)).get();

    if (updatedIssue) {
        // Broadcast to issue room
        await broadcastToIssue(c, issueId, {
            type: "issue_updated",
            payload: updatedIssue,
            senderId: user.id,
            timestamp: Date.now()
        });

        // Broadcast to project room
        await broadcastToProject(c, issue.projectId, {
            type: "issue_updated",
            payload: updatedIssue,
            senderId: user.id,
            timestamp: Date.now()
        });
    }

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

    // Log activity before deletion
    await logActivity(db, {
        projectId: issue.projectId,
        userId: user.id,
        issueId: issueId,
        action: "deleted",
        entityType: "issue",
        entityId: issueId,
        metadata: {
            title: issue.title,
            number: issue.number,
        },
    });

    await db.delete(issues).where(eq(issues.id, issueId));

    // Broadcast to issue room (so viewers know it's gone)
    await broadcastToIssue(c, issueId, {
        type: "issue_deleted",
        payload: { id: issueId },
        senderId: user.id,
        timestamp: Date.now()
    });

    // Broadcast to project room (remove from lists)
    await broadcastToProject(c, issue.projectId, {
        type: "issue_deleted",
        payload: { id: issueId },
        senderId: user.id,
        timestamp: Date.now()
    });

    return c.json({ message: "Issue deleted" });
});

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
                email: users.email
            },
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.issueId, issueId))
        .orderBy(desc(comments.createdAt));

    const commentIds = result.map(c => c.id);
    let reactions: any[] = [];

    if (commentIds.length > 0) {
        reactions = await db
            .select()
            .from(commentReactions)
            .where(inArray(commentReactions.commentId, commentIds));
    }

    const commentsWithReactions = result.map(comment => ({
        ...comment,
        reactions: reactions.filter(r => r.commentId === comment.id)
    }));

    return c.json(commentsWithReactions);
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

    // Log activity for comment
    await logActivity(db, {
        projectId: issue.projectId,
        userId: user.id,
        issueId: issueId,
        action: "commented",
        entityType: "comment",
        entityId: commentId,
    });

    // Mention detection (simple email matching)
    const mentionRegex = /@([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
    const mentions = new Set<string>();
    let match;
    while ((match = mentionRegex.exec(body)) !== null) {
        mentions.add(match[1]);
    }

    if (mentions.size > 0) {
        // Fetch sender details
        const sender = await db.select({ name: users.name }).from(users).where(eq(users.id, user.id)).get();
        const senderName = sender?.name || user.email;

        const mentionedUsers = await db
            .select()
            .from(users)
            .where(inArray(users.email, Array.from(mentions)));

        for (const mentionedUser of mentionedUsers) {
            if (mentionedUser.id === user.id) continue;

            await db.insert(notifications).values({
                id: crypto.randomUUID(),
                userId: mentionedUser.id,
                projectId: issue.projectId,
                type: "comment_mentioned",
                title: `New mention in issue #${issue.number}`,
                message: `${senderName} mentioned you in a comment`,
                issueId: issue.id,
                createdAt: new Date(),
                isRead: false
            });
        }
    }

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

    if (newComment) {
        await broadcastToIssue(c, issueId, {
            type: "comment_created",
            payload: newComment,
            senderId: user.id,
            timestamp: Date.now()
        });
    }

    return c.json(newComment, 201);
});

/**
 * POST /:id/comments/:commentId/reactions
 * Toggle a reaction on a comment
 */
app.post("/:id/comments/:commentId/reactions", zValidator("json", z.object({ emoji: z.string().min(1) })), async (c) => {
    const issueId = c.req.param("id");
    const commentId = c.req.param("commentId");
    const user = c.var.user;
    const { emoji } = c.req.valid("json");
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

    // Check if comment exists
    const comment = await db
        .select()
        .from(comments)
        .where(and(eq(comments.id, commentId), eq(comments.issueId, issueId)))
        .get();

    if (!comment) {
        return c.json({ error: "Comment not found" }, 404);
    }

    // Check for existing reaction
    const existingReaction = await db
        .select()
        .from(commentReactions)
        .where(
            and(
                eq(commentReactions.commentId, commentId),
                eq(commentReactions.userId, user.id),
                eq(commentReactions.emoji, emoji)
            )
        )
        .get();

    if (existingReaction) {
        // Remove reaction
        await db
            .delete(commentReactions)
            .where(eq(commentReactions.id, existingReaction.id));

        // Broadcast removal
        await broadcastToIssue(c, issueId, {
            type: "comment_reaction_removed",
            payload: {
                commentId,
                reactionId: existingReaction.id,
                userId: user.id,
                emoji
            },
            senderId: user.id,
            timestamp: Date.now()
        });

        return c.json({ message: "Reaction removed" });
    } else {
        // Add reaction
        const reactionId = crypto.randomUUID();
        await db.insert(commentReactions).values({
            id: reactionId,
            commentId,
            userId: user.id,
            emoji
        });

        // Broadcast addition
        await broadcastToIssue(c, issueId, {
            type: "comment_reaction_added",
            payload: {
                commentId,
                reactionId,
                userId: user.id,
                emoji,
                createdAt: new Date().toISOString()
            },
            senderId: user.id,
            timestamp: Date.now()
        });

        return c.json({ message: "Reaction added", id: reactionId }, 201);
    }
});

/**
 * GET /:id/sub-issues
 * List sub-issues (children) of an issue
 */
app.get("/:id/sub-issues", async (c) => {
    const issueId = c.req.param("id");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    const parentIssue = await db.select().from(issues).where(eq(issues.id, issueId)).get();

    if (!parentIssue) {
        return c.json({ error: "Issue not found" }, 404);
    }

    // Check project access
    const member = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, parentIssue.projectId), eq(projectMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    // Get all sub-issues (direct children)
    const assignee = aliasedTable(users, "assignee");

    const subIssues = await db
        .select({
            id: issues.id,
            number: issues.number,
            title: issues.title,
            status: issues.status,
            priority: issues.priority,
            type: issues.type,
            assigneeId: issues.assigneeId,
            estimate: issues.estimate,
            dueDate: issues.dueDate,
            createdAt: issues.createdAt,
            assignee: {
                id: assignee.id,
                name: assignee.name,
                avatarUrl: assignee.avatarUrl,
            },
        })
        .from(issues)
        .leftJoin(assignee, eq(issues.assigneeId, assignee.id))
        .where(eq(issues.parentId, issueId))
        .orderBy(issues.sortOrder, issues.createdAt);

    return c.json(subIssues);
});

/**
 * GET /:id/activity
 * Get activity log for an issue
 */
app.get("/:id/activity", async (c) => {
    const issueId = c.req.param("id");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");

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

    const activities = await db
        .select({
            id: activityLog.id,
            action: activityLog.action,
            entityType: activityLog.entityType,
            entityId: activityLog.entityId,
            oldValue: activityLog.oldValue,
            newValue: activityLog.newValue,
            metadata: activityLog.metadata,
            createdAt: activityLog.createdAt,
            user: {
                id: users.id,
                name: users.name,
                avatarUrl: users.avatarUrl,
            },
        })
        .from(activityLog)
        .innerJoin(users, eq(activityLog.userId, users.id))
        .where(eq(activityLog.issueId, issueId))
        .orderBy(desc(activityLog.createdAt))
        .limit(limit)
        .offset(offset);

    return c.json(activities);
});

/**
 * GET /:id/subscribers
 * List subscribers of an issue
 */
app.get("/:id/subscribers", async (c) => {
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

    const subscribers = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            avatarUrl: users.avatarUrl,
            subscribedAt: issueSubscribers.createdAt,
        })
        .from(issueSubscribers)
        .innerJoin(users, eq(issueSubscribers.userId, users.id))
        .where(eq(issueSubscribers.issueId, issueId));

    return c.json(subscribers);
});

/**
 * POST /:id/subscribe
 * Subscribe to an issue
 */
app.post("/:id/subscribe", async (c) => {
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

    // Check if already subscribed
    const existingSubscription = await db
        .select()
        .from(issueSubscribers)
        .where(and(eq(issueSubscribers.issueId, issueId), eq(issueSubscribers.userId, user.id)))
        .get();

    if (existingSubscription) {
        return c.json({ message: "Already subscribed" });
    }

    await db.insert(issueSubscribers).values({
        id: crypto.randomUUID(),
        issueId: issueId,
        userId: user.id,
    });

    return c.json({ message: "Subscribed successfully" }, 201);
});

/**
 * DELETE /:id/subscribe
 * Unsubscribe from an issue
 */
app.delete("/:id/subscribe", async (c) => {
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

    await db
        .delete(issueSubscribers)
        .where(and(eq(issueSubscribers.issueId, issueId), eq(issueSubscribers.userId, user.id)));

    return c.json({ message: "Unsubscribed successfully" });
});

/**
 * POST /:id/archive
 * Archive an issue
 */
app.post("/:id/archive", async (c) => {
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

    if (issue.archivedAt) {
        return c.json({ error: "Issue is already archived" }, 400);
    }

    await db
        .update(issues)
        .set({
            archivedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(issues.id, issueId));

    // Log activity
    await logActivity(db, {
        projectId: issue.projectId,
        userId: user.id,
        issueId: issueId,
        action: "archived",
        entityType: "issue",
        entityId: issueId,
    });

    const updatedIssue = await db.select().from(issues).where(eq(issues.id, issueId)).get();

    return c.json(updatedIssue);
});

/**
 * POST /:id/unarchive
 * Unarchive an issue
 */
app.post("/:id/unarchive", async (c) => {
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

    if (!issue.archivedAt) {
        return c.json({ error: "Issue is not archived" }, 400);
    }

    await db
        .update(issues)
        .set({
            archivedAt: null,
            updatedAt: new Date(),
        })
        .where(eq(issues.id, issueId));

    // Log activity
    await logActivity(db, {
        projectId: issue.projectId,
        userId: user.id,
        issueId: issueId,
        action: "unarchived",
        entityType: "issue",
        entityId: issueId,
    });

    const updatedIssue = await db.select().from(issues).where(eq(issues.id, issueId)).get();

    return c.json(updatedIssue);
});

/**
 * GET /:id/ws
 * Connect to issue WebSocket (IssueDO)
 */
app.get("/:id/ws", async (c) => {
    const issueId = c.req.param("id");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    const issue = await db.select({ projectId: issues.projectId }).from(issues).where(eq(issues.id, issueId)).get();

    if (!issue) {
        return c.json({ error: "Issue not found" }, 404);
    }

    // Check membership
    const member = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, issue.projectId), eq(projectMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    const userDetails = await db.select({ name: users.name }).from(users).where(eq(users.id, user.id)).get();
    const userName = userDetails?.name || user.email;

    const id = c.env.ISSUE_DO.idFromName(issueId);
    const stub = c.env.ISSUE_DO.get(id);

    const url = new URL(c.req.url);
    url.searchParams.set("userId", user.id);
    url.searchParams.set("userName", userName);

    return stub.fetch(url.toString(), c.req.raw);
});

export default app;
