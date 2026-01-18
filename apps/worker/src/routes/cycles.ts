import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDrizzleClient, cycles, teams, workspaceMembers, issues } from "@linearflow/database";
import { eq, and, desc, sql, count } from "drizzle-orm";
import type { Env } from "../index";
import { authMiddleware, type Variables } from "../middleware/auth";

const app = new Hono<Env & { Variables: Variables }>();

app.use("*", authMiddleware);

// Validation schemas
const createCycleSchema = z.object({
    name: z.string().min(1, "Cycle name is required"),
    description: z.string().optional(),
    startDate: z.string().datetime(), // ISO 8601 datetime string
    endDate: z.string().datetime(),
    status: z.enum(["upcoming", "active", "completed"]).default("upcoming"),
    autoArchive: z.boolean().default(true),
});

const updateCycleSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.enum(["upcoming", "active", "completed"]).optional(),
    autoArchive: z.boolean().optional(),
    progress: z.number().min(0).max(100).optional(),
});

/**
 * GET /teams/:teamId/cycles
 * List all cycles for a team
 */
app.get("/teams/:teamId/cycles", async (c) => {
    const teamId = c.req.param("teamId");
    const user = c.var.user;
    const statusFilter = c.req.query("status") as "upcoming" | "active" | "completed" | undefined;
    const db = createDrizzleClient(c.env.DB);

    // Get team and check workspace membership
    const team = await db.select().from(teams).where(eq(teams.id, teamId)).get();

    if (!team) {
        return c.json({ error: "Team not found" }, 404);
    }

    // Check workspace membership
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, team.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied to workspace" }, 403);
    }

    // Build query conditions
    const conditions = [eq(cycles.teamId, teamId)];
    if (statusFilter) {
        conditions.push(eq(cycles.status, statusFilter));
    }

    // Fetch cycles with issue counts
    const allCycles = await db
        .select({
            id: cycles.id,
            workspaceId: cycles.workspaceId,
            teamId: cycles.teamId,
            name: cycles.name,
            description: cycles.description,
            number: cycles.number,
            status: cycles.status,
            startDate: cycles.startDate,
            endDate: cycles.endDate,
            autoArchive: cycles.autoArchive,
            progress: cycles.progress,
            createdAt: cycles.createdAt,
            updatedAt: cycles.updatedAt,
        })
        .from(cycles)
        .where(and(...conditions))
        .orderBy(desc(cycles.number));

    // Get issue counts for each cycle
    const cyclesWithCounts = await Promise.all(
        allCycles.map(async (cycle) => {
            // Count total issues in cycle
            const totalIssues = await db
                .select({ count: count() })
                .from(issues)
                .where(eq(issues.cycleId, cycle.id))
                .get();

            // Count completed issues (status = 'done' or 'cancelled')
            const completedIssues = await db
                .select({ count: count() })
                .from(issues)
                .where(
                    and(
                        eq(issues.cycleId, cycle.id),
                        sql`${issues.status} IN ('done', 'cancelled')`
                    )
                )
                .get();

            return {
                ...cycle,
                issueCount: totalIssues?.count || 0,
                completedIssueCount: completedIssues?.count || 0,
            };
        })
    );

    return c.json({ data: cyclesWithCounts });
});

/**
 * POST /teams/:teamId/cycles
 * Create a new cycle for a team
 */
app.post("/teams/:teamId/cycles", zValidator("json", createCycleSchema), async (c) => {
    const teamId = c.req.param("teamId");
    const user = c.var.user;
    const data = c.req.valid("json");
    const db = createDrizzleClient(c.env.DB);

    // Get team and check workspace membership
    const team = await db.select().from(teams).where(eq(teams.id, teamId)).get();

    if (!team) {
        return c.json({ error: "Team not found" }, 404);
    }

    // Check workspace membership
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, team.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied to workspace" }, 403);
    }

    // Validate dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate <= startDate) {
        return c.json({ error: "End date must be after start date" }, 400);
    }

    // Get the next cycle number for this team
    const lastCycle = await db
        .select({ number: cycles.number })
        .from(cycles)
        .where(eq(cycles.teamId, teamId))
        .orderBy(desc(cycles.number))
        .limit(1)
        .get();

    const nextNumber = (lastCycle?.number || 0) + 1;

    // Create cycle
    const cycleId = crypto.randomUUID();

    await db.insert(cycles).values({
        id: cycleId,
        workspaceId: team.workspaceId,
        teamId: teamId,
        name: data.name,
        description: data.description,
        number: nextNumber,
        status: data.status,
        startDate,
        endDate,
        autoArchive: data.autoArchive,
        progress: 0,
    });

    const newCycle = await db.select().from(cycles).where(eq(cycles.id, cycleId)).get();

    return c.json(newCycle, 201);
});

/**
 * GET /cycles/:cycleId
 * Get cycle details with issue counts and team info
 */
app.get("/cycles/:cycleId", async (c) => {
    const cycleId = c.req.param("cycleId");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    // Fetch cycle with team information
    const cycle = await db
        .select({
            id: cycles.id,
            workspaceId: cycles.workspaceId,
            teamId: cycles.teamId,
            name: cycles.name,
            description: cycles.description,
            number: cycles.number,
            status: cycles.status,
            startDate: cycles.startDate,
            endDate: cycles.endDate,
            autoArchive: cycles.autoArchive,
            progress: cycles.progress,
            createdAt: cycles.createdAt,
            updatedAt: cycles.updatedAt,
            team: {
                id: teams.id,
                name: teams.name,
                key: teams.key,
                color: teams.color,
            },
        })
        .from(cycles)
        .leftJoin(teams, eq(cycles.teamId, teams.id))
        .where(eq(cycles.id, cycleId))
        .get();

    if (!cycle) {
        return c.json({ error: "Cycle not found" }, 404);
    }

    // Check workspace membership
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, cycle.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied to workspace" }, 403);
    }

    // Count total issues in cycle
    const totalIssues = await db
        .select({ count: count() })
        .from(issues)
        .where(eq(issues.cycleId, cycle.id))
        .get();

    // Count completed issues (status = 'done' or 'cancelled')
    const completedIssues = await db
        .select({ count: count() })
        .from(issues)
        .where(
            and(
                eq(issues.cycleId, cycle.id),
                sql`${issues.status} IN ('done', 'cancelled')`
            )
        )
        .get();

    const cycleWithCounts = {
        ...cycle,
        issueCount: totalIssues?.count || 0,
        completedIssueCount: completedIssues?.count || 0,
    };

    return c.json(cycleWithCounts);
});

/**
 * PATCH /cycles/:cycleId
 * Update cycle
 */
app.patch("/cycles/:cycleId", zValidator("json", updateCycleSchema), async (c) => {
    const cycleId = c.req.param("cycleId");
    const user = c.var.user;
    const data = c.req.valid("json");
    const db = createDrizzleClient(c.env.DB);

    // Fetch existing cycle
    const cycle = await db.select().from(cycles).where(eq(cycles.id, cycleId)).get();

    if (!cycle) {
        return c.json({ error: "Cycle not found" }, 404);
    }

    // Check workspace membership
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, cycle.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied to workspace" }, 403);
    }

    // Validate dates if both are provided
    if (data.startDate && data.endDate) {
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);

        if (endDate <= startDate) {
            return c.json({ error: "End date must be after start date" }, 400);
        }
    }

    // Update cycle
    await db
        .update(cycles)
        .set({
            name: data.name,
            description: data.description,
            startDate: data.startDate ? new Date(data.startDate) : undefined,
            endDate: data.endDate ? new Date(data.endDate) : undefined,
            status: data.status,
            autoArchive: data.autoArchive,
            progress: data.progress,
            updatedAt: new Date(),
        })
        .where(eq(cycles.id, cycleId));

    const updated = await db.select().from(cycles).where(eq(cycles.id, cycleId)).get();

    return c.json(updated);
});

/**
 * DELETE /cycles/:cycleId
 * Delete cycle (issues in the cycle will have cycleId set to null)
 */
app.delete("/cycles/:cycleId", async (c) => {
    const cycleId = c.req.param("cycleId");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    // Fetch existing cycle
    const cycle = await db.select().from(cycles).where(eq(cycles.id, cycleId)).get();

    if (!cycle) {
        return c.json({ error: "Cycle not found" }, 404);
    }

    // Check workspace membership
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, cycle.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied to workspace" }, 403);
    }

    // Delete cycle (issues will have cycleId set to null due to onDelete: "set null")
    await db.delete(cycles).where(eq(cycles.id, cycleId));

    return c.json({ message: "Cycle deleted successfully" }, 200);
});

export default app;
