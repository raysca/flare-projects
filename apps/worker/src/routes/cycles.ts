import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDrizzleClient, cycles, projectMembers } from "@linearflow/database";
import { eq, and, desc } from "drizzle-orm";
import type { Env } from "../index";
import { authMiddleware, type Variables } from "../middleware/auth";

const app = new Hono<Env & { Variables: Variables }>();

app.use("*", authMiddleware);

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
    status: z.enum(["upcoming", "active", "completed"]).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    autoArchive: z.boolean().optional(),
    progress: z.number().min(0).max(100).optional(),
});

/**
 * GET /
 * List cycles for a project
 */
app.get("/", async (c) => {
    const user = c.var.user;
    const projectId = c.req.query("projectId");
    const status = c.req.query("status");
    const db = createDrizzleClient(c.env.DB);

    if (!projectId) {
        return c.json({ error: "projectId is required" }, 400);
    }

    // Check membership
    const member = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    const conditions = [eq(cycles.projectId, projectId)];
    if (status) {
        conditions.push(eq(cycles.status, status as any));
    }

    const result = await db
        .select()
        .from(cycles)
        .where(and(...conditions))
        // Order by start date descending
        .orderBy(desc(cycles.startDate));

    return c.json(result);
});

/**
 * POST /
 * Create a new cycle
 */
app.post("/", zValidator("json", createCycleSchema), async (c) => {
    const user = c.var.user;
    const data = c.req.valid("json");
    const db = createDrizzleClient(c.env.DB);

    // Check membership
    const member = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, data.projectId), eq(projectMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    const cycleId = crypto.randomUUID();

    // Determine cycle number for project
    const countResult = await db
        .select({ count: cycles.id })
        .from(cycles)
        .where(eq(cycles.projectId, data.projectId))
        .all();

    const nextNumber = countResult.length + 1;

    // Determine initial status based on dates
    const now = new Date();
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    let status: "upcoming" | "active" | "completed" = "upcoming";

    if (now >= start && now <= end) {
        status = "active";
    } else if (now > end) {
        status = "completed";
    }

    await db.insert(cycles).values({
        id: cycleId,
        ...data,
        startDate: start,
        endDate: end,
        number: nextNumber,
        status,
    });

    const newCycle = await db.select().from(cycles).where(eq(cycles.id, cycleId)).get();

    return c.json(newCycle, 201);
});

/**
 * GET /:id
 * Get cycle details
 */
app.get("/:id", async (c) => {
    const cycleId = c.req.param("id");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    const cycle = await db.select().from(cycles).where(eq(cycles.id, cycleId)).get();

    if (!cycle) {
        return c.json({ error: "Cycle not found" }, 404);
    }

    // Check membership
    const member = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, cycle.projectId), eq(projectMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    return c.json(cycle);
});

/**
 * PUT /:id
 * Update cycle
 */
app.put("/:id", zValidator("json", updateCycleSchema), async (c) => {
    const cycleId = c.req.param("id");
    const user = c.var.user;
    const data = c.req.valid("json");
    const db = createDrizzleClient(c.env.DB);

    const cycle = await db.select().from(cycles).where(eq(cycles.id, cycleId)).get();

    if (!cycle) {
        return c.json({ error: "Cycle not found" }, 404);
    }

    const member = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, cycle.projectId), eq(projectMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    const updates: any = {
        ...data,
        updatedAt: new Date(),
    };

    if (data.startDate) updates.startDate = new Date(data.startDate);
    if (data.endDate) updates.endDate = new Date(data.endDate);

    await db.update(cycles).set(updates).where(eq(cycles.id, cycleId));

    const updated = await db.select().from(cycles).where(eq(cycles.id, cycleId)).get();

    return c.json(updated);
});

/**
 * DELETE /:id
 * Delete cycle
 */
app.delete("/:id", async (c) => {
    const cycleId = c.req.param("id");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    const cycle = await db.select().from(cycles).where(eq(cycles.id, cycleId)).get();

    if (!cycle) {
        return c.json({ error: "Cycle not found" }, 404);
    }

    const member = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, cycle.projectId), eq(projectMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    await db.delete(cycles).where(eq(cycles.id, cycleId));

    return c.json({ message: "Cycle deleted" });
});

export default app;
