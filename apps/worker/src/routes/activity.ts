import { Hono } from "hono";
import { createDrizzleClient, activityLog, users, issues, workspaceMembers } from "@linearflow/database";
import { eq, and, desc } from "drizzle-orm";
import type { Env } from "../index";
import { authMiddleware, type Variables } from "../middleware/auth";

const app = new Hono<Env & { Variables: Variables }>();

app.use("*", authMiddleware);

/**
 * GET /issues/:issueId/activity
 * Get activity timeline for an issue
 */
app.get("/issues/:issueId/activity", async (c) => {
    const issueId = c.req.param("issueId");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    // Fetch issue to check workspace access
    const issue = await db
        .select({
            id: issues.id,
            workspaceId: issues.workspaceId,
        })
        .from(issues)
        .where(eq(issues.id, issueId))
        .get();

    if (!issue) {
        return c.json({ error: "Issue not found" }, 404);
    }

    // Check workspace membership
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, issue.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied to workspace" }, 403);
    }

    // Fetch activity log for this issue with actor info
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
            actor: {
                id: users.id,
                name: users.name,
                email: users.email,
                avatarUrl: users.avatarUrl,
            },
        })
        .from(activityLog)
        .innerJoin(users, eq(activityLog.userId, users.id))
        .where(eq(activityLog.issueId, issueId))
        .orderBy(desc(activityLog.createdAt));

    // Transform to API format
    const formattedActivities = activities.map((activity) => ({
        id: activity.id,
        type: `issue_${activity.action}` as const,
        actorId: activity.actor.id,
        actor: activity.actor,
        issueId,
        changes: activity.oldValue || activity.newValue
            ? {
                  from: activity.oldValue,
                  to: activity.newValue,
              }
            : undefined,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : undefined,
        createdAt: activity.createdAt,
    }));

    return c.json({ data: formattedActivities });
});

/**
 * GET /users/:userId/activity
 * Get activity feed for a user across all accessible workspaces
 */
app.get("/users/:userId/activity", async (c) => {
    const targetUserId = c.req.param("userId");
    const currentUser = c.var.user;
    const limit = parseInt(c.req.query("limit") || "50");
    const db = createDrizzleClient(c.env.DB);

    // Users can only view their own activity (or we could allow viewing public activity)
    // For now, let's restrict to own activity
    if (targetUserId !== currentUser.id) {
        return c.json({ error: "You can only view your own activity" }, 403);
    }

    // Get all workspaces the user is a member of
    const userWorkspaces = await db
        .select({ workspaceId: workspaceMembers.workspaceId })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, currentUser.id));

    const workspaceIds = userWorkspaces.map((w) => w.workspaceId);

    if (workspaceIds.length === 0) {
        return c.json({ data: [] });
    }

    // Fetch activity for this user across all their workspaces
    // Note: SQLite doesn't support IN with arrays directly in drizzle, so we need to handle this differently
    // For simplicity, we'll fetch all activities and filter in memory, or use a different approach
    // Let's fetch activities for this user across their workspaces

    const activities = await db
        .select({
            id: activityLog.id,
            workspaceId: activityLog.workspaceId,
            action: activityLog.action,
            entityType: activityLog.entityType,
            entityId: activityLog.entityId,
            issueId: activityLog.issueId,
            oldValue: activityLog.oldValue,
            newValue: activityLog.newValue,
            metadata: activityLog.metadata,
            createdAt: activityLog.createdAt,
            actor: {
                id: users.id,
                name: users.name,
                email: users.email,
                avatarUrl: users.avatarUrl,
            },
        })
        .from(activityLog)
        .innerJoin(users, eq(activityLog.userId, users.id))
        .where(eq(activityLog.userId, targetUserId))
        .orderBy(desc(activityLog.createdAt))
        .limit(limit);

    // Filter to only include activities from workspaces the user has access to
    const filteredActivities = activities.filter((activity) =>
        workspaceIds.includes(activity.workspaceId)
    );

    // Transform to API format
    const formattedActivities = filteredActivities.map((activity) => ({
        id: activity.id,
        type: `${activity.entityType}_${activity.action}` as const,
        actorId: activity.actor.id,
        actor: activity.actor,
        issueId: activity.issueId,
        changes: activity.oldValue || activity.newValue
            ? {
                  from: activity.oldValue,
                  to: activity.newValue,
              }
            : undefined,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : undefined,
        createdAt: activity.createdAt,
    }));

    return c.json({ data: formattedActivities });
});

export default app;
