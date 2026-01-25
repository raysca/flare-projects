# Requirements: Real-Time Notifications

## Problem Statement

- **Pain point:** Users have no way to know when issues they're subscribed to are updated, when they're assigned to an issue, or when someone mentions them in comments. They must manually refresh and check for changes.
- **Priority now:** The platform already has real-time WebSocket infrastructure for presence and issue updates, but notifications are not being created or delivered. The database schema (`notifications`, `notificationPreferences`) exists but is unused. This is a core feature gap for a collaborative issue tracking tool.

## User Stories

- [ ] As a **team member**, I want to receive real-time notifications when I'm assigned to an issue, so that I can start working on it promptly.
- [ ] As a **team member**, I want to receive notifications when someone @mentions me in an issue description or comment, so that I don't miss important conversations.
- [ ] As a **subscriber**, I want to receive notifications when an issue I'm watching has status changes, so that I can track progress without manually checking.
- [ ] As a **subscriber**, I want to receive notifications when new comments are added to issues I'm watching, so that I can stay informed on discussions.
- [ ] As a **user**, I want to see an unread notification count in the header, so that I know when I have new activity.
- [ ] As a **user**, I want to view all my notifications in a dropdown panel, so that I can quickly see recent activity.
- [ ] As a **user**, I want to click a notification to navigate directly to the relevant issue, so that I can take action immediately.
- [ ] As a **user**, I want to mark notifications as read (individually or all at once), so that I can manage my notification inbox.
- [ ] As a **user**, I want to configure which notification types I receive per-project, so that I'm not overwhelmed by noise.

## Success Criteria (MoSCoW)

### Must Have
- Real-time notification delivery via WebSocket (user-specific channel)
- Notification creation on: issue assignment, @mention in issue/comment, status change, new comment
- Notification bell icon with unread count badge in header
- Notification dropdown panel showing recent notifications
- Click-to-navigate from notification to source issue
- Mark individual notification as read
- Mark all notifications as read
- Respect existing `notificationPreferences` settings when creating notifications

### Should Have
- @mention autocomplete in issue description and comment editors (leveraging existing TipTap editor)
- Notification preferences UI to toggle notification types per project
- Visual distinction between read/unread notifications
- Notification grouping by issue (e.g., "3 new comments on PROJ-123")
- Toast/snackbar for high-priority notifications (assignments, direct mentions)

### Could Have
- Email notification digest (daily/weekly summary)
- Desktop push notifications via browser Notification API
- Notification sound preferences
- "Do not disturb" mode to temporarily mute notifications
- Archive/delete notifications

## Out of Scope

- **Email delivery** - No email sending in this iteration; only in-app real-time notifications
- **Mobile push notifications** - Web-only for now
- **Slack/Discord integrations** - External notification channels deferred
- **Notification templates/customization** - Fixed notification message format
- **Notification history pagination** - Initial implementation shows last 50 notifications
- **Multi-workspace notification aggregation** - Notifications scoped to current project context

## Existing Infrastructure (Context)

The following already exists and should be leveraged:

| Component | Location | Status |
|-----------|----------|--------|
| `notifications` table | `packages/database/src/schema/notifications.ts` | Schema defined, unused |
| `notificationPreferences` table | `packages/database/src/schema/notifications.ts` | Schema defined, unused |
| `issueSubscribers` table | `packages/database/src/schema/issues.ts` | Used for tracking watchers |
| WebSocket infrastructure | `apps/server/src/realtime/` | Fully operational |
| Broadcast utility | `apps/server/src/realtime/broadcast.ts` | Used for issue/comment events |
| Activity logging | `apps/server/src/services/activity.ts` | Tracks all changes |
| TipTap editor | `apps/server/src/components/editor/` | Used for descriptions/comments |

## Notification Types (from schema)

```typescript
type NotificationType =
  | 'issue_assigned'      // User is assigned to an issue
  | 'issue_mentioned'     // User is @mentioned in issue description
  | 'issue_updated'       // Issue fields changed (title, priority, etc.)
  | 'issue_status_changed'// Issue status changed
  | 'comment_created'     // New comment on subscribed issue
  | 'comment_mentioned';  // User is @mentioned in a comment
```
