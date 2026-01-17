import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { issues } from "./issues";
import { comments } from "./comments";
import { users } from "./users";

export const attachments = sqliteTable("attachments", {
  id: text("id").primaryKey(),
  // Polymorphic relationship - can attach to issues or comments
  issueId: text("issue_id").references(() => issues.id, {
    onDelete: "cascade",
  }),
  commentId: text("comment_id").references(() => comments.id, {
    onDelete: "cascade",
  }),
  uploadedBy: text("uploaded_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(), // Size in bytes
  mimeType: text("mime_type").notNull(),
  r2Key: text("r2_key").notNull(), // R2 object key
  url: text("url").notNull(), // Public URL or signed URL
  thumbnailUrl: text("thumbnail_url"), // For images/videos
  width: integer("width"), // For images
  height: integer("height"), // For images
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
