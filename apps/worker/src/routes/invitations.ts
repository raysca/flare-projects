import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDrizzleClient, invitations, projectMembers, projects, users } from "@linearflow/database";
import { eq, and } from "drizzle-orm";
import type { Env } from "../index";
import { authMiddleware, type Variables } from "../middleware/auth";

const app = new Hono<Env & { Variables: Variables }>();

const acceptInvitationSchema = z.object({
    token: z.string().min(1, "Token is required"),
});

const createInvitationSchema = z.object({
    projectId: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(["admin", "member", "guest"]).default("member"),
});

/**
 * POST /
 * Create a new invitation
 */
app.post("/", authMiddleware, zValidator("json", createInvitationSchema), async (c) => {
    const user = c.var.user;
    const { projectId, email, role } = c.req.valid("json");
    const db = createDrizzleClient(c.env.DB);

    // Verify project access
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

    // Check if user is already a member
    const targetUser = await db.select().from(users).where(eq(users.email, email)).get();
    if (targetUser) {
        const existingMember = await db
            .select()
            .from(projectMembers)
            .where(and(
                eq(projectMembers.projectId, projectId),
                eq(projectMembers.userId, targetUser.id)
            ))
            .get();

        if (existingMember) {
            return c.json({ error: "User is already a member of this project" }, 400);
        }
    }

    // Create invitation
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 7); // 7 days expiry

    const token = crypto.randomUUID();
    const id = crypto.randomUUID();

    await db.insert(invitations).values({
        id,
        projectId,
        email,
        role,
        token,
        invitedBy: user.id,
        expiresAt: expireDate,
    });

    const newInvitation = await db.select().from(invitations).where(eq(invitations.id, id)).get();

    // TODO: Send email
    // await queueEmail({ to: email, template: "invitation", ... })

    return c.json(newInvitation, 201);
});

/**
 * POST /accept
 * Accept an invitation token
 */
app.post("/accept", authMiddleware, zValidator("json", acceptInvitationSchema), async (c) => {
    const user = c.var.user;
    const { token } = c.req.valid("json");
    const db = createDrizzleClient(c.env.DB);

    // Find invitation
    const invitation = await db
        .select()
        .from(invitations)
        .where(eq(invitations.token, token))
        .get();

    if (!invitation) {
        return c.json({ error: "Invalid invitation" }, 404);
    }

    if (invitation.status !== "pending") {
        return c.json({ error: "Invitation is no longer valid" }, 400);
    }

    if (new Date() > invitation.expiresAt) {
        await db.update(invitations).set({ status: 'expired' }).where(eq(invitations.id, invitation.id));
        return c.json({ error: "Invitation is expired" }, 400);
    }

    if (invitation.email !== user.email) {
        return c.json({ error: "This invitation was sent to a different email address." }, 403);
    }

    const existingMember = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, invitation.projectId), eq(projectMembers.userId, user.id)))
        .get();

    if (existingMember) {
        // Already a member, just update invite status
        await db.update(invitations).set({ status: 'accepted' }).where(eq(invitations.id, invitation.id));
        return c.json({ message: "Already a member of this project" });
    }

    // Add to project
    await db.insert(projectMembers).values({
        projectId: invitation.projectId,
        userId: user.id,
        role: invitation.role,
    });

    // Update invitation status
    await db.update(invitations).set({ status: 'accepted' }).where(eq(invitations.id, invitation.id));

    // Return project info
    const project = await db.select().from(projects).where(eq(projects.id, invitation.projectId)).get();

    return c.json({
        message: "Invitation accepted",
        project
    });
});

export default app;
