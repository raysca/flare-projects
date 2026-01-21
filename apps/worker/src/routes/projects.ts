import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDrizzleClient, projects, projectMembers, users, labels } from "@linearflow/database";
import { eq, and, desc, inArray } from "drizzle-orm";
import type { Env } from "../index";
import { authMiddleware, type Variables } from "../middleware/auth";

const app = new Hono<Env & { Variables: Variables }>();

app.use("*", authMiddleware);

const createProjectSchema = z.object({
    name: z.string().min(1),
    identifier: z.string().min(1).max(5).regex(/^[A-Z0-9]+$/), // e.g. "Q1"
    description: z.string().optional(),
    status: z.enum(["planned", "active", "paused", "completed", "cancelled"]).default("planned"),
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

const addMemberSchema = z.object({
    email: z.string().email(),
    role: z.string().default("Member"),
});

/**
 * GET /
 * List projects the user is a member of
 */
app.get("/", async (c) => {
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    // Find all project IDs where user is a member
    const memberships = await db
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.userId, user.id));

    const projectIds = memberships.map(m => m.projectId);

    if (projectIds.length === 0) {
        return c.json([]);
    }

    const allProjects = await db
        .select({
            id: projects.id,
            name: projects.name,
            identifier: projects.identifier,
            status: projects.status,
            progress: projects.progress,
            targetDate: projects.targetDate,
            description: projects.description,
            lead: {
                id: users.id,
                name: users.name,
                avatarUrl: users.avatarUrl
            },
            role: projectMembers.role // User's role in the project
        })
        .from(projects)
        .innerJoin(projectMembers, and(
            eq(projects.id, projectMembers.projectId),
            eq(projectMembers.userId, user.id)
        ))
        .leftJoin(users, eq(projects.leadId, users.id))
        .where(inArray(projects.id, projectIds))
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

    const projectId = crypto.randomUUID();

    await db.insert(projects).values({
        id: projectId,
        ...data,
        ownerId: user.id,
        identifier: data.identifier.toUpperCase(),
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
    });

    // Add creator as member (e.g. "Owner" or "Lead")
    await db.insert(projectMembers).values({
        projectId,
        userId: user.id,
        role: "Owner",
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

    // Check membership
    const member = await db
        .select()
        .from(projectMembers)
        .where(and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, user.id)
        ))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    const project = await db
        .select({
            id: projects.id,
            ownerId: projects.ownerId,
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

    return c.json({ ...project, userRole: member.role });
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

    const member = await db
        .select()
        .from(projectMembers)
        .where(and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, user.id)
        ))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    // Optional: Check if member role has permission to update. For now allow anyone or assume "Owner"/"Lead"
    // simplistic check:
    // if (member.role === "Member") ... 

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

    // Only owner can delete?
    if (project.ownerId !== user.id) {
        // Also check if user is the one deleting and if they have permissions
        // For simplicity, enforce ownerId match
        return c.json({ error: "Only the project owner can delete this project" }, 403);
    }

    await db.delete(projects).where(eq(projects.id, projectId));

    return c.json({ message: "Project deleted" });
});

/**
 * POST /:id/members
 * Add a member to the project
 */
app.post("/:id/members", zValidator("json", addMemberSchema), async (c) => {
    const projectId = c.req.param("id");
    const user = c.var.user;
    const { email, role } = c.req.valid("json");
    const db = createDrizzleClient(c.env.DB);

    const member = await db
        .select()
        .from(projectMembers)
        .where(and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, user.id)
        ))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    const userToAdd = await db.select().from(users).where(eq(users.email, email)).get();

    if (!userToAdd) {
        return c.json({ error: "User not found" }, 404);
    }

    const existing = await db
        .select()
        .from(projectMembers)
        .where(and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, userToAdd.id)
        ))
        .get();

    if (existing) {
        return c.json({ error: "User is already a member" }, 400);
    }

    await db.insert(projectMembers).values({
        projectId,
        userId: userToAdd.id,
        role: role,
    });

    return c.json({ message: "Member added" }, 201);
});

/**
 * GET /:id/members
 * List project members
 */
app.get("/:id/members", async (c) => {
    const projectId = c.req.param("id");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    // Check membership
    const member = await db
        .select()
        .from(projectMembers)
        .where(and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, user.id)
        ))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    const members = await db
        .select({
            userId: users.id,
            name: users.name,
            email: users.email,
            avatarUrl: users.avatarUrl,
            role: projectMembers.role
        })
        .from(projectMembers)
        .leftJoin(users, eq(projectMembers.userId, users.id))
        .where(eq(projectMembers.projectId, projectId));

    return c.json(members);
});

/**
 * DELETE /:id/members/:userId
 * Remove a member from the project
 */
app.delete("/:id/members/:userId", async (c) => {
    const projectId = c.req.param("id");
    const targetUserId = c.req.param("userId");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    // Check requester membership
    const member = await db
        .select()
        .from(projectMembers)
        .where(and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, user.id)
        ))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    // TODO: Check if requester has permission (e.g. Owner/Lead)

    await db
        .delete(projectMembers)
        .where(and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, targetUserId)
        ));

    return c.json({ message: "Member removed" });
});

/**
 * PUT /:id/members/:userId
 * Update a member's role
 */
const updateMemberSchema = z.object({
    role: z.string(),
});

app.put("/:id/members/:userId", zValidator("json", updateMemberSchema), async (c) => {
    const projectId = c.req.param("id");
    const targetUserId = c.req.param("userId");
    const { role } = c.req.valid("json");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    // Check requester membership
    const member = await db
        .select()
        .from(projectMembers)
        .where(and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, user.id)
        ))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    await db
        .update(projectMembers)
        .set({ role })
        .where(and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, targetUserId)
        ));

    return c.json({ message: "Member role updated" });
});

/**
 * GET /:id/ws
 * Connect to workspace WebSocket (WorkspaceDO)
 */
app.get("/:id/ws", async (c) => {
    const projectId = c.req.param("id");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    // Fetch user details to get name
    const userDetails = await db.select({ name: users.name }).from(users).where(eq(users.id, user.id)).get();
    const userName = userDetails?.name || user.email;

    // Create Stub
    const id = c.env.WORKSPACE_DO.idFromName(projectId);
    const stub = c.env.WORKSPACE_DO.get(id);

    // Pass user info to DO
    const url = new URL(c.req.url);
    url.searchParams.set("userId", user.id);
    url.searchParams.set("userName", userName);

    return stub.fetch(url.toString(), c.req.raw);
});

/**
 * GET /:id/labels
 * List project labels
 */
app.get("/:id/labels", async (c) => {
    const projectId = c.req.param("id");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    // Check membership
    const member = await db
        .select()
        .from(projectMembers)
        .where(and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, user.id)
        ))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    const projectLabels = await db
        .select()
        .from(labels)
        .where(eq(labels.projectId, projectId))
        .orderBy(labels.name);

    return c.json(projectLabels);
});

export default app;
