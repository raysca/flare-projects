import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDrizzleClient, workspaces, workspaceMembers, teams, teamMembers, invitations } from "@linearflow/database";
import { eq, and } from "drizzle-orm";
import type { Env } from "../index";
import { authMiddleware, type Variables } from "../middleware/auth";

const app = new Hono<Env & { Variables: Variables }>();

// Validation schemas
const createWorkspaceSchema = z.object({
    name: z.string().min(1, "Name is required"),
    slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
    description: z.string().optional(),
});

const updateWorkspaceSchema = z.object({
    name: z.string().optional(),
    slug: z.string().regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens").optional(),
    description: z.string().optional(),
    logoUrl: z.string().url().optional(),
});

const createTeamSchema = z.object({
    name: z.string().min(1, "Name is required"),
    identifier: z.string().min(1, "Identifier is required").max(5).regex(/^[A-Z0-9]+$/, "Identifier must be uppercase alphanumeric"),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color").optional(),
    icon: z.string().optional(),
});

// Middleware to ensure user is logged in
app.use("*", authMiddleware);

/**
 * GET /
 * List all workspaces the user is a member of
 */
app.get("/", async (c) => {
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    // Join workspaces with workspaceMembers to find user's workspaces
    const userWorkspaces = await db
        .select({
            workspace: workspaces,
            role: workspaceMembers.role,
        })
        .from(workspaces)
        .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(eq(workspaceMembers.userId, user.id));

    return c.json(
        userWorkspaces.map(({ workspace, role }) => ({
            ...workspace,
            role,
        }))
    );
});

/**
 * POST /
 * Create a new workspace
 */
app.post("/", zValidator("json", createWorkspaceSchema), async (c) => {
    const user = c.var.user;
    const { name, slug, description } = c.req.valid("json");
    const db = createDrizzleClient(c.env.DB);

    // Check if slug is taken
    const existing = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.slug, slug))
        .get();

    if (existing) {
        return c.json({ error: "Workspace with this URL already exists" }, 409);
    }

    const workspaceId = crypto.randomUUID();

    // Transaction to create workspace and add user as admin
    // D1 doesn't support full transactions yet in all drivers, but we can do it sequentially
    // If one fails, we have partial state, but for MVP this is acceptable or we can assume high reliability

    // 1. Create Workspace
    await db.insert(workspaces).values({
        id: workspaceId,
        name,
        slug,
        description,
        createdBy: user.id,
    });

    // 2. Add creator as admin member
    await db.insert(workspaceMembers).values({
        id: crypto.randomUUID(),
        workspaceId,
        userId: user.id,
        role: "admin",
    });

    return c.json({
        id: workspaceId,
        name,
        slug,
        role: "admin",
    }, 201);
});

/**
 * GET /:id
 * Get workspace details if user is member
 */
app.get("/:id", async (c) => {
    const workspaceId = c.req.param("id");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    // Check membership
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Workspace not found or access denied" }, 404);
    }

    const workspace = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .get();

    if (!workspace) {
        return c.json({ error: "Workspace not found" }, 404);
    }

    return c.json({ ...workspace, role: member.role });
});

/**
 * PUT /:id
 * Update workspace details (Admin only)
 */
app.put("/:id", zValidator("json", updateWorkspaceSchema), async (c) => {
    const workspaceId = c.req.param("id");
    const user = c.var.user;
    const data = c.req.valid("json");
    const db = createDrizzleClient(c.env.DB);

    // Check if user is admin
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member || member.role !== "admin") {
        return c.json({ error: "Unauthorized" }, 403);
    }

    // Update workspace
    await db
        .update(workspaces)
        .set({
            ...data,
            updatedAt: new Date(),
        })
        .where(eq(workspaces.id, workspaceId));

    const updated = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .get();

    return c.json(updated);
});


/**
 * POST /:id/teams
 * Create a new team in the workspace
 */
app.post("/:id/teams", zValidator("json", createTeamSchema), async (c) => {
    const workspaceId = c.req.param("id");
    const user = c.var.user;
    const { name, identifier, description, color, icon } = c.req.valid("json");
    const db = createDrizzleClient(c.env.DB);

    // Check membership
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Unauthorized" }, 403);
    }

    // Check if identifier is unique within workspace
    // Note: Drizzle JOIN/Query to check other teams in this workspace?
    // Actually simplest is to just check global uniqueness or workspace scoped. 
    // Let's assume identifiers are unique per workspace.
    // We need to fetch all teams in workspace and check identifier.
    const existingTeam = await db
        .select()
        .from(teams)
        .where(and(eq(teams.workspaceId, workspaceId), eq(teams.identifier, identifier)))
        .get();

    if (existingTeam) {
        return c.json({ error: "Team identifier already exists in this workspace" }, 409);
    }

    const teamId = crypto.randomUUID();

    // Create Team
    await db.insert(teams).values({
        id: teamId,
        workspaceId,
        name,
        identifier,
        description,
        color,
        icon,
    });

    return c.json({
        id: teamId,
        workspaceId,
        name,
        identifier
    }, 201);
});

/**
 * GET /:id/teams
 * List all teams in the workspace
 */
app.get("/:id/teams", async (c) => {
    const workspaceId = c.req.param("id");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    // Check workspace membership
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied" }, 403);
    }

    const workspaceTeams = await db
        .select()
        .from(teams)
        .where(eq(teams.workspaceId, workspaceId));

    return c.json(workspaceTeams);
});


const inviteMemberSchema = z.object({
    email: z.string().email(),
    role: z.enum(["admin", "member", "guest"]).default("member"),
});

/**
 * POST /:id/invite
 * Invite a user to the workspace
 */
app.post("/:id/invite", zValidator("json", inviteMemberSchema), async (c) => {
    const workspaceId = c.req.param("id");
    const user = c.var.user;
    const { email, role } = c.req.valid("json");
    const db = createDrizzleClient(c.env.DB);

    // Check admin permissions
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member || member.role !== "admin") {
        return c.json({ error: "Unauthorized" }, 403);
    }

    // Check for pending invitation
    const existingInvite = await db
        .select()
        .from(invitations)
        .where(and(eq(invitations.workspaceId, workspaceId), eq(invitations.email, email), eq(invitations.status, 'pending')))
        .get();

    if (existingInvite) {
        return c.json({ error: "Invitation already pending" }, 409);
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    await db.insert(invitations).values({
        id: crypto.randomUUID(),
        workspaceId,
        email,
        role,
        token, // In a real app, this might be hashed, but for simple token in URL it's okay for now
        invitedBy: user.id,
        expiresAt,
    });

    // TODO: Trigger email sending via Queue

    return c.json({ message: "Invitation sent", token });
});

export default app;
