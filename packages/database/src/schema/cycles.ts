import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { workspaces } from "./workspaces";
import { teams } from "./teams";

export const cycles = sqliteTable("cycles", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  number: integer("number").notNull(), // Sequential cycle number (1, 2, 3, etc.)
  status: text("status", { enum: ["upcoming", "active", "completed"] })
    .notNull()
    .default("upcoming"),
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }).notNull(),
  autoArchive: integer("auto_archive", { mode: "boolean" })
    .notNull()
    .default(true),
  progress: integer("progress").notNull().default(0), // 0-100 percentage
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Cycle = typeof cycles.$inferSelect;
export type NewCycle = typeof cycles.$inferInsert;
