import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../../../packages/database/src/schema";
import { seed } from "../../../../packages/database/src/seed";
import type { Env } from "../index";

const dev = new Hono<Env>();

/**
 * Development-only routes
 * These should be disabled or protected in production
 */

/**
 * Seed the database with sample data
 * POST /api/dev/seed
 *
 * Query params:
 *   - clean: "true" | "false" (default: "true") - Clear existing data before seeding
 *   - verbose: "true" | "false" (default: "false") - Enable verbose logging
 *
 * Example:
 *   curl -X POST http://localhost:8787/api/dev/seed
 *   curl -X POST http://localhost:8787/api/dev/seed?clean=false
 */
dev.post("/seed", async (c) => {
  // Only allow in development
  if (c.env.ENVIRONMENT !== "development") {
    return c.json(
      {
        error: "Forbidden",
        message: "Seed endpoint is only available in development",
      },
      403
    );
  }

  const clean = c.req.query("clean") !== "false";
  const verbose = c.req.query("verbose") === "true";

  const db = drizzle(c.env.DB, { schema });

  try {
    await seed(db, { clean, verbose });

    return c.json({
      success: true,
      message: "Database seeded successfully",
      options: { clean, verbose },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return c.json(
      {
        success: false,
        error: "Seed failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * Reset the database (delete all data)
 * POST /api/dev/reset
 *
 * WARNING: This will delete ALL data in the database
 */
dev.post("/reset", async (c) => {
  // Only allow in development
  if (c.env.ENVIRONMENT !== "development") {
    return c.json(
      {
        error: "Forbidden",
        message: "Reset endpoint is only available in development",
      },
      403
    );
  }

  const db = drizzle(c.env.DB, { schema });

  try {
    // Delete in reverse order of dependencies
    await db.delete(schema.commentReactions).run();
    await db.delete(schema.comments).run();
    await db.delete(schema.issueLabels).run();
    await db.delete(schema.issueSubscribers).run();
    await db.delete(schema.issues).run();
    await db.delete(schema.cycles).run();
    await db.delete(schema.projects).run();
    await db.delete(schema.labels).run();
    await db.delete(schema.teamMembers).run();
    await db.delete(schema.teams).run();
    await db.delete(schema.notificationPreferences).run();
    await db.delete(schema.notifications).run();
    await db.delete(schema.activityLog).run();
    await db.delete(schema.workspaceMembers).run();
    await db.delete(schema.workspaces).run();
    await db.delete(schema.users).run();

    return c.json({
      success: true,
      message: "Database reset successfully - all data deleted",
    });
  } catch (error) {
    console.error("Reset error:", error);
    return c.json(
      {
        success: false,
        error: "Reset failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * Get database statistics
 * GET /api/dev/stats
 */
dev.get("/stats", async (c) => {
  // Only allow in development
  if (c.env.ENVIRONMENT !== "development") {
    return c.json(
      {
        error: "Forbidden",
        message: "Stats endpoint is only available in development",
      },
      403
    );
  }

  const db = drizzle(c.env.DB, { schema });

  try {
    // Get counts for each table
    const [
      usersResult,
      workspacesResult,
      teamsResult,
      projectsResult,
      cyclesResult,
      issuesResult,
      commentsResult,
      labelsResult,
    ] = await Promise.all([
      db.select({ count: schema.users.id }).from(schema.users),
      db.select({ count: schema.workspaces.id }).from(schema.workspaces),
      db.select({ count: schema.teams.id }).from(schema.teams),
      db.select({ count: schema.projects.id }).from(schema.projects),
      db.select({ count: schema.cycles.id }).from(schema.cycles),
      db.select({ count: schema.issues.id }).from(schema.issues),
      db.select({ count: schema.comments.id }).from(schema.comments),
      db.select({ count: schema.labels.id }).from(schema.labels),
    ]);

    return c.json({
      success: true,
      stats: {
        users: usersResult.length,
        workspaces: workspacesResult.length,
        teams: teamsResult.length,
        projects: projectsResult.length,
        cycles: cyclesResult.length,
        issues: issuesResult.length,
        comments: commentsResult.length,
        labels: labelsResult.length,
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to get stats",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export default dev;
