# Implementation Tasks: User Dashboard

## [x] Phase 1: Backend Foundation

### [x] Task 1.1: Add dashboard query keys
**File:** `apps/server/src/lib/query-keys.ts`

- Add `dashboardKeys` object with keys for: `all`, `stats`, `issues`, `overdue`, `activity`, `mentions`
- Follow existing pattern from `issueKeys`

**Acceptance:** Query keys exported and TypeScript compiles.

---

### [x] Task 1.2: Create dashboard stats endpoint
**File:** `apps/server/src/api/dashboard.ts` (new)

Implement `GET /dashboard/stats`:
- Query issues where `assigneeId = currentUser.id`, group by status
- Query issues where `reporterId = currentUser.id`, count open vs total
- Query `issueSubscribers` for watching count
- Calculate `completedThisWeek` and `completedLastWeek` using `completedAt` timestamps
- Return `DashboardStats` response shape

**Acceptance:** Endpoint returns correct counts. Manual API testing passes.

---

### [x] Task 1.3: Create dashboard overdue endpoint
**File:** `apps/server/src/api/dashboard.ts`

Implement `GET /dashboard/overdue`:
- Query issues where `assigneeId = currentUser.id` AND `dueDate < NOW()` AND `status NOT IN ('done', 'cancelled')`
- Join with `projects` table for project info
- Calculate `daysOverdue` from `dueDate`
- Accept `?limit` query param (default 5)
- Order by `dueDate ASC` (most overdue first)

**Acceptance:** Returns overdue issues with correct project info and days calculation.

---

### [x] Task 1.4: Create dashboard issues endpoint
**File:** `apps/server/src/api/dashboard.ts`

Implement `GET /dashboard/issues`:
- Accept `?filter=assigned|reported|watching` query param
- Accept `?limit` and `?offset` for pagination
- Filter logic:
  - `assigned`: `assigneeId = currentUser.id`
  - `reported`: `reporterId = currentUser.id`
  - `watching`: JOIN `issueSubscribers` where `userId = currentUser.id`
- Join with `projects` and `users` (for assignee) tables
- Return `{ issues, total, hasMore }`

**Acceptance:** All three filters work correctly with pagination.

---

### [x] Task 1.5: Create dashboard activity endpoint
**File:** `apps/server/src/api/dashboard.ts`

Implement `GET /dashboard/activity`:
- Query `activityLog` where `userId = currentUser.id`
- Accept `?limit` query param (default 10)
- Order by `createdAt DESC`
- Join with `issues` table to get issue details (number, title, project identifier)
- Handle null `issueId` gracefully (some activities may not be issue-related)

**Acceptance:** Returns recent activities with issue context.

---

### [x] Task 1.6: Create dashboard mentions endpoint
**File:** `apps/server/src/api/dashboard.ts`

Implement `GET /dashboard/mentions`:
- Query `notifications` where `userId = currentUser.id` AND `type IN ('issue_mentioned', 'comment_mentioned')`
- Accept `?limit` query param (default 10)
- Order by `createdAt DESC`
- Join with `issues` and `users` tables for context
- Extract snippet from notification message

**Acceptance:** Returns mention notifications with context.

---

### [x] Task 1.7: Mount dashboard routes
**File:** `apps/server/src/api.ts`

- Import and mount `dashboardRoutes` at `/dashboard`

**Acceptance:** All dashboard endpoints accessible at `/api/v1/dashboard/*`.

---

### [x] Task 1.8: Add database indexes for dashboard queries
**File:** `packages/database/src/schema/issues.ts` or migration

Add indexes:
- `(assignee_id, status)` on issues
- `(reporter_id)` on issues
- `(due_date)` on issues (where not null)
- `(user_id, created_at DESC)` on activity_log

**Acceptance:** Indexes created, query performance verified.

---

## [x] Phase 2: Frontend Hooks

### [x] Task 2.1: Create useDashboardStats hook
**File:** `apps/server/src/hooks/use-dashboard.ts` (new)

- Fetch from `GET /api/v1/dashboard/stats`
- Use `dashboardKeys.stats()` query key
- Set `staleTime: 30 * 1000` (30 seconds)
- Return typed `DashboardStats`

**Acceptance:** Hook returns stats data with loading/error states.

---

### [x] Task 2.2: Create useDashboardOverdue hook
**File:** `apps/server/src/hooks/use-dashboard.ts`

- Fetch from `GET /api/v1/dashboard/overdue`
- Accept optional `limit` parameter
- Use `dashboardKeys.overdue()` query key
- Set `staleTime: 60 * 1000`

**Acceptance:** Hook returns overdue issues array.

---

### [x] Task 2.3: Create useDashboardIssues hook
**File:** `apps/server/src/hooks/use-dashboard.ts`

- Fetch from `GET /api/v1/dashboard/issues`
- Accept `filter: 'assigned' | 'reported' | 'watching'` parameter
- Accept optional `limit`, `offset` for pagination
- Use `dashboardKeys.issues(filter)` query key
- Set `staleTime: 30 * 1000`

**Acceptance:** Hook returns issues with pagination info, filter changes trigger refetch.

---

### [x] Task 2.4: Create useDashboardActivity hook
**File:** `apps/server/src/hooks/use-dashboard.ts`

- Fetch from `GET /api/v1/dashboard/activity`
- Accept optional `limit` parameter
- Use `dashboardKeys.activity()` query key
- Set `staleTime: 60 * 1000`

**Acceptance:** Hook returns activity items array.

---

### [x] Task 2.5: Create useDashboardMentions hook
**File:** `apps/server/src/hooks/use-dashboard.ts`

- Fetch from `GET /api/v1/dashboard/mentions`
- Accept optional `limit` parameter
- Use `dashboardKeys.mentions()` query key
- Set `staleTime: 2 * 60 * 1000`

**Acceptance:** Hook returns mention items array.

---

## [x] Phase 3: Frontend Components

### [x] Task 3.1: Create StatCard component
**File:** `apps/server/src/components/dashboard/stat-card.tsx` (new)

- Display icon, label, count
- Support color variants: default, warning (yellow), success (green), info (blue)
- Optional `href` prop to make card clickable/linkable
- Hover state styling

**Acceptance:** Component renders correctly with all color variants.

---

### [x] Task 3.2: Create DashboardStatsCards component
**File:** `apps/server/src/components/dashboard/dashboard-stats-cards.tsx` (new)

- Use `useDashboardStats` hook
- Render 4 StatCards in a responsive grid:
  - Backlog (default color)
  - Todo (info color)
  - In Progress (warning color)
  - Done (success color)
- Show skeleton when loading
- Each card links to filtered issues view

**Acceptance:** Stats cards display correct counts, skeleton shows during load.

---

### [x] Task 3.3: Create OverdueIssuesCard component
**File:** `apps/server/src/components/dashboard/overdue-issues-card.tsx` (new)

- Card with header "Overdue Issues" and count badge
- Use `useDashboardOverdue` hook
- List items showing: issue identifier, title, days overdue (with urgency color)
- Click to navigate to issue
- Empty state when no overdue issues
- "View All" link to filtered issues view
- Skeleton loading state

**Acceptance:** Displays overdue issues with visual urgency indicators.

---

### [x] Task 3.4: Create MyIssuesCard component
**File:** `apps/server/src/components/dashboard/my-issues-card.tsx` (new)

- Card with header "My Issues"
- Tabs: Assigned, Reported, Watching
- Use `useDashboardIssues` hook with filter based on active tab
- List items showing: identifier, title, status badge, priority, due date
- Click to navigate to issue
- Tab switching updates filter (no full page reload)
- "View All" link per tab
- Skeleton loading state

**Acceptance:** Tabs switch correctly, issues display with all metadata.

---

### [x] Task 3.5: Create RecentActivityCard component
**File:** `apps/server/src/components/dashboard/recent-activity-card.tsx` (new)

- Card with header "Recent Activity"
- Use `useDashboardActivity` hook
- List items showing: action icon, description, relative timestamp
- Description format: "You {action} {issue identifier}" (e.g., "You created PROJ-123")
- Click to navigate to related issue
- Empty state when no activity
- Skeleton loading state

**Acceptance:** Activity items render with correct icons and descriptions.

---

### [x] Task 3.6: Create NotificationsPreviewCard component
**File:** `apps/server/src/components/dashboard/notifications-preview-card.tsx` (new)

- Card with header "Notifications" and unread count badge
- Use `useNotifications` hook (from notifications feature)
- Show top 5 notifications
- Reuse `NotificationItem` component (from notifications feature)
- "View All" link to notifications page/dropdown
- Empty state when no notifications
- Skeleton loading state

**Acceptance:** Integrates with notifications feature, shows unread count.

---

### [x] Task 3.7: Create DashboardHeader component
**File:** `apps/server/src/components/dashboard/dashboard-header.tsx` (new)

- Welcome message: "Welcome back, {userName}!"
- Quick action buttons: "Create Issue"
- Keyboard shortcuts help button (?)
- Responsive layout

**Acceptance:** Header displays user name and action buttons work.

---

### [x] Task 3.8: Create DashboardSkeleton component
**File:** `apps/server/src/components/dashboard/dashboard-skeleton.tsx` (new)

- Full-page skeleton matching dashboard layout
- Skeleton cards for stats (4 cards)
- Skeleton cards for overdue, notifications, issues, activity
- Used for initial page load before any data arrives

**Acceptance:** Skeleton matches final layout proportions.

---

## [ ] Phase 4: Integration

### [ ] Task 4.1: Create Dashboard page layout
**File:** `apps/server/src/routes/_layout.index.tsx` (replace)

- Compose all dashboard components:
  - DashboardHeader
  - DashboardStatsCards
  - 2-column grid: OverdueIssuesCard, NotificationsPreviewCard
  - 2-column grid: MyIssuesCard, RecentActivityCard
- Responsive layout (stack on mobile)
- Use DashboardSkeleton for initial load

**Acceptance:** Dashboard renders with all sections, responsive on mobile.

---

### [ ] Task 4.2: Add WebSocket integration for real-time updates
**File:** `apps/server/src/hooks/use-dashboard.ts`

- Listen to workspace WebSocket channel
- On `issue_created`, `issue_updated`, `issue_deleted` events:
  - Invalidate `dashboardKeys.stats()`
  - Invalidate `dashboardKeys.issues()`
  - Invalidate `dashboardKeys.overdue()`
- Debounce invalidations to avoid excessive refetching

**Acceptance:** Dashboard updates when issues change in real-time.

---

### [ ] Task 4.3: Add keyboard shortcuts to dashboard
**File:** `apps/server/src/routes/_layout.index.tsx`

- `/` - Focus search (if search exists)
- `c` - Navigate to create issue
- `?` - Open keyboard shortcuts dialog
- Reuse `useKeyboardShortcuts` hook

**Acceptance:** Keyboard shortcuts work on dashboard page.

---

## [ ] Phase 5: Polish & Validation

### [ ] Task 5.1: Add empty states for all dashboard sections
**Files:** All dashboard card components

- Design consistent empty state UI
- Helpful messaging (e.g., "No overdue issues - you're all caught up!")
- Call-to-action where appropriate (e.g., "Create your first issue")

**Acceptance:** All sections handle empty data gracefully.

---

### [ ] Task 5.2: Add error boundaries to dashboard sections
**File:** `apps/server/src/components/dashboard/dashboard-error-boundary.tsx` (new)

- Create reusable error boundary component
- Wrap each dashboard section
- Show friendly error message with retry button
- Log errors for debugging

**Acceptance:** Section failures don't crash entire dashboard, retry works.

---

### [ ] Task 5.3: Write unit tests for dashboard API
**File:** `apps/server/src/api/dashboard.test.ts` (new)

Test cases:
- Stats endpoint returns correct counts
- Overdue endpoint filters correctly
- Issues endpoint filters by assigned/reported/watching
- Activity endpoint returns user's activities only
- Pagination works correctly

**Acceptance:** Tests pass with `bun test`.

---

### [ ] Task 5.4: Write E2E tests for dashboard
**File:** `apps/e2e/tests/dashboard.spec.ts` (new)

Test flows:
- Dashboard loads with all sections
- Stats cards show correct counts
- Tab switching in My Issues works
- Clicking issue navigates to issue page
- Create Issue button works

**Acceptance:** E2E tests pass with Playwright.

---

## Task Dependency Graph

```
1.1 ───► 1.2 ─┬─► 1.7 ───► 2.1 ───► 3.2 ─┐
              │                          │
         1.3 ─┤          2.2 ───► 3.3 ─┤
              │                          │
         1.4 ─┼─────────► 2.3 ───► 3.4 ─┼───► 4.1 ───► 4.2 ───► 5.1
              │                          │            │
         1.5 ─┤          2.4 ───► 3.5 ─┤            ├───► 5.2
              │                          │            │
         1.6 ─┘          2.5 ───► 3.6* ─┘            └───► 4.3

1.8 (can run anytime)
3.1 ───► 3.2
3.7 ───► 4.1
3.8 ───► 4.1

5.3 (after 1.7)
5.4 (after 4.1)

* Task 3.6 depends on notifications feature being implemented
```

## Suggested PR Groupings

| PR | Tasks | Description |
|----|-------|-------------|
| PR 1 | 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8 | Dashboard API endpoints |
| PR 2 | 2.1, 2.2, 2.3, 2.4, 2.5 | Dashboard hooks |
| PR 3 | 3.1, 3.2, 3.3, 3.7, 3.8 | Core dashboard components (stats, overdue, header, skeleton) |
| PR 4 | 3.4, 3.5 | Issues and activity cards |
| PR 5 | 3.6 | Notifications preview (depends on notifications feature) |
| PR 6 | 4.1, 4.2, 4.3 | Dashboard page integration |
| PR 7 | 5.1, 5.2, 5.3, 5.4 | Polish, error handling, tests |

## Notes

- **Task 3.6 (NotificationsPreviewCard)** depends on the real-time notifications feature being implemented first. If notifications feature is not ready, this task can be deferred or use a placeholder.
- **Task 1.8 (indexes)** can be done early in parallel with other work to improve query performance from the start.
- The current "My Issues" functionality from the old homepage is preserved in the `MyIssuesCard` component's "Assigned" tab.
