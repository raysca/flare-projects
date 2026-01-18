import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDrizzleClient, projects, workspaceMembers, users } from "@linearflow/database";
import { eq, and, desc } from "drizzle-orm";
import type { Env } from "../index";
import { authMiddleware, type Variables } from "../middleware/auth";

const app = new Hono<Env & { Variables: Variables }>();

app.use("*", authMiddleware);

const createProjectSchema = z.object({
    workspaceId: z.string().uuid(),
    name: z.string().min(1),
    identifier: z.string().min(1).max(5).regex(/^[A-Z0-9]+$/), // e.g. "Q1"
    description: z.string().optional(),
    status: z.enum(["planned", "active", "paused", "completed", "cancelled"]).default("planned"),
    leadId: z.string().uuid().optional(),
    startDate: z.string().datetime().optional(),
    targetDate: z.string().datetime().optional(),
});

const updateProjectSchema = z.object({
    name: z.string().min(1).optional(),
    identifier: z.string().min(1).max(5).regex(/^[A-Z0-9]+$/).optional(),
    description: z.string().optional(),
    status: z.enum(["planned", "active", "paused", "completed", "cancelled"]).optional(),
    leadId: z.string().uuid().optional().nullable(),
    startDate: z.string().datetime().optional().nullable(),
    targetDate: z.string().datetime().optional().nullable(),
    progress: z.number().min(0).max(100).optional(),
});

/**
 * GET /
 * List projects for a workspace
 */
app.get("/", async (c) => {
    const user = c.var.user;
    const workspaceId = c.req.query("workspaceId");
    const db = createDrizzleClient(c.env.DB);

    if (!workspaceId) {
        return c.json({ error: "workspaceId is required" }, 400);
    }

    // Check membership
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    const allProjects = await db
        .select({
            id: projects.id,
            name: projects.name,
            identifier: projects.identifier,
            status: projects.status,
            progress: projects.progress,
            targetDate: projects.targetDate,
            lead: {
                id: users.id,
                name: users.name,
                avatarUrl: users.avatarUrl
            },
            workspaceId: projects.workspaceId // Helpful for client
        })
        .from(projects)
        .leftJoin(users, eq(projects.leadId, users.id))
        .where(eq(projects.workspaceId, workspaceId))
        .orderBy(desc(projects.createdAt));

    return c.json(allProjects);
});

/**
 * POST /
 * Create a new project
 */
app.post("/", zValidator("json", createProjectSchema), async (c) => {
    const user = c.var.user;
    const data = c.req.valid("json");
    const db = createDrizzleClient(c.env.DB);

    // Check membership
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, data.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    const projectId = crypto.randomUUID();

    await db.insert(projects).values({
        id: projectId,
        ...data,
        identifier: data.identifier.toUpperCase(),
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
    });

    const newProject = await db.select().from(projects).where(eq(projects.id, projectId)).get();

    return c.json(newProject, 201);
});

/**
 * GET /:id
 * Get project details
 */
app.get("/:id", async (c) => {
    const projectId = c.req.param("id");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    const project = await db
        .select({
            id: projects.id,
            workspaceId: projects.workspaceId,
            teamId: projects.teamId,
            name: projects.name,
            identifier: projects.identifier,
            description: projects.description,
            status: projects.status,
            progress: projects.progress,
            startDate: projects.startDate,
            targetDate: projects.targetDate,
            createdAt: projects.createdAt,
            lead: {
                id: users.id,
                name: users.name,
                email: users.email,
                avatarUrl: users.avatarUrl
            }
        })
        .from(projects)
        .leftJoin(users, eq(projects.leadId, users.id))
        .where(eq(projects.id, projectId))
        .get();

    if (!project) {
        return c.json({ error: "Project not found" }, 404);
    }

    // Check membership
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    return c.json(project);
});

/**
 * PUT /:id
 * Update project
 */
app.put("/:id", zValidator("json", updateProjectSchema), async (c) => {
    const projectId = c.req.param("id");
    const user = c.var.user;
    const data = c.req.valid("json");
    const db = createDrizzleClient(c.env.DB);

    const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();

    if (!project) {
        return c.json({ error: "Project not found" }, 404);
    }

    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    await db.update(projects).set({
        ...data,
        identifier: data.identifier?.toUpperCase(),
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
        updatedAt: new Date(),
    }).where(eq(projects.id, projectId));

    const updated = await db.select().from(projects).where(eq(projects.id, projectId)).get();

    return c.json(updated);
});

/**
 * DELETE /:id
 * Delete project
 */
app.delete("/:id", async (c) => {
    const projectId = c.req.param("id");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();

    if (!project) {
        return c.json({ error: "Project not found" }, 404);
    }

    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    // Optional: Check permissions (e.g. only admin or project lead can delete?)
    // For now, allow any member for simplicity, or maybe restricted to workspace admin in future.

    await db.delete(projects).where(eq(projects.id, projectId));

    return c.json({ message: "Project deleted" });
});

export default app;
