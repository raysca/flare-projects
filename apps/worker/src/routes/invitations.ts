import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDrizzleClient, invitations, workspaceMembers, workspaces } from "@linearflow/database";
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

    // Check if user is already a member
    // (Optional but good for data integrity if invitation email didn't match user email strictly, 
    // though usually we want to allow accepting with any logged in account or strictly the email invited)
    // Strict email check:
    if (invitation.email !== user.email) {
        // In some systems this is allowed ("This invite was sent to X but you are logged in as Y. Accept anyway?"), 
        // but for security/strictness lets enforce email match or at least warn. 
        // For now, let's enforce email match for security.
        return c.json({ error: "This invitation was sent to a different email address." }, 403);
    }

    const existingMember = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, invitation.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (existingMember) {
        // Already a member, just update invite status
        await db.update(invitations).set({ status: 'accepted' }).where(eq(invitations.id, invitation.id));
        return c.json({ message: "Already a member of this workspace" });
    }

    // Add to workspace
    await db.insert(workspaceMembers).values({
        id: crypto.randomUUID(),
        workspaceId: invitation.workspaceId,
        userId: user.id,
        role: invitation.role,
    });

    // Update invitation status
    await db.update(invitations).set({ status: 'accepted' }).where(eq(invitations.id, invitation.id));

    // Return workspace info for immediate redirect/context update
    const workspace = await db.select().from(workspaces).where(eq(workspaces.id, invitation.workspaceId)).get();

    return c.json({
        message: "Invitation accepted",
        workspace
    });
});

export default app;
