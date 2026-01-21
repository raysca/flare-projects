import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDrizzleClient, users } from "@linearflow/database";
import { eq } from "drizzle-orm";
import type { Env } from "../index";
import { authMiddleware, type Variables } from "../middleware/auth";

const app = new Hono<Env & { Variables: Variables }>();

const updateUserSchema = z.object({
    name: z.string().min(1).optional(),
    avatarUrl: z.string().url().optional(),
});

// Middleware
app.use("*", authMiddleware);

/**
 * GET /
 * List users (searchable)
 */
app.get("/", async (c) => {
    const { q } = c.req.query();
    const db = createDrizzleClient(c.env.DB);

    const allUsers = await db
        .select({
            id: users.id,
            name: users.name,
            avatarUrl: users.avatarUrl,
            email: users.email,
        })
        .from(users)
        .all();

    // Filter in memory for case-insensitive search (D1/SQLite LIKE is case-sensitive)
    if (q) {
        const searchTerm = q.toLowerCase();
        const filteredUsers = allUsers.filter(
            (user) =>
                user.name?.toLowerCase().includes(searchTerm) ||
                user.email?.toLowerCase().includes(searchTerm)
        );
        return c.json(filteredUsers);
    }

    return c.json(allUsers);
});

/**
 * GET /me
 * Get current user profile
 */
app.get("/me", async (c) => {
    const authUser = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    const user = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.id, authUser.id))
        .get();

    if (!user) {
        return c.json({ error: "User not found" }, 404);
    }

    return c.json(user);
});


/**
 * PUT /me
 * Update current user profile
 */
app.put("/me", zValidator("json", updateUserSchema), async (c) => {
    const user = c.var.user;
    const { name, avatarUrl } = c.req.valid("json");
    const db = createDrizzleClient(c.env.DB);

    await db
        .update(users)
        .set({
            name,
            avatarUrl,
            updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

    const updatedUser = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .get();

    if (!updatedUser) {
        return c.json({ error: "User not found" }, 404);
    }

    return c.json({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatarUrl: updatedUser.avatarUrl,
    });
});

/**
 * GET /:id
 * Get public profile of a user
 */
app.get("/:id", async (c) => {
    const userId = c.req.param("id");
    const db = createDrizzleClient(c.env.DB);

    const user = await db
        .select({
            id: users.id,
            name: users.name,
            avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.id, userId))
        .get();

    if (!user) {
        return c.json({ error: "User not found" }, 404);
    }

    return c.json(user);
});

export default app;
