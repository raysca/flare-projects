import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { workspaces } from "./workspaces";
import { teams } from "./teams";
import { users } from "./users";
import { projects } from "./projects";
import { cycles } from "./cycles";
import { labels } from "./labels";

export const issues = sqliteTable("issues", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  number: integer("number").notNull(), // Sequential issue number per workspace
  title: text("title").notNull(),
  description: text("description"), // Markdown content
  status: text("status", {
    enum: ["backlog", "todo", "in_progress", "in_review", "done", "cancelled"],
  })
    .notNull()
    .default("backlog"),
  priority: text("priority", {
    enum: ["urgent", "high", "medium", "low", "no_priority"],
  })
    .notNull()
    .default("no_priority"),
  type: text("type", { enum: ["bug", "feature", "improvement", "task"] }),
  assigneeId: text("assignee_id").references(() => users.id, {
    onDelete: "set null",
  }),
  reporterId: text("reporter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  cycleId: text("cycle_id").references(() => cycles.id, {
    onDelete: "set null",
  }),
  parentId: text("parent_id").references((): any => issues.id, {
    onDelete: "set null",
  }), // For sub-issues
  estimate: integer("estimate"), // Story points or time estimate
  dueDate: integer("due_date", { mode: "timestamp" }),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  cancelledAt: integer("cancelled_at", { mode: "timestamp" }),
  archivedAt: integer("archived_at", { mode: "timestamp" }),
  sortOrder: integer("sort_order").notNull().default(0), // For manual ordering
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Issue-Label junction table (many-to-many)
export const issueLabels = sqliteTable("issue_labels", {
  id: text("id").primaryKey(),
  issueId: text("issue_id")
    .notNull()
    .references(() => issues.id, { onDelete: "cascade" }),
  labelId: text("label_id")
    .notNull()
    .references(() => labels.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Issue subscriptions (for notifications)
export const issueSubscribers = sqliteTable("issue_subscribers", {
  id: text("id").primaryKey(),
  issueId: text("issue_id")
    .notNull()
    .references(() => issues.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Issue = typeof issues.$inferSelect;
export type NewIssue = typeof issues.$inferInsert;
export type IssueLabel = typeof issueLabels.$inferSelect;
export type NewIssueLabel = typeof issueLabels.$inferInsert;
export type IssueSubscriber = typeof issueSubscribers.$inferSelect;
export type NewIssueSubscriber = typeof issueSubscribers.$inferInsert;
