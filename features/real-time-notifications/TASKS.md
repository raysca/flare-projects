# Implementation Tasks: Real-Time Notifications

## [ ] Phase 1: Foundation

### [ ] Task 1.1: Extend WebSocket types for notifications
**File:** `apps/server/src/realtime/types.ts`

- Add `'user'` to `ChannelType` union
- Add notification message types: `'notification_created'`, `'notification_read'`, `'notifications_read_all'`
- Add `NotificationPayload` interface for type safety

**Acceptance:** Types compile, no runtime changes yet.

---

### [ ] Task 1.2: Create notification service
**File:** `apps/server/src/services/notifications.ts` (new)

- Implement `extractMentionedUserIds(html: string): string[]` - parse TipTap mention spans
- Implement `shouldNotify(userId, projectId, type): Promise<boolean>` - check preferences
- Implement `createNotification(params): Promise<Notification>` - insert to DB + broadcast
- Implement `notifyIssueAssigned(issueId, assigneeId, assignedBy)`
- Implement `notifyIssueMentioned(issueId, userIds[], mentionedBy)`
- Implement `notifyIssueStatusChanged(issueId, oldStatus, newStatus, changedBy)`
- Implement `notifyCommentCreated(issueId, commentId, commentBy)`
- Implement `notifyCommentMentioned(issueId, commentId, userIds[], mentionedBy)`

**Acceptance:** Service can create notifications and broadcast to user channels. Unit tests pass for mention extraction.

---

### [ ] Task 1.3: Create notifications API routes
**File:** `apps/server/src/api/notifications.ts` (new)

Implement endpoints:
- `GET /notifications` - list user's notifications (paginated, optional unreadOnly filter)
- `GET /notifications/unread-count` - return `{ count: number }`
- `PUT /notifications/:id/read` - mark single notification as read
- `PUT /notifications/read-all` - mark all as read, return count
- `DELETE /notifications/:id` - delete a notification

**Acceptance:** All endpoints work via manual API testing. Auth required for all routes.

---

### [ ] Task 1.4: Create notification preferences API routes
**File:** `apps/server/src/api/notifications.ts` (extend)

Implement endpoints:
- `GET /notification-preferences` - get preferences for a project (query: `?projectId=xxx`)
- `PUT /notification-preferences` - upsert preferences

**Acceptance:** Preferences can be fetched and updated per project.

---

### [ ] Task 1.5: Mount notification routes
**File:** `apps/server/src/api.ts`

- Import and mount `notificationsRoutes` at `/notifications`

**Acceptance:** Routes accessible at `/api/notifications/*`.

---

## [ ] Phase 2: Backend Integration

### [ ] Task 2.1: Auto-subscribe users to personal notification channel
**File:** `apps/server/src/realtime/handlers.ts`

In `open` handler:
- Add `ws.subscribe(\`user:${userId}\`)` to subscribe user to their personal channel

**Acceptance:** Users receive messages published to `user:{userId}` channel.

---

### [ ] Task 2.2: Integrate notifications into issue creation
**File:** `apps/server/src/api/issues.ts`

In `POST /issues`:
- After issue creation, call `notifyIssueAssigned` if assignee differs from creator
- Extract mentions from description, call `notifyIssueMentioned`

**Acceptance:** Creating an issue with an assignee or @mentions generates notifications.

---

### [ ] Task 2.3: Integrate notifications into issue updates
**File:** `apps/server/src/api/issues.ts`

In `PUT /issues/:id`:
- Call `notifyIssueAssigned` when assignee changes (and new assignee != updater)
- Call `notifyIssueStatusChanged` when status changes (notify subscribers)
- Extract new mentions from description, call `notifyIssueMentioned`

**Acceptance:** Updating issue assignee/status/description generates appropriate notifications.

---

### [ ] Task 2.4: Integrate notifications into comment creation
**File:** `apps/server/src/api/issues.ts`

In `POST /issues/:id/comments`:
- Call `notifyCommentCreated` to notify issue subscribers (excluding commenter)
- Extract mentions from comment body, call `notifyCommentMentioned`

**Acceptance:** Creating a comment notifies subscribers and mentioned users.

---

## [ ] Phase 3: Frontend Components

### [ ] Task 3.1: Create useNotifications hook
**File:** `apps/server/src/hooks/use-notifications.ts` (new)

- Fetch notifications via `GET /api/notifications` on mount
- Fetch unread count via `GET /api/notifications/unread-count`
- Subscribe to `user:{userId}` WebSocket channel for real-time updates
- Handle `notification_created` message to prepend new notification
- Handle `notification_read` / `notifications_read_all` for sync
- Expose `markAsRead(id)`, `markAllAsRead()` with optimistic updates
- Use TanStack Query for caching and refetching

**Acceptance:** Hook returns notifications, unreadCount, loading state, and mutation functions.

---

### [ ] Task 3.2: Create NotificationItem component
**File:** `apps/server/src/components/notifications/notification-item.tsx` (new)

- Display notification icon (based on type: assignment, mention, comment, status)
- Display title, message, and relative timestamp
- Visual indicator for unread (e.g., blue dot)
- Click handler to navigate to issue and mark as read

**Acceptance:** Component renders correctly for all notification types with proper styling.

---

### [ ] Task 3.3: Create NotificationDropdown component
**File:** `apps/server/src/components/notifications/notification-dropdown.tsx` (new)

- Popover/dropdown using shadcn Popover
- Header with "Notifications" title and "Mark all as read" button
- Scrollable list of NotificationItems (max height ~400px)
- Empty state when no notifications
- Loading skeleton while fetching

**Acceptance:** Dropdown opens/closes, displays notifications, mark all as read works.

---

### [ ] Task 3.4: Create NotificationBell component
**File:** `apps/server/src/components/notifications/notification-bell.tsx` (new)

- Bell icon (Lucide `Bell`)
- Badge showing unread count (hidden when 0)
- Click opens NotificationDropdown
- Uses useNotifications hook

**Acceptance:** Bell displays count badge and opens dropdown on click.

---

### [ ] Task 3.5: Integrate NotificationBell into app header
**File:** Identify existing header/layout component and add NotificationBell

- Position bell icon in header (near user avatar/menu)
- Only render when user is authenticated

**Acceptance:** NotificationBell visible in header for logged-in users.

---

### [ ] Task 3.6: Create NotificationPreferences component
**File:** `apps/server/src/components/notifications/notification-preferences.tsx` (new)

- Form with toggle switches for each notification type
- Fetch current preferences on mount
- Save on toggle change (debounced or with save button)
- Per-project scope (receives projectId prop)

**Acceptance:** Users can toggle notification preferences and changes persist.

---

### [ ] Task 3.7: Add notification preferences to project settings
**File:** Identify project settings page/route

- Add "Notifications" section or tab
- Render NotificationPreferences component with current project ID

**Acceptance:** Users can access notification preferences from project settings.

---

## [ ] Phase 4: Polish & Validation

### [ ] Task 4.1: Add database indexes for notification queries
**File:** `packages/database/src/schema/notifications.ts` or migration

Add indexes:
- `(user_id, is_read, created_at DESC)` for listing notifications
- `(user_id, project_id)` on notification_preferences for lookups

**Acceptance:** Indexes created, query performance verified.

---

### [ ] Task 4.2: Add toast notifications for high-priority events
**File:** Extend `useNotifications` hook or create separate handler

- Show toast/snackbar for `issue_assigned` and `*_mentioned` notifications
- Use existing toast system (if available) or add sonner/react-hot-toast
- Toast should be clickable to navigate to issue

**Acceptance:** Assignment and mention notifications show toast in real-time.

---

### [ ] Task 4.3: Write unit tests for notification service
**File:** `apps/server/src/services/notifications.test.ts` (new)

Test cases:
- `extractMentionedUserIds` correctly parses TipTap mention HTML
- `shouldNotify` respects user preferences
- Notification creation inserts correct data

**Acceptance:** Tests pass with `bun test`.

---

### [ ] Task 4.4: Write integration tests for notification API
**File:** `apps/e2e/tests/notifications.spec.ts` (new)

Test flows:
- Create issue with assignee → assignee receives notification
- Create comment with @mention → mentioned user receives notification
- Mark notification as read → unread count decreases
- Notification preferences respected

**Acceptance:** E2E tests pass with Playwright.

---

## Task Dependency Graph

```
1.1 ─┬─► 1.2 ─┬─► 2.1
     │        │
     │        ├─► 2.2 ─┬─► 4.3
     │        │        │
     │        ├─► 2.3 ─┤
     │        │        │
     │        └─► 2.4 ─┴─► 4.4
     │
     └─► 1.3 ─┬─► 1.5 ─► 3.1 ─┬─► 3.2 ─► 3.3 ─► 3.4 ─► 3.5 ─► 4.2
              │               │
              └─► 1.4 ────────┴─► 3.6 ─► 3.7

4.1 (can run anytime after 1.3)
```

## Suggested PR Groupings

| PR | Tasks | Description |
|----|-------|-------------|
| PR 1 | 1.1, 1.2 | Notification service foundation |
| PR 2 | 1.3, 1.4, 1.5 | Notification API routes |
| PR 3 | 2.1, 2.2, 2.3, 2.4 | Backend event integration |
| PR 4 | 3.1, 3.2, 3.3, 3.4, 3.5 | Frontend notification UI |
| PR 5 | 3.6, 3.7 | Notification preferences UI |
| PR 6 | 4.1, 4.2, 4.3, 4.4 | Polish, indexes, tests |
