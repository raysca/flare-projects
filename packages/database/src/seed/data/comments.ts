import { NewComment, NewCommentReaction } from "../../schema/comments";
import { stableId } from "../utils";
import { issues } from "./issues";
import { adminUser, johnDoe, janeSmith, mikeWilson, sarahChen, davidKim } from "./users";

export interface SeedComment extends NewComment {
  id: string;
}

export interface SeedCommentReaction extends NewCommentReaction {
  id: string;
}

// Get specific issues for comments
const authLoginIssue = issues[0];
const authRedirectBugIssue = issues[2];
const teamManagementIssue = issues[6];
const invitationIssue = issues[7];
const slowQueryIssue = issues[9];
const designDashboardIssue = issues[10];
const durableObjectsIssue = issues[15];

export const comments: SeedComment[] = [
  // Comments on auth login issue
  {
    id: stableId("comment-auth-1"),
    issueId: authLoginIssue.id,
    userId: johnDoe.id,
    body: `Started working on this. Planning to use the following approach:

1. Hono middleware for auth checks
2. KV store for session management
3. bcrypt for password hashing

Will update with progress tomorrow.`,
    parentId: null,
  },
  {
    id: stableId("comment-auth-2"),
    issueId: authLoginIssue.id,
    userId: adminUser.id,
    body: `Sounds good! Make sure to implement rate limiting on the login endpoint to prevent brute force attacks. We should limit to 5 attempts per minute per IP.`,
    parentId: stableId("comment-auth-1"),
  },
  {
    id: stableId("comment-auth-3"),
    issueId: authLoginIssue.id,
    userId: johnDoe.id,
    body: `@admin Good call. I'll add rate limiting using KV with a sliding window approach.`,
    parentId: stableId("comment-auth-2"),
  },
  {
    id: stableId("comment-auth-4"),
    issueId: authLoginIssue.id,
    userId: mikeWilson.id,
    body: `Just reviewed the PR. The implementation looks solid! Left a few minor suggestions but nothing blocking. Approved for merge.`,
    parentId: null,
  },

  // Comments on auth redirect bug
  {
    id: stableId("comment-redirect-1"),
    issueId: authRedirectBugIssue.id,
    userId: johnDoe.id,
    body: `I can reproduce this. Looks like the redirect URL is not being cleared from the session after successful login, causing an infinite loop.`,
    parentId: null,
  },
  {
    id: stableId("comment-redirect-2"),
    issueId: authRedirectBugIssue.id,
    userId: adminUser.id,
    body: `Looking into this now. The issue is in the auth middleware - we're setting the redirect before checking if the user is already authenticated.`,
    parentId: null,
  },
  {
    id: stableId("comment-redirect-3"),
    issueId: authRedirectBugIssue.id,
    userId: sarahChen.id,
    body: `This is blocking several users from accessing the app. Can we prioritize a fix today?`,
    parentId: null,
  },

  // Comments on team management issue
  {
    id: stableId("comment-team-1"),
    issueId: teamManagementIssue.id,
    userId: mikeWilson.id,
    body: `I've completed the basic CRUD operations for teams. Working on member management now.

**Done:**
- Create team
- Update team name/settings
- Delete team (with confirmation)

**In Progress:**
- Add member to team
- Remove member from team
- Set team lead`,
    parentId: null,
  },
  {
    id: stableId("comment-team-2"),
    issueId: teamManagementIssue.id,
    userId: adminUser.id,
    body: `Great progress! For member management, let's make sure we handle the edge case where a user is removed from a team but still has issues assigned. Should we auto-unassign or just show a warning?`,
    parentId: stableId("comment-team-1"),
  },
  {
    id: stableId("comment-team-3"),
    issueId: teamManagementIssue.id,
    userId: sarahChen.id,
    body: `From a product perspective, I'd prefer showing a warning and letting the admin decide. Auto-unassigning could cause confusion.`,
    parentId: stableId("comment-team-2"),
  },

  // Comments on invitation issue
  {
    id: stableId("comment-invite-1"),
    issueId: invitationIssue.id,
    userId: davidKim.id,
    body: `PR is ready for review. The invitation system now supports:

- Email invitations with expiring tokens (7 days)
- Role assignment (admin/member/guest)
- Resend functionality
- Cancellation

@john @admin - would appreciate a review when you have time.`,
    parentId: null,
  },
  {
    id: stableId("comment-invite-2"),
    issueId: invitationIssue.id,
    userId: johnDoe.id,
    body: `Reviewing now. Quick question - how are we handling the case where someone is invited but already has an account? Should we auto-add them to the workspace or still require email confirmation?`,
    parentId: stableId("comment-invite-1"),
  },

  // Comments on slow query issue
  {
    id: stableId("comment-query-1"),
    issueId: slowQueryIssue.id,
    userId: mikeWilson.id,
    body: `Did some profiling and found the bottleneck. The N+1 query problem is happening when loading issue labels. For 1000 issues, we're making 1001 queries!`,
    parentId: null,
  },
  {
    id: stableId("comment-query-2"),
    issueId: slowQueryIssue.id,
    userId: davidKim.id,
    body: `I can take this one. Will refactor to use a single join query with Drizzle's relational queries feature.`,
    parentId: stableId("comment-query-1"),
  },

  // Comments on design dashboard issue
  {
    id: stableId("comment-design-1"),
    issueId: designDashboardIssue.id,
    userId: janeSmith.id,
    body: `Uploaded the first iteration of the dashboard mockups to Figma. Key features:

- Clean, Linear-inspired layout
- Collapsible sidebar
- Quick filters for status/priority
- Keyboard shortcuts overlay

Link: [Figma Dashboard Designs](#)

Let me know your thoughts!`,
    parentId: null,
  },
  {
    id: stableId("comment-design-2"),
    issueId: designDashboardIssue.id,
    userId: sarahChen.id,
    body: `These look amazing! Love the keyboard shortcuts approach. A few suggestions:

1. Can we add a "My Issues" quick filter?
2. The sidebar could show unread notification count
3. Consider adding a command palette (cmd+k)`,
    parentId: stableId("comment-design-1"),
  },
  {
    id: stableId("comment-design-3"),
    issueId: designDashboardIssue.id,
    userId: adminUser.id,
    body: `+1 on the command palette. That's a power user feature that Linear does really well. Great work Jane!`,
    parentId: stableId("comment-design-1"),
  },

  // Comments on durable objects issue
  {
    id: stableId("comment-do-1"),
    issueId: durableObjectsIssue.id,
    userId: mikeWilson.id,
    body: `Setting up the WorkspaceDO class for real-time presence. Each workspace will have its own DO instance that tracks:

- Active users
- Cursor positions (for collaborative editing)
- Live issue updates

Using WebSocket connections for bi-directional communication.`,
    parentId: null,
  },
  {
    id: stableId("comment-do-2"),
    issueId: durableObjectsIssue.id,
    userId: adminUser.id,
    body: `How are we handling reconnection? If a user loses connection briefly, we don't want to spam "user left" notifications.`,
    parentId: stableId("comment-do-1"),
  },
  {
    id: stableId("comment-do-3"),
    issueId: durableObjectsIssue.id,
    userId: mikeWilson.id,
    body: `Good point! I'm implementing a 30-second grace period. If they reconnect within that window, we treat it as continuous presence.`,
    parentId: stableId("comment-do-2"),
  },
];

// Comment reactions
export const commentReactions: SeedCommentReaction[] = [
  { id: stableId("reaction-1"), commentId: comments[0].id, userId: adminUser.id, emoji: "👍" },
  { id: stableId("reaction-2"), commentId: comments[0].id, userId: mikeWilson.id, emoji: "🚀" },
  { id: stableId("reaction-3"), commentId: comments[3].id, userId: johnDoe.id, emoji: "🎉" },
  { id: stableId("reaction-4"), commentId: comments[3].id, userId: adminUser.id, emoji: "👍" },
  { id: stableId("reaction-5"), commentId: comments[10].id, userId: johnDoe.id, emoji: "🔥" },
  { id: stableId("reaction-6"), commentId: comments[10].id, userId: mikeWilson.id, emoji: "💯" },
  { id: stableId("reaction-7"), commentId: comments[10].id, userId: adminUser.id, emoji: "👀" },
  { id: stableId("reaction-8"), commentId: comments[11].id, userId: janeSmith.id, emoji: "❤️" },
  { id: stableId("reaction-9"), commentId: comments[12].id, userId: janeSmith.id, emoji: "🙏" },
  { id: stableId("reaction-10"), commentId: comments[15].id, userId: davidKim.id, emoji: "👍" },
];
