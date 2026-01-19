import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDrizzleClient, invitations, projectMembers, projects } from "@linearflow/database";
import { eq, and } from "drizzle-orm";
import type { Env } from "../index";
import { authMiddleware, type Variables } from "../middleware/auth";

const app = new Hono<Env & { Variables: Variables }>();

const acceptInvitationSchema = z.object({
    token: z.string().min(1, "Token is required"),
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
