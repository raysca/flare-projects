import { createDrizzleClient, activityLog } from "@linearflow/database";
import type { Bindings } from "../index";

/**
 * Activity logging utility functions
 * Use these to log user actions throughout the application
 */

export type ActivityAction =
  | "created"
  | "updated"
  | "deleted"
  | "status_changed"
  | "assigned"
  | "unassigned"
  | "commented"
  | "labeled"
  | "unlabeled"
  | "archived"
  | "unarchived";

export type EntityType = "issue" | "comment" | "project" | "cycle" | "workspace";

export interface LogActivityParams {
  db: D1Database;
  workspaceId: string;
  userId: string;
  action: ActivityAction;
  entityType: EntityType;
  entityId: string;
  issueId?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Log an activity to the activity log
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  const {
    db,
    workspaceId,
    userId,
    action,
    entityType,
    entityId,
    issueId,
    oldValue,
    newValue,
    metadata,
  } = params;

  const drizzleDb = createDrizzleClient(db);
  const activityId = crypto.randomUUID();

  await drizzleDb.insert(activityLog).values({
    id: activityId,
    workspaceId,
    userId,
    issueId: issueId || null,
    action,
    entityType,
    entityId,
    oldValue: oldValue || null,
    newValue: newValue || null,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}

/**
 * Log issue creation
 */
export async function logIssueCreated(
  db: D1Database,
  workspaceId: string,
  userId: string,
  issueId: string
): Promise<void> {
  await logActivity({
    db,
    workspaceId,
    userId,
    action: "created",
    entityType: "issue",
    entityId: issueId,
    issueId,
  });
}

/**
 * Log issue update (generic)
 */
export async function logIssueUpdated(
  db: D1Database,
  workspaceId: string,
  userId: string,
  issueId: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logActivity({
    db,
    workspaceId,
    userId,
    action: "updated",
    entityType: "issue",
    entityId: issueId,
    issueId,
    metadata,
  });
}

/**
 * Log issue deletion
 */
export async function logIssueDeleted(
  db: D1Database,
  workspaceId: string,
  userId: string,
  issueId: string
): Promise<void> {
  await logActivity({
    db,
    workspaceId,
    userId,
    action: "deleted",
    entityType: "issue",
    entityId: issueId,
    issueId,
  });
}

/**
 * Log status change
 */
export async function logStatusChanged(
  db: D1Database,
  workspaceId: string,
  userId: string,
  issueId: string,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  await logActivity({
    db,
    workspaceId,
    userId,
    action: "status_changed",
    entityType: "issue",
    entityId: issueId,
    issueId,
    oldValue: oldStatus,
    newValue: newStatus,
  });
}

/**
 * Log assignee change
 */
export async function logAssigneeChanged(
  db: D1Database,
  workspaceId: string,
  userId: string,
  issueId: string,
  oldAssigneeId: string | null,
  newAssigneeId: string | null
): Promise<void> {
  if (oldAssigneeId === null && newAssigneeId !== null) {
    // Assigned
    await logActivity({
      db,
      workspaceId,
      userId,
      action: "assigned",
      entityType: "issue",
      entityId: issueId,
      issueId,
      newValue: newAssigneeId,
    });
  } else if (oldAssigneeId !== null && newAssigneeId === null) {
    // Unassigned
    await logActivity({
      db,
      workspaceId,
      userId,
      action: "unassigned",
      entityType: "issue",
      entityId: issueId,
      issueId,
      oldValue: oldAssigneeId,
    });
  } else if (oldAssigneeId !== newAssigneeId) {
    // Reassigned
    await logActivity({
      db,
      workspaceId,
      userId,
      action: "assigned",
      entityType: "issue",
      entityId: issueId,
      issueId,
      oldValue: oldAssigneeId || undefined,
      newValue: newAssigneeId || undefined,
    });
  }
}

/**
 * Log comment creation
 */
export async function logCommentCreated(
  db: D1Database,
  workspaceId: string,
  userId: string,
  issueId: string,
  commentId: string
): Promise<void> {
  await logActivity({
    db,
    workspaceId,
    userId,
    action: "commented",
    entityType: "comment",
    entityId: commentId,
    issueId,
  });
}

/**
 * Log label addition
 */
export async function logLabelAdded(
  db: D1Database,
  workspaceId: string,
  userId: string,
  issueId: string,
  labelId: string,
  labelName: string
): Promise<void> {
  await logActivity({
    db,
    workspaceId,
    userId,
    action: "labeled",
    entityType: "issue",
    entityId: issueId,
    issueId,
    newValue: labelId,
    metadata: { labelName },
  });
}

/**
 * Log label removal
 */
export async function logLabelRemoved(
  db: D1Database,
  workspaceId: string,
  userId: string,
  issueId: string,
  labelId: string,
  labelName: string
): Promise<void> {
  await logActivity({
    db,
    workspaceId,
    userId,
    action: "unlabeled",
    entityType: "issue",
    entityId: issueId,
    issueId,
    oldValue: labelId,
    metadata: { labelName },
  });
}
