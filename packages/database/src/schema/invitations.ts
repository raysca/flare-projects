import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { workspaces } from "./workspaces";
import { users } from "./users";

export const invitations = sqliteTable("invitations", {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
        .notNull()
        .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role", { enum: ["admin", "member", "guest"] })
        .notNull()
        .default("member"),
    token: text("token").notNull().unique(),
    invitedBy: text("invited_by")
        .notNull()
        .references(() => users.id),
    status: text("status", { enum: ["pending", "accepted", "expired"] })
        .notNull()
        .default("pending"),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
});

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
