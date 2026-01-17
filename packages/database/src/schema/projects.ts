import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { workspaces } from "./workspaces";
import { users } from "./users";
import { teams } from "./teams";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
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

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
