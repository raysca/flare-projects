import { activityLog } from '@linearflow/database';
import type { DB } from '../db/client';

export type ActivityAction =
    | 'created'
    | 'updated'
    | 'deleted'
    | 'status_changed'
    | 'assigned'
    | 'unassigned'
    | 'commented'
    | 'labeled'
    | 'unlabeled'
    | 'archived'
    | 'unarchived';

export async function logActivity(
    db: DB,
    params: {
        projectId: string;
        userId: string;
        issueId?: string;
        action: ActivityAction;
        entityType: 'issue' | 'comment' | 'project' | 'cycle';
        entityId: string;
        oldValue?: string;
        newValue?: string;
        metadata?: Record<string, unknown>;
    }
) {
    await db.insert(activityLog).values({
        id: crypto.randomUUID(),
        projectId: params.projectId,
        userId: params.userId,
        issueId: params.issueId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValue: params.oldValue,
        newValue: params.newValue,
        metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
    });
}
