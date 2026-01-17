import { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../schema";

// Import all seed data
import {
  users,
  workspaces,
  workspaceMembers,
  teams,
  teamMembers,
  labels,
  projects,
  cycles,
  issues,
  issueLabels,
  comments,
  commentReactions,
  notificationPreferences,
} from "./data";

/**
 * Batch insert helper for D1 which has a limit on SQL variables
 * D1 has a limit of ~100 variables per query, so we batch inserts
 */
async function batchInsert<T>(
  db: DrizzleD1Database<typeof schema>,
  table: any,
  data: T[],
  batchSize: number = 3
): Promise<void> {
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await db.insert(table).values(batch as any);
  }
}

export interface SeedOptions {
  /** Clear existing data before seeding (default: true) */
  clean?: boolean;
  /** Only seed specific tables */
  tables?: Array<
    | "users"
    | "workspaces"
    | "teams"
    | "labels"
    | "projects"
    | "cycles"
    | "issues"
    | "comments"
    | "notifications"
  >;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Seed the database with development data
 * This should be run only in development environments
 */
export async function seed(
  db: DrizzleD1Database<typeof schema>,
  options: SeedOptions = {}
): Promise<void> {
  const { clean = true, tables, verbose = false } = options;

  const log = (message: string) => {
    if (verbose) console.log(message);
  };

  const shouldSeed = (table: string) => !tables || tables.includes(table as any);

  console.log("🌱 Starting database seed...\n");

  try {
    // Clean existing data if requested
    if (clean) {
      console.log("🧹 Cleaning existing data...");
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
      console.log("   ✓ Cleaned existing data\n");
    }

    // Seed users
    if (shouldSeed("users")) {
      console.log("👤 Seeding users...");
      await batchInsert(db, schema.users, users);
      log(`   Added ${users.length} users`);
      console.log(`   ✓ Created ${users.length} users`);
    }

    // Seed workspaces
    if (shouldSeed("workspaces")) {
      console.log("🏢 Seeding workspaces...");
      await batchInsert(db, schema.workspaces, workspaces);
      log(`   Added ${workspaces.length} workspaces`);

      await batchInsert(db, schema.workspaceMembers, workspaceMembers);
      log(`   Added ${workspaceMembers.length} workspace members`);
      console.log(
        `   ✓ Created ${workspaces.length} workspaces with ${workspaceMembers.length} members`
      );
    }

    // Seed teams
    if (shouldSeed("teams")) {
      console.log("👥 Seeding teams...");
      await batchInsert(db, schema.teams, teams);
      log(`   Added ${teams.length} teams`);

      await batchInsert(db, schema.teamMembers, teamMembers);
      log(`   Added ${teamMembers.length} team members`);
      console.log(
        `   ✓ Created ${teams.length} teams with ${teamMembers.length} members`
      );
    }

    // Seed labels
    if (shouldSeed("labels")) {
      console.log("🏷️  Seeding labels...");
      await batchInsert(db, schema.labels, labels);
      console.log(`   ✓ Created ${labels.length} labels`);
    }

    // Seed projects
    if (shouldSeed("projects")) {
      console.log("📁 Seeding projects...");
      await batchInsert(db, schema.projects, projects);
      console.log(`   ✓ Created ${projects.length} projects`);
    }

    // Seed cycles
    if (shouldSeed("cycles")) {
      console.log("🔄 Seeding cycles...");
      await batchInsert(db, schema.cycles, cycles);
      console.log(`   ✓ Created ${cycles.length} cycles`);
    }

    // Seed issues
    if (shouldSeed("issues")) {
      console.log("📋 Seeding issues...");
      await batchInsert(db, schema.issues, issues);
      log(`   Added ${issues.length} issues`);

      await batchInsert(db, schema.issueLabels, issueLabels);
      log(`   Added ${issueLabels.length} issue labels`);
      console.log(
        `   ✓ Created ${issues.length} issues with ${issueLabels.length} label assignments`
      );
    }

    // Seed comments
    if (shouldSeed("comments")) {
      console.log("💬 Seeding comments...");
      await batchInsert(db, schema.comments, comments);
      log(`   Added ${comments.length} comments`);

      await batchInsert(db, schema.commentReactions, commentReactions);
      log(`   Added ${commentReactions.length} reactions`);
      console.log(
        `   ✓ Created ${comments.length} comments with ${commentReactions.length} reactions`
      );
    }

    // Seed notification preferences
    if (shouldSeed("notifications")) {
      console.log("🔔 Seeding notification preferences...");
      await batchInsert(db, schema.notificationPreferences, notificationPreferences);
      console.log(
        `   ✓ Created ${notificationPreferences.length} notification preferences`
      );
    }

    // Print summary
    console.log("\n" + "=".repeat(50));
    console.log("✅ Database seed completed successfully!");
    console.log("=".repeat(50));
    console.log("\n📊 Seed data summary:");
    console.log(`   • ${users.length} users`);
    console.log(`   • ${workspaces.length} workspaces`);
    console.log(`   • ${teams.length} teams`);
    console.log(`   • ${labels.length} labels`);
    console.log(`   • ${projects.length} projects`);
    console.log(`   • ${cycles.length} cycles`);
    console.log(`   • ${issues.length} issues`);
    console.log(`   • ${comments.length} comments`);

    console.log("\n🔑 Test credentials (password: password123):");
    console.log("   • admin@linearflow.dev (Admin)");
    console.log("   • john@linearflow.dev (Member)");
    console.log("   • jane@linearflow.dev (Member)");
    console.log("   • mike@linearflow.dev (Member)");
    console.log("   • sarah@linearflow.dev (Admin)");
    console.log("   • david@linearflow.dev (Member)");
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    throw error;
  }
}

// Re-export data for programmatic access
export * from "./data";
export * from "./utils";
