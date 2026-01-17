import { DrizzleD1Database } from "drizzle-orm/d1";
import { randomUUID } from "crypto";
import * as schema from "./schema";

/**
 * Seed the database with development data
 * This should be run only in development environments
 */
export async function seed(db: DrizzleD1Database<typeof schema>) {
  console.log("Starting database seed...");

  // Create test users
  const userId1 = randomUUID();
  const userId2 = randomUUID();
  const userId3 = randomUUID();

  await db.insert(schema.users).values([
    {
      id: userId1,
      email: "admin@linearflow.dev",
      passwordHash:
        "$2a$10$abcdefghijklmnopqrstuvwxyz", // bcrypt hash (replace with actual hash)
      name: "Admin User",
      emailVerified: true,
      isActive: true,
    },
    {
      id: userId2,
      email: "john@linearflow.dev",
      passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz",
      name: "John Doe",
      emailVerified: true,
      isActive: true,
    },
    {
      id: userId3,
      email: "jane@linearflow.dev",
      passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz",
      name: "Jane Smith",
      emailVerified: true,
      isActive: true,
    },
  ]);

  console.log("✓ Created users");

  // Create workspace
  const workspaceId = randomUUID();
  await db.insert(schema.workspaces).values({
    id: workspaceId,
    name: "LinearFlow Demo",
    slug: "linearflow-demo",
    description: "Demo workspace for LinearFlow",
    createdBy: userId1,
    isActive: true,
  });

  console.log("✓ Created workspace");

  // Add workspace members
  await db.insert(schema.workspaceMembers).values([
    {
      id: randomUUID(),
      workspaceId,
      userId: userId1,
      role: "admin",
    },
    {
      id: randomUUID(),
      workspaceId,
      userId: userId2,
      role: "member",
    },
    {
      id: randomUUID(),
      workspaceId,
      userId: userId3,
      role: "member",
    },
  ]);

  console.log("✓ Added workspace members");

  // Create teams
  const engineeringTeamId = randomUUID();
  const designTeamId = randomUUID();

  await db.insert(schema.teams).values([
    {
      id: engineeringTeamId,
      workspaceId,
      name: "Engineering",
      identifier: "ENG",
      description: "Engineering team",
      color: "#3b82f6",
      icon: "code",
      isActive: true,
    },
    {
      id: designTeamId,
      workspaceId,
      name: "Design",
      identifier: "DSN",
      description: "Design team",
      color: "#ec4899",
      icon: "palette",
      isActive: true,
    },
  ]);

  console.log("✓ Created teams");

  // Add team members
  await db.insert(schema.teamMembers).values([
    {
      id: randomUUID(),
      teamId: engineeringTeamId,
      userId: userId1,
      isLead: true,
    },
    {
      id: randomUUID(),
      teamId: engineeringTeamId,
      userId: userId2,
      isLead: false,
    },
    {
      id: randomUUID(),
      teamId: designTeamId,
      userId: userId3,
      isLead: true,
    },
  ]);

  console.log("✓ Added team members");

  // Create labels
  const bugLabelId = randomUUID();
  const featureLabelId = randomUUID();
  const urgentLabelId = randomUUID();

  await db.insert(schema.labels).values([
    {
      id: bugLabelId,
      workspaceId,
      name: "bug",
      description: "Something isn't working",
      color: "#dc2626",
    },
    {
      id: featureLabelId,
      workspaceId,
      name: "feature",
      description: "New feature request",
      color: "#16a34a",
    },
    {
      id: urgentLabelId,
      workspaceId,
      name: "urgent",
      description: "Needs immediate attention",
      color: "#ea580c",
    },
  ]);

  console.log("✓ Created labels");

  // Create a project
  const projectId = randomUUID();
  await db.insert(schema.projects).values({
    id: projectId,
    workspaceId,
    teamId: engineeringTeamId,
    name: "V1 Launch",
    identifier: "V1",
    description: "Initial product launch",
    color: "#8b5cf6",
    icon: "rocket",
    status: "active",
    leadId: userId1,
    progress: 25,
  });

  console.log("✓ Created project");

  // Create a cycle
  const cycleId = randomUUID();
  const now = new Date();
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  await db.insert(schema.cycles).values({
    id: cycleId,
    workspaceId,
    teamId: engineeringTeamId,
    name: "Sprint 1",
    description: "First sprint of development",
    number: 1,
    status: "active",
    startDate: now,
    endDate: twoWeeksFromNow,
    autoArchive: true,
    progress: 30,
  });

  console.log("✓ Created cycle");

  // Create sample issues
  const issue1Id = randomUUID();
  const issue2Id = randomUUID();
  const issue3Id = randomUUID();

  await db.insert(schema.issues).values([
    {
      id: issue1Id,
      workspaceId,
      teamId: engineeringTeamId,
      number: 1,
      title: "Set up authentication system",
      description:
        "Implement email/password authentication with session management using KV",
      status: "in_progress",
      priority: "high",
      type: "feature",
      assigneeId: userId2,
      reporterId: userId1,
      projectId,
      cycleId,
      sortOrder: 0,
    },
    {
      id: issue2Id,
      workspaceId,
      teamId: engineeringTeamId,
      number: 2,
      title: "Fix login redirect loop",
      description: "Users are experiencing an infinite redirect after login",
      status: "todo",
      priority: "urgent",
      type: "bug",
      assigneeId: userId1,
      reporterId: userId2,
      projectId,
      cycleId,
      sortOrder: 1,
    },
    {
      id: issue3Id,
      workspaceId,
      teamId: designTeamId,
      number: 3,
      title: "Design dashboard layout",
      description:
        "Create mockups for the main dashboard with issue list and filters",
      status: "backlog",
      priority: "medium",
      type: "task",
      assigneeId: userId3,
      reporterId: userId1,
      projectId: null,
      cycleId: null,
      sortOrder: 2,
    },
  ]);

  console.log("✓ Created sample issues");

  // Add labels to issues
  await db.insert(schema.issueLabels).values([
    {
      id: randomUUID(),
      issueId: issue1Id,
      labelId: featureLabelId,
    },
    {
      id: randomUUID(),
      issueId: issue2Id,
      labelId: bugLabelId,
    },
    {
      id: randomUUID(),
      issueId: issue2Id,
      labelId: urgentLabelId,
    },
  ]);

  console.log("✓ Added labels to issues");

  // Create sample comments
  const comment1Id = randomUUID();
  await db.insert(schema.comments).values([
    {
      id: comment1Id,
      issueId: issue1Id,
      userId: userId2,
      body: "I've started working on this. Will use Hono middleware for auth.",
    },
    {
      id: randomUUID(),
      issueId: issue2Id,
      userId: userId1,
      body: "This is blocking several users. Let's prioritize this.",
    },
  ]);

  console.log("✓ Created sample comments");

  // Create notification preferences for users
  await db.insert(schema.notificationPreferences).values([
    {
      id: randomUUID(),
      userId: userId1,
      workspaceId,
      emailNotifications: true,
      issueAssigned: true,
      issueMentioned: true,
      issueUpdated: false,
      commentCreated: true,
      commentMentioned: true,
    },
    {
      id: randomUUID(),
      userId: userId2,
      workspaceId,
      emailNotifications: true,
      issueAssigned: true,
      issueMentioned: true,
      issueUpdated: false,
      commentCreated: true,
      commentMentioned: true,
    },
  ]);

  console.log("✓ Created notification preferences");

  console.log("\n✅ Database seed completed successfully!");
  console.log("\nSeed data summary:");
  console.log("  - 3 users");
  console.log("  - 1 workspace");
  console.log("  - 2 teams");
  console.log("  - 3 labels");
  console.log("  - 1 project");
  console.log("  - 1 cycle");
  console.log("  - 3 issues");
  console.log("  - 2 comments");
  console.log("\nTest credentials:");
  console.log("  - admin@linearflow.dev (Admin)");
  console.log("  - john@linearflow.dev (Member)");
  console.log("  - jane@linearflow.dev (Member)");
}
