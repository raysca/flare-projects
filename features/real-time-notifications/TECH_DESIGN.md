# Tech Design: Real-Time Notifications

## Architecture Overview

The notification system consists of three layers:

1. **Event Layer** - Hooks into existing issue/comment mutations to trigger notification creation
2. **Processing Layer** - Notification service that determines recipients, checks preferences, persists notifications, and broadcasts
3. **Delivery Layer** - User-specific WebSocket channels for real-time push + REST API for fetching/managing notifications

```
┌─────────────────────────────────────────────────────────────────┐
│                        Event Sources                             │
│  (Issue API, Comment API - already exist)                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ trigger
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Notification Service                           │
│  - Parse @mentions from HTML content                             │
│  - Determine recipients (assignee, subscribers, mentioned)       │
│  - Check notificationPreferences per recipient                   │
│  - Insert notification records to DB                             │
│  - Broadcast to user channels via WebSocket                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
┌──────────────────────┐        ┌──────────────────────┐
│   WebSocket Push     │        │    REST API          │
│   (user:{userId})    │        │    /api/notifications│
└──────────────────────┘        └──────────────────────┘
          │                                 │
          └────────────────┬────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend                                    │
│  NotificationBell → NotificationDropdown → NotificationItem      │
│  useNotifications hook (REST + WebSocket subscription)           │
└─────────────────────────────────────────────────────────────────┘
```

## Data Model Changes

### No Schema Changes Required
The existing `notifications` and `notificationPreferences` tables are sufficient.

### New WebSocket Channel Type
Add user-specific channel for notification delivery:

```typescript
// apps/server/src/realtime/types.ts
export type ChannelType = 'workspace' | 'project' | 'issue' | 'user'; // add 'user'
```

### New Message Types
```typescript
// apps/server/src/realtime/types.ts
export type MessageType =
  // ... existing types ...
  | 'notification_created'    // New notification for user
  | 'notification_read'       // Notification marked as read
  | 'notifications_read_all'; // All notifications marked as read
```

## Proposed API / Component Interfaces

### Backend API Routes

```typescript
// apps/server/src/api/notifications.ts

// GET /api/notifications
// Query params: ?limit=50&offset=0&unreadOnly=false
// Response: Notification[]

// GET /api/notifications/unread-count
// Response: { count: number }

// PUT /api/notifications/:id/read
// Response: { success: true }

// PUT /api/notifications/read-all
// Response: { count: number } // number marked as read

// DELETE /api/notifications/:id
// Response: { success: true }
```

### Notification Preferences API

```typescript
// GET /api/notification-preferences?projectId=xxx
// Response: NotificationPreference | null

// PUT /api/notification-preferences
// Body: { projectId, emailNotifications?, issueAssigned?, issueMentioned?, ... }
// Response: NotificationPreference
```

### Notification Service Interface

```typescript
// apps/server/src/services/notifications.ts

interface NotificationService {
  // Create notifications for an event
  notifyIssueAssigned(issueId: string, assigneeId: string, assignedBy: string): Promise<void>;
  notifyIssueMentioned(issueId: string, mentionedUserIds: string[], mentionedBy: string): Promise<void>;
  notifyIssueStatusChanged(issueId: string, oldStatus: string, newStatus: string, changedBy: string): Promise<void>;
  notifyCommentCreated(issueId: string, commentId: string, commentBy: string): Promise<void>;
  notifyCommentMentioned(issueId: string, commentId: string, mentionedUserIds: string[], mentionedBy: string): Promise<void>;

  // Parse @mentions from TipTap HTML content
  extractMentionedUserIds(htmlContent: string): string[];
}
```

### Frontend Components

```typescript
// components/notifications/notification-bell.tsx
interface NotificationBellProps {
  className?: string;
}
// Renders bell icon with unread count badge
// Opens NotificationDropdown on click

// components/notifications/notification-dropdown.tsx
interface NotificationDropdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
// Renders popover with notification list
// Includes "Mark all as read" button

// components/notifications/notification-item.tsx
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onClick: () => void;
}
// Renders single notification row with:
// - Icon based on type
// - Title and message
// - Relative timestamp
// - Unread indicator

// components/notifications/notification-preferences.tsx
interface NotificationPreferencesProps {
  projectId: string;
}
// Renders toggle switches for each notification type
```

### Frontend Hook

```typescript
// hooks/use-notifications.ts
interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => void;
}

function useNotifications(): UseNotificationsReturn;
// - Fetches notifications via REST on mount
// - Subscribes to user:{userId} WebSocket channel
// - Handles real-time notification_created events
// - Manages optimistic updates for mark as read
```

## Integration Points

### Issue API Integration
Modify `apps/server/src/api/issues.ts`:

```typescript
// In POST /issues (create)
if (data.assigneeId && data.assigneeId !== user.id) {
  await notificationService.notifyIssueAssigned(issueId, data.assigneeId, user.id);
}
const mentionedUserIds = notificationService.extractMentionedUserIds(data.description || '');
if (mentionedUserIds.length > 0) {
  await notificationService.notifyIssueMentioned(issueId, mentionedUserIds, user.id);
}

// In PUT /issues/:id (update)
if (data.assigneeId && data.assigneeId !== issue.assigneeId && data.assigneeId !== user.id) {
  await notificationService.notifyIssueAssigned(issueId, data.assigneeId, user.id);
}
if (data.status && data.status !== issue.status) {
  await notificationService.notifyIssueStatusChanged(issueId, issue.status, data.status, user.id);
}
// Check for new mentions in description
```

### Comment API Integration
Modify comment routes in `apps/server/src/api/issues.ts`:

```typescript
// In POST /issues/:id/comments
await notificationService.notifyCommentCreated(issueId, commentId, user.id);
const mentionedUserIds = notificationService.extractMentionedUserIds(body);
if (mentionedUserIds.length > 0) {
  await notificationService.notifyCommentMentioned(issueId, commentId, mentionedUserIds, user.id);
}
```

### WebSocket Subscription
Add user channel subscription on connection:

```typescript
// apps/server/src/realtime/handlers.ts - open handler
ws.subscribe(channel);
ws.subscribe(`user:${userId}`); // Always subscribe to personal notifications channel
```

## Performance & Security

### Performance Considerations

1. **Batch notification creation** - When notifying subscribers, use batch insert
2. **Preference caching** - Consider caching preferences in memory or using a LRU cache for frequent lookups
3. **Unread count** - Store denormalized count or use efficient index on `(userId, isRead)`
4. **Notification cleanup** - Add scheduled job to delete old notifications (> 90 days)

### Security & Authorization

1. **Notifications are user-scoped** - Users can only access their own notifications
2. **Project membership check** - Verify user has access to the project before creating notification
3. **WebSocket channel auth** - User channels are keyed by authenticated userId, preventing cross-user access
4. **Preference ownership** - Users can only modify their own preferences

### Database Indexes
Ensure these indexes exist for performance:

```sql
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notification_prefs_user_project ON notification_preferences(user_id, project_id);
```

## Trade-offs

### Decision: User-specific WebSocket channels vs. Polling

**Chosen: User-specific WebSocket channels**

| Approach | Pros | Cons |
|----------|------|------|
| User channels | Instant delivery, low server load | Slightly more complex subscription logic |
| Polling | Simple implementation | High server load, delayed notifications |

*Rationale: The WebSocket infrastructure already exists and supports pub/sub efficiently. Adding a user channel is minimal effort for significant UX improvement.*

### Decision: Inline notification creation vs. Queue

**Chosen: Inline (synchronous) notification creation**

| Approach | Pros | Cons |
|----------|------|------|
| Inline | Simple, immediate, no infrastructure | Adds latency to mutations |
| Queue | Decoupled, handles spikes | Requires queue setup, eventual consistency |

*Rationale: Notification creation is lightweight (few DB inserts + broadcast). Inline keeps it simple. Can migrate to queue later if latency becomes an issue.*

### Decision: Mention parsing approach

**Chosen: Parse TipTap HTML on server**

| Approach | Pros | Cons |
|----------|------|------|
| Server-side HTML parsing | Works for all clients, single source of truth | Requires regex/DOM parsing |
| Client sends mention IDs | Simpler server logic | Requires client changes, can be spoofed |

*Rationale: TipTap stores mentions as `<span data-type="mention" data-id="user-uuid">`. Parsing this server-side is reliable and doesn't require client changes.*

### Decision: Notification grouping

**Deferred: No grouping in v1**

*Rationale: Grouping (e.g., "5 comments on PROJ-123") adds complexity in aggregation logic and UI. Ship without grouping first, add as enhancement based on user feedback.*

## File Structure

```
apps/server/src/
├── api/
│   └── notifications.ts          # NEW: Notification REST routes
├── services/
│   └── notifications.ts          # NEW: Notification creation service
├── realtime/
│   └── types.ts                  # MODIFY: Add user channel + message types
│   └── handlers.ts               # MODIFY: Auto-subscribe to user channel
├── components/
│   └── notifications/            # NEW: Notification UI components
│       ├── notification-bell.tsx
│       ├── notification-dropdown.tsx
│       ├── notification-item.tsx
│       └── notification-preferences.tsx
├── hooks/
│   └── use-notifications.ts      # NEW: Notifications hook
```
