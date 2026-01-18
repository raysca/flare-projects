import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDrizzleClient, labels, workspaceMembers } from "@linearflow/database";
import { eq, and } from "drizzle-orm";
import type { Env } from "../index";
import { authMiddleware, type Variables } from "../middleware/auth";

const app = new Hono<Env & { Variables: Variables }>();

app.use("*", authMiddleware);

// Validation schema
const updateLabelSchema = z.object({
    name: z.string().min(1, "Label name is required").optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (e.g., #EF4444)").optional(),
    description: z.string().optional().nullable(),
});

/**
 * PATCH /labels/:labelId
 * Update label
 */
app.patch("/labels/:labelId", zValidator("json", updateLabelSchema), async (c) => {
    const labelId = c.req.param("labelId");
    const user = c.var.user;
    const data = c.req.valid("json");
    const db = createDrizzleClient(c.env.DB);

    // Fetch existing label
    const label = await db.select().from(labels).where(eq(labels.id, labelId)).get();

    if (!label) {
        return c.json({ error: "Label not found" }, 404);
    }

    // Check workspace membership
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, label.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied to workspace" }, 403);
    }

    // Check if updating name to an existing label name in the same workspace
    if (data.name && data.name !== label.name) {
        const existingLabel = await db
            .select()
            .from(labels)
            .where(and(eq(labels.workspaceId, label.workspaceId), eq(labels.name, data.name)))
            .get();

        if (existingLabel) {
            return c.json({ error: "Label with this name already exists in workspace" }, 409);
        }
    }

    // Update label
    await db
        .update(labels)
        .set({
            name: data.name,
            color: data.color,
            description: data.description,
            updatedAt: new Date(),
        })
        .where(eq(labels.id, labelId));

    const updated = await db.select().from(labels).where(eq(labels.id, labelId)).get();

    return c.json(updated);
});

/**
 * DELETE /labels/:labelId
 * Delete label (removes from all issues via issueLabels junction table cascade)
 */
app.delete("/labels/:labelId", async (c) => {
    const labelId = c.req.param("labelId");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    // Fetch existing label
    const label = await db.select().from(labels).where(eq(labels.id, labelId)).get();

    if (!label) {
        return c.json({ error: "Label not found" }, 404);
    }

    // Check workspace membership
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, label.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied to workspace" }, 403);
    }

    // Delete label (issueLabels entries will be cascade deleted)
    await db.delete(labels).where(eq(labels.id, labelId));

    return c.json({ message: "Label deleted successfully" }, 200);
});

export default app;
