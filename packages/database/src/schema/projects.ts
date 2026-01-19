import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  identifier: text("identifier").notNull(), // e.g., "PROJ"
  description: text("description"),
  color: text("color"),
  icon: text("icon"),
  status: text("status", {
    enum: ["planned", "active", "paused", "completed", "cancelled"],
  })
    .notNull()
    .default("planned"),
  leadId: text("lead_id").references(() => users.id, { onDelete: "set null" }),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: integer("start_date", { mode: "timestamp" }),
  targetDate: integer("target_date", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  progress: integer("progress").notNull().default(0), // 0-100 percentage
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const projectMembers = sqliteTable("project_members", {
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("Member"), // Flexible string role
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (t) => ({
  pk: primaryKey({ columns: [t.projectId, t.userId] }),
}));

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type NewProjectMember = typeof projectMembers.$inferInsert;
