# Tech Design: User Dashboard

## Architecture Overview

The dashboard follows a **parallel data fetching** pattern where each section loads independently, allowing faster perceived performance and graceful degradation if one section fails.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Dashboard Page                               │
│                    (apps/server/src/routes/_layout.index.tsx)        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ useDashboard │      │ useDashboard │      │ useDashboard │
│    Stats     │      │   Issues     │      │  Activity    │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │                     │                     │
       ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│GET /dashboard│      │GET /dashboard│      │GET /dashboard│
│    /stats    │      │   /issues    │      │  /activity   │
└──────────────┘      └──────────────┘      └──────────────┘
       │                     │                     │
       └─────────────────────┴─────────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   D1 Database    │
                    │ (issues, activity│
                    │  log, etc.)      │
                    └──────────────────┘
```

**Key Principles:**
1. **Independent sections** - Each dashboard section has its own hook and API call
2. **Skeleton loading** - Each section shows a skeleton while loading
3. **Error boundaries** - Section failures don't crash the whole dashboard
4. **Optimistic caching** - Use TanStack Query with appropriate stale times

## Data Model Changes

### No Schema Changes Required
All required data exists in current tables:
- `issues` - assigneeId, reporterId, status, dueDate
- `activity_log` - userId, action, entityType, createdAt
- `issue_subscribers` - userId, issueId
- `notifications` - userId, isRead (from notifications feature)

### New Query Keys
```typescript
// apps/server/src/lib/query-keys.ts
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  issues: (filter: string) => [...dashboardKeys.all, 'issues', filter] as const,
  overdue: () => [...dashboardKeys.all, 'overdue'] as const,
  activity: () => [...dashboardKeys.all, 'activity'] as const,
  mentions: () => [...dashboardKeys.all, 'mentions'] as const,
}
```

## Proposed API Endpoints

### GET /api/v1/dashboard/stats
Returns aggregated issue counts by status for the current user.

**Response:**
```typescript
interface DashboardStats {
  assigned: {
    backlog: number;
    todo: number;
    in_progress: number;
    in_review: number;
    done: number;
    cancelled: number;
    total: number;
  };
  reported: {
    total: number;
    open: number;  // not done/cancelled
  };
  watching: {
    total: number;
  };
  completedThisWeek: number;
  completedLastWeek: number;
}
```

**SQL (conceptual):**
```sql
-- Assigned issues by status
SELECT status, COUNT(*) FROM issues
WHERE assignee_id = :userId
GROUP BY status;

-- Completed this week
SELECT COUNT(*) FROM issues
WHERE assignee_id = :userId
  AND status = 'done'
  AND completed_at >= :weekStart;
```

---

### GET /api/v1/dashboard/overdue
Returns issues past their due date assigned to the current user.

**Query params:** `?limit=5`

**Response:**
```typescript
interface OverdueIssue {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  daysOverdue: number;
  project: {
    id: string;
    name: string;
    identifier: string;
  };
}

type Response = OverdueIssue[];
```

---

### GET /api/v1/dashboard/issues
Returns paginated issues for the user with filter support.

**Query params:** `?filter=assigned|reported|watching&limit=10&offset=0`

**Response:**
```typescript
interface DashboardIssue {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  updatedAt: string;
  project: {
    id: string;
    name: string;
    identifier: string;
  };
  assignee?: {
    id: string;
    name: string;
    avatarUrl: string;
  };
}

interface Response {
  issues: DashboardIssue[];
  total: number;
  hasMore: boolean;
}
```

---

### GET /api/v1/dashboard/activity
Returns recent activity for the current user.

**Query params:** `?limit=10`

**Response:**
```typescript
interface ActivityItem {
  id: string;
  action: 'created' | 'updated' | 'status_changed' | 'commented' | 'assigned' | ...;
  entityType: 'issue' | 'comment' | 'project';
  entityId: string;
  metadata: Record<string, unknown>;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
  issue?: {
    id: string;
    number: number;
    title: string;
    project: {
      identifier: string;
    };
  };
}

type Response = ActivityItem[];
```

---

### GET /api/v1/dashboard/mentions
Returns issues/comments where the user was @mentioned.

**Query params:** `?limit=10`

**Response:**
```typescript
interface MentionItem {
  id: string;
  type: 'issue' | 'comment';
  mentionedAt: string;
  issue: {
    id: string;
    number: number;
    title: string;
    project: {
      identifier: string;
    };
  };
  mentionedBy: {
    id: string;
    name: string;
    avatarUrl: string;
  };
  snippet: string; // Text snippet around the mention
}

type Response = MentionItem[];
```

## Component Interfaces

### Dashboard Page Structure
```
_layout.index.tsx (Dashboard)
├── DashboardHeader
│   ├── Welcome message
│   ├── Quick actions (Create Issue button)
│   └── Keyboard shortcuts button
├── DashboardStatsCards
│   ├── StatCard (Backlog)
│   ├── StatCard (Todo)
│   ├── StatCard (In Progress)
│   └── StatCard (Done)
├── DashboardGrid (2-column layout)
│   ├── OverdueIssuesCard
│   ├── NotificationsCard (uses useNotifications from notifications feature)
│   ├── MyIssuesCard
│   │   ├── Tab: Assigned
│   │   ├── Tab: Reported
│   │   └── Tab: Watching
│   └── RecentActivityCard
```

### Component Props

```typescript
// components/dashboard/stat-card.tsx
interface StatCardProps {
  label: string;
  count: number;
  icon: LucideIcon;
  color: 'default' | 'warning' | 'success' | 'info';
  href?: string; // Optional link to filtered view
}

// components/dashboard/overdue-issues-card.tsx
interface OverdueIssuesCardProps {
  issues: OverdueIssue[];
  isLoading: boolean;
}

// components/dashboard/my-issues-card.tsx
interface MyIssuesCardProps {
  defaultTab?: 'assigned' | 'reported' | 'watching';
}

// components/dashboard/recent-activity-card.tsx
interface RecentActivityCardProps {
  activities: ActivityItem[];
  isLoading: boolean;
}

// components/dashboard/dashboard-skeleton.tsx
// Full-page skeleton for initial load
```

### Hooks

```typescript
// hooks/use-dashboard.ts

// Stats hook
function useDashboardStats(): UseQueryResult<DashboardStats>;

// Overdue issues hook
function useDashboardOverdue(limit?: number): UseQueryResult<OverdueIssue[]>;

// Issues hook with filter
function useDashboardIssues(
  filter: 'assigned' | 'reported' | 'watching',
  options?: { limit?: number; offset?: number }
): UseQueryResult<{ issues: DashboardIssue[]; total: number; hasMore: boolean }>;

// Activity hook
function useDashboardActivity(limit?: number): UseQueryResult<ActivityItem[]>;

// Mentions hook
function useDashboardMentions(limit?: number): UseQueryResult<MentionItem[]>;
```

## State Management

### Query Configuration
```typescript
// Stale times for dashboard queries
const DASHBOARD_STALE_TIMES = {
  stats: 30 * 1000,      // 30 seconds - changes frequently
  overdue: 60 * 1000,    // 1 minute
  issues: 30 * 1000,     // 30 seconds
  activity: 60 * 1000,   // 1 minute
  mentions: 2 * 60 * 1000, // 2 minutes - less frequent
};
```

### Real-time Updates
The dashboard integrates with the existing WebSocket infrastructure:
- When `issue_updated` or `issue_created` events are received, invalidate relevant dashboard queries
- Notifications card uses `useNotifications` hook (from notifications feature) which handles real-time updates

```typescript
// In useDashboard hooks, listen for WebSocket events
useEffect(() => {
  const handleIssueUpdate = () => {
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  };

  // Subscribe to workspace channel events
  socket.on('issue_updated', handleIssueUpdate);
  socket.on('issue_created', handleIssueUpdate);

  return () => {
    socket.off('issue_updated', handleIssueUpdate);
    socket.off('issue_created', handleIssueUpdate);
  };
}, []);
```

## Performance & Security

### Performance Optimizations

1. **Parallel fetching** - All dashboard sections fetch data simultaneously
2. **Skeleton loading** - Each section renders a skeleton independently
3. **Limited queries** - Default limits on all endpoints (5-10 items per section)
4. **Indexed queries** - Ensure proper indexes exist:
   ```sql
   CREATE INDEX idx_issues_assignee_status ON issues(assignee_id, status);
   CREATE INDEX idx_issues_reporter ON issues(reporter_id);
   CREATE INDEX idx_issues_due_date ON issues(due_date) WHERE due_date IS NOT NULL;
   CREATE INDEX idx_activity_user ON activity_log(user_id, created_at DESC);
   ```

5. **Prefetching** - Consider prefetching dashboard data on login

### Security Considerations

1. **User-scoped data** - All queries filter by authenticated user's ID
2. **Project membership** - Dashboard only shows data from projects user has access to
3. **No sensitive data exposure** - Stats are counts only, no PII in aggregations

## Trade-offs

### Decision: Multiple endpoints vs. Single aggregated endpoint

**Chosen: Multiple specialized endpoints**

| Approach | Pros | Cons |
|----------|------|------|
| Multiple endpoints | Independent loading, partial failures, caching per section | More HTTP requests |
| Single endpoint | One request, simpler client code | All-or-nothing loading, harder to cache |

*Rationale: Multiple endpoints allow each section to load and cache independently. Users see content faster as sections populate. If one section fails, others still work.*

### Decision: Server-side vs. Client-side filtering for "My Issues" tabs

**Chosen: Server-side filtering**

| Approach | Pros | Cons |
|----------|------|------|
| Server-side | Less data transferred, pagination works | More API complexity |
| Client-side | Simpler API, instant tab switching | Must fetch all data upfront |

*Rationale: Users may have hundreds of issues. Server-side filtering with pagination scales better and reduces initial load time.*

### Decision: Dedicated dashboard routes vs. Extend existing routes

**Chosen: Dedicated `/dashboard/*` routes**

| Approach | Pros | Cons |
|----------|------|------|
| Dedicated routes | Optimized queries, clear separation | New API surface |
| Extend existing | Less code, reuse logic | May over-fetch, harder to optimize |

*Rationale: Dashboard queries need specific aggregations (counts, overdue, etc.) that don't map well to existing CRUD endpoints. Dedicated routes allow query optimization.*

## File Structure

```
apps/server/src/
├── api/
│   └── dashboard.ts                    # NEW: Dashboard API routes
├── routes/
│   └── _layout.index.tsx               # MODIFY: Replace with Dashboard
├── components/
│   └── dashboard/                      # NEW: Dashboard components
│       ├── dashboard-header.tsx
│       ├── dashboard-stats-cards.tsx
│       ├── stat-card.tsx
│       ├── overdue-issues-card.tsx
│       ├── my-issues-card.tsx
│       ├── recent-activity-card.tsx
│       ├── notifications-preview-card.tsx
│       └── dashboard-skeleton.tsx
├── hooks/
│   └── use-dashboard.ts                # NEW: Dashboard hooks
└── lib/
    └── query-keys.ts                   # MODIFY: Add dashboard keys
```

## Integration with Notifications Feature

The dashboard's "Notifications" section integrates with the `useNotifications` hook from the real-time notifications feature:

```typescript
// In notifications-preview-card.tsx
import { useNotifications } from '@/hooks/use-notifications';

function NotificationsPreviewCard() {
  const { notifications, unreadCount, isLoading } = useNotifications();

  // Show top 5 notifications
  const previewNotifications = notifications.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Notifications
          {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {previewNotifications.map(notification => (
          <NotificationItem key={notification.id} {...notification} />
        ))}
      </CardContent>
      <CardFooter>
        <Link to="/notifications">View all</Link>
      </CardFooter>
    </Card>
  );
}
```

This creates a natural connection between the dashboard and the full notifications feature.
