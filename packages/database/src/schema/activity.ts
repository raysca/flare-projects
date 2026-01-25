import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { projects } from "./projects";
import { issues } from "./issues";

export const activityLog = sqliteTable("activity_log", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  issueId: text("issue_id").references(() => issues.id, {
    onDelete: "cascade",
  }),
  action: text("action", {
    enum: [
      "created",
      "updated",
      "deleted",
      "status_changed",
      "assigned",
      "unassigned",
      "commented",
      "labeled",
      "unlabeled",
      "archived",
      "unarchived",
    ],
  }).notNull(),
  entityType: text("entity_type", {
    enum: ["issue", "comment", "project", "cycle"],
  }).notNull(),
  entityId: text("entity_id").notNull(),
  metadata: text("metadata"), // JSON string with additional context
  oldValue: text("old_value"), // For tracking changes
  newValue: text("new_value"), // For tracking changes
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  userCreatedIdx: index("activity_log_user_created_idx").on(table.userId, table.createdAt),
}));

export type ActivityLog = typeof activityLog.$inferSelect;
export type NewActivityLog = typeof activityLog.$inferInsert;
