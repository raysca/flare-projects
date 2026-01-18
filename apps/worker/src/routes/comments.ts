import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDrizzleClient, comments, commentReactions, issues, workspaceMembers, users } from "@linearflow/database";
import { eq, and, desc } from "drizzle-orm";
import type { Env } from "../index";
import { authMiddleware, type Variables } from "../middleware/auth";

const app = new Hono<Env & { Variables: Variables }>();

app.use("*", authMiddleware);

// Validation schemas
const updateCommentSchema = z.object({
    body: z.string().min(1, "Comment body cannot be empty"),
});

const addReactionSchema = z.object({
    emoji: z.string().min(1, "Emoji is required").max(10),
});

/**
 * PATCH /comments/:commentId
 * Update comment (only by author)
 */
app.patch("/comments/:commentId", zValidator("json", updateCommentSchema), async (c) => {
    const commentId = c.req.param("commentId");
    const user = c.var.user;
    const data = c.req.valid("json");
    const db = createDrizzleClient(c.env.DB);

    // Fetch existing comment with issue info
    const comment = await db
        .select({
            comment: comments,
            issue: {
                id: issues.id,
                workspaceId: issues.workspaceId,
            },
        })
        .from(comments)
        .innerJoin(issues, eq(comments.issueId, issues.id))
        .where(eq(comments.id, commentId))
        .get();

    if (!comment) {
        return c.json({ error: "Comment not found" }, 404);
    }

    // Check if user is the comment author
    if (comment.comment.userId !== user.id) {
        return c.json({ error: "You can only edit your own comments" }, 403);
    }

    // Check workspace membership
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, comment.issue.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied to workspace" }, 403);
    }

    // Update comment
    const now = new Date();
    await db
        .update(comments)
        .set({
            body: data.body,
            editedAt: now,
            updatedAt: now,
        })
        .where(eq(comments.id, commentId));

    // Fetch updated comment with author info
    const updated = await db
        .select({
            id: comments.id,
            issueId: comments.issueId,
            body: comments.body,
            editedAt: comments.editedAt,
            createdAt: comments.createdAt,
            updatedAt: comments.updatedAt,
            author: {
                id: users.id,
                name: users.name,
                email: users.email,
                avatarUrl: users.avatarUrl,
            },
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.id, commentId))
        .get();

    return c.json(updated);
});

/**
 * DELETE /comments/:commentId
 * Delete comment (only by author or workspace admin)
 */
app.delete("/comments/:commentId", async (c) => {
    const commentId = c.req.param("commentId");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    // Fetch existing comment with issue info
    const comment = await db
        .select({
            comment: comments,
            issue: {
                id: issues.id,
                workspaceId: issues.workspaceId,
            },
        })
        .from(comments)
        .innerJoin(issues, eq(comments.issueId, issues.id))
        .where(eq(comments.id, commentId))
        .get();

    if (!comment) {
        return c.json({ error: "Comment not found" }, 404);
    }

    // Check workspace membership
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, comment.issue.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied to workspace" }, 403);
    }

    // Check if user is the comment author or workspace admin
    const isAuthor = comment.comment.userId === user.id;
    const isAdmin = member.role === "admin";

    if (!isAuthor && !isAdmin) {
        return c.json({ error: "You can only delete your own comments unless you are a workspace admin" }, 403);
    }

    // Soft delete (set deletedAt) or hard delete?
    // OpenAPI spec shows 204 which suggests hard delete
    // But schema has deletedAt field, so let's use soft delete
    // For this implementation, let's do hard delete to match the API spec
    await db.delete(comments).where(eq(comments.id, commentId));

    return c.json({ message: "Comment deleted successfully" }, 200);
});

/**
 * POST /comments/:commentId/reactions
 * Add reaction to comment
 */
app.post("/comments/:commentId/reactions", zValidator("json", addReactionSchema), async (c) => {
    const commentId = c.req.param("commentId");
    const user = c.var.user;
    const data = c.req.valid("json");
    const db = createDrizzleClient(c.env.DB);

    // Fetch comment with issue info
    const comment = await db
        .select({
            comment: comments,
            issue: {
                id: issues.id,
                workspaceId: issues.workspaceId,
            },
        })
        .from(comments)
        .innerJoin(issues, eq(comments.issueId, issues.id))
        .where(eq(comments.id, commentId))
        .get();

    if (!comment) {
        return c.json({ error: "Comment not found" }, 404);
    }

    // Check workspace membership
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, comment.issue.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied to workspace" }, 403);
    }

    // Check if user already reacted with this emoji
    const existingReaction = await db
        .select()
        .from(commentReactions)
        .where(
            and(
                eq(commentReactions.commentId, commentId),
                eq(commentReactions.userId, user.id),
                eq(commentReactions.emoji, data.emoji)
            )
        )
        .get();

    if (existingReaction) {
        return c.json({ error: "You have already reacted with this emoji" }, 409);
    }

    // Create reaction
    const reactionId = crypto.randomUUID();

    await db.insert(commentReactions).values({
        id: reactionId,
        commentId,
        userId: user.id,
        emoji: data.emoji,
    });

    // Fetch created reaction with user info
    const newReaction = await db
        .select({
            id: commentReactions.id,
            emoji: commentReactions.emoji,
            createdAt: commentReactions.createdAt,
            user: {
                id: users.id,
                name: users.name,
                avatarUrl: users.avatarUrl,
            },
        })
        .from(commentReactions)
        .innerJoin(users, eq(commentReactions.userId, users.id))
        .where(eq(commentReactions.id, reactionId))
        .get();

    return c.json(newReaction, 201);
});

/**
 * DELETE /comments/:commentId/reactions?emoji=:emoji
 * Remove reaction from comment
 */
app.delete("/comments/:commentId/reactions", async (c) => {
    const commentId = c.req.param("commentId");
    const emoji = c.req.query("emoji");
    const user = c.var.user;
    const db = createDrizzleClient(c.env.DB);

    if (!emoji) {
        return c.json({ error: "emoji query parameter is required" }, 400);
    }

    // Fetch comment to check workspace access
    const comment = await db
        .select({
            comment: comments,
            issue: {
                id: issues.id,
                workspaceId: issues.workspaceId,
            },
        })
        .from(comments)
        .innerJoin(issues, eq(comments.issueId, issues.id))
        .where(eq(comments.id, commentId))
        .get();

    if (!comment) {
        return c.json({ error: "Comment not found" }, 404);
    }

    // Check workspace membership
    const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, comment.issue.workspaceId), eq(workspaceMembers.userId, user.id)))
        .get();

    if (!member) {
        return c.json({ error: "Access denied to workspace" }, 403);
    }

    // Find and delete the reaction
    const reaction = await db
        .select()
        .from(commentReactions)
        .where(
            and(
                eq(commentReactions.commentId, commentId),
                eq(commentReactions.userId, user.id),
                eq(commentReactions.emoji, emoji)
            )
        )
        .get();

    if (!reaction) {
        return c.json({ error: "Reaction not found" }, 404);
    }

    await db.delete(commentReactions).where(eq(commentReactions.id, reaction.id));

    return c.json({ message: "Reaction removed successfully" }, 200);
});

export default app;
