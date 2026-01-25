# Requirements: User Dashboard

## Problem Statement

- **Pain point:** The current homepage is a flat "My Issues" list that only shows issues assigned to the user. Users lack a holistic view of their work across projects—they can't easily see their recent activity, pending notifications, issues they reported, overdue items, or where they've been mentioned without navigating to multiple screens.
- **Priority now:** As the platform grows with more projects and collaboration, users need a central hub to understand their workload and stay on top of important updates. The existing data (activity logs, notifications, issue subscriptions) is already being captured but not surfaced in a unified view.

## User Stories

### Issues Overview
- [ ] As a **user**, I want to see a count of issues assigned to me by status, so that I can quickly understand my workload distribution.
- [ ] As a **user**, I want to see my overdue issues prominently, so that I don't miss deadlines.
- [ ] As a **user**, I want to see issues I recently reported, so that I can track their progress.
- [ ] As a **user**, I want quick filters to switch between assigned/reported/watching issues, so that I can focus on different aspects of my work.

### Notifications & Mentions
- [ ] As a **user**, I want to see my unread notifications count and a preview of recent notifications, so that I stay informed without opening a separate view.
- [ ] As a **user**, I want to see issues where I've been @mentioned, so that I can respond to requests for my input.

### Activity & Progress
- [ ] As a **user**, I want to see my recent activity (issues created, status changes, comments), so that I can recall what I've been working on.
- [ ] As a **user**, I want to see a summary of issues I completed this week/month, so that I can track my productivity.

### Navigation & Quick Actions
- [ ] As a **user**, I want quick action buttons to create an issue or jump to a project, so that common tasks are one click away.
- [ ] As a **user**, I want the dashboard to load quickly with skeleton states, so that I'm not blocked by slow data fetching.

## Success Criteria (MoSCoW)

### Must Have
- **Issues summary cards** showing counts by status (backlog, in progress, in review, done) for assigned issues
- **Overdue issues section** listing issues past their due date with visual urgency indicators
- **Assigned issues list** showing top 5-10 recent/priority issues with status, project, and due date
- **Recent activity feed** showing last 10 user actions (created, updated, commented)
- **Unread notification count** in dashboard header (integrates with notification feature)
- **Cross-project aggregation** - data from all projects user has access to
- **Replace current homepage** - dashboard becomes the default landing page at `/`

### Should Have
- **Issues I reported** section showing issues created by user with current status
- **Issues I'm watching** section showing subscribed issues with recent updates
- **Mentions feed** showing issues/comments where user was @mentioned
- **Completed issues count** for current week with comparison to previous week
- **Quick action buttons** for "Create Issue" and "View All Issues"
- **Project shortcuts** showing user's most active projects

### Could Have
- **Customizable dashboard layout** - drag/drop or toggle sections
- **Date range picker** for activity/stats (today, this week, this month)
- **Issue progress chart** showing completion trend over time
- **Workload heatmap** showing busy days based on due dates
- **Pinned/favorite issues** section for quick access

## Out of Scope

- **Team/organization dashboard** - this is strictly a personal user dashboard
- **Project-level analytics** - project dashboards are a separate feature
- **Export/reporting** - no PDF/CSV export of dashboard data
- **Real-time collaborative features** - no live cursors or multiplayer editing
- **Mobile-specific layout** - responsive design yes, but no dedicated mobile views
- **Dashboard widgets marketplace** - no third-party or custom widgets

## Existing Infrastructure (Context)

| Component | Location | Relevance |
|-----------|----------|-----------|
| `activityLog` table | `packages/database/src/schema/activity.ts` | Powers recent activity feed |
| `issues` table | `packages/database/src/schema/issues.ts` | Issues with assignee, reporter, status, dueDate |
| `issueSubscribers` table | `packages/database/src/schema/issues.ts` | Tracks watched issues |
| `notifications` table | `packages/database/src/schema/notifications.ts` | Notification data (from notifications feature) |
| Current homepage | `apps/server/src/routes/_layout.index.tsx` | Will be replaced by dashboard |
| `useIssues` hook | `apps/server/src/hooks/use-issues.ts` | Existing issue fetching logic |
| `useMe` hook | `apps/server/src/hooks/use-users.ts` | Current user data |

## Dashboard Layout (Wireframe)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Welcome back, {userName}!                    [Create Issue] [?]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ Backlog  │ │   Todo   │ │In Progress│ │   Done   │  <- Stats   │
│  │    12    │ │     5    │ │     3     │ │    28    │     Cards   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
│                                                                     │
│  ┌─────────────────────────────────┐ ┌─────────────────────────────┐│
│  │ ⚠️ Overdue Issues (3)           │ │ 🔔 Notifications (5 unread) ││
│  │ ─────────────────────────────── │ │ ─────────────────────────── ││
│  │ • PROJ-123: Fix login bug       │ │ • John assigned you PROJ-45 ││
│  │   Due: 2 days ago               │ │ • Sarah mentioned you in... ││
│  │ • PROJ-456: Update docs         │ │ • Issue PROJ-78 status...   ││
│  │   Due: Yesterday                │ │                             ││
│  │                    [View All →] │ │                [View All →] ││
│  └─────────────────────────────────┘ └─────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────────┐ ┌─────────────────────────────┐│
│  │ 📋 My Issues                    │ │ 📊 Recent Activity          ││
│  │ [Assigned] [Reported] [Watching]│ │ ─────────────────────────── ││
│  │ ─────────────────────────────── │ │ • You created PROJ-99       ││
│  │ • PROJ-789: Implement feature   │ │   2 hours ago               ││
│  │   In Progress · High · Due Fri  │ │ • You changed status of...  ││
│  │ • PROJ-101: Review PR           │ │   3 hours ago               ││
│  │   Todo · Medium · No due date   │ │ • You commented on PROJ-12  ││
│  │                    [View All →] │ │   Yesterday                 ││
│  └─────────────────────────────────┘ └─────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Requirements

### API Endpoints Needed

| Endpoint | Description |
|----------|-------------|
| `GET /api/dashboard/stats` | Issue counts by status for current user |
| `GET /api/dashboard/overdue` | Issues past due date assigned to user |
| `GET /api/dashboard/issues` | Paginated issues (filter: assigned/reported/watching) |
| `GET /api/dashboard/activity` | Recent activity log entries for user |
| `GET /api/dashboard/mentions` | Issues/comments where user is mentioned |

*Note: Some data may be fetchable via existing endpoints with query params; new endpoints provide optimized aggregations.*
