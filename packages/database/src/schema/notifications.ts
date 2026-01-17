import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { workspaces } from "./workspaces";
import { issues } from "./issues";

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: [
      "issue_assigned",
      "issue_mentioned",
      "issue_updated",
      "issue_status_changed",
      "comment_created",
      "comment_mentioned",
    ],
  }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  // Polymorphic reference to related entity
  issueId: text("issue_id").references(() => issues.id, {
    onDelete: "cascade",
  }),
  actionUrl: text("action_url"), // URL to navigate to
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  readAt: integer("read_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Notification preferences
export const notificationPreferences = sqliteTable(
  "notification_preferences",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    emailNotifications: integer("email_notifications", { mode: "boolean" })
      .notNull()
      .default(true),
    issueAssigned: integer("issue_assigned", { mode: "boolean" })
      .notNull()
      .default(true),
    issueMentioned: integer("issue_mentioned", { mode: "boolean" })
      .notNull()
      .default(true),
    issueUpdated: integer("issue_updated", { mode: "boolean" })
      .notNull()
      .default(false),
    commentCreated: integer("comment_created", { mode: "boolean" })
      .notNull()
      .default(true),
    commentMentioned: integer("comment_mentioned", { mode: "boolean" })
      .notNull()
      .default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  }
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationPreference =
  typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference =
  typeof notificationPreferences.$inferInsert;
