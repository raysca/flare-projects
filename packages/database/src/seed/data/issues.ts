import { NewIssue, NewIssueLabel } from "../../schema/issues";
import { stableId, daysFromNow, daysAgo } from "../utils";
import { primaryWorkspace, acmeWorkspace, startupWorkspace } from "./workspaces";
import { engineeringTeam, designTeam, productTeam, devopsTeam, acmeBackendTeam, startupCoreTeam } from "./teams";
import { v1LaunchProject, authProject, designSystemProject, infraProject, acmePlatformProject, startupMvpProject } from "./projects";
import { engSprint2, engSprint3, dsnIteration2, opsInfra2, acmeQ1, startupWeek1 } from "./cycles";
import { adminUser, johnDoe, janeSmith, mikeWilson, sarahChen, davidKim } from "./users";
import {
  bugLabel, featureLabel, improvementLabel, urgentLabel, blockedLabel,
  needsReviewLabel, frontendLabel, backendLabel, securityLabel, performanceLabel
} from "./labels";

export interface SeedIssue extends NewIssue {
  id: string;
}

export interface SeedIssueLabel extends NewIssueLabel {
  id: string;
}

let issueNumber = 0;
function nextIssueNumber(): number {
  return ++issueNumber;
}

export const issues: SeedIssue[] = [
  // Engineering team issues - Auth related
  {
    id: stableId("issue-auth-login"),
    workspaceId: primaryWorkspace.id,
    teamId: engineeringTeam.id,
    number: nextIssueNumber(),
    title: "Implement email/password authentication",
    description: `## Description
Implement a complete authentication system using email and password.

## Requirements
- Email validation and verification flow
- Secure password hashing with bcrypt
- Session management using KV store
- Rate limiting for login attempts

## Technical Notes
- Use Hono middleware for auth
- JWT tokens stored in httpOnly cookies
- Implement refresh token rotation`,
    status: "done",
    priority: "high",
    type: "feature",
    assigneeId: johnDoe.id,
    reporterId: adminUser.id,
    projectId: authProject.id,
    cycleId: engSprint2.id,
    estimate: 8,
    startedAt: daysAgo(10),
    completedAt: daysAgo(3),
    sortOrder: 0,
  },
  {
    id: stableId("issue-auth-logout"),
    workspaceId: primaryWorkspace.id,
    teamId: engineeringTeam.id,
    number: nextIssueNumber(),
    title: "Add logout functionality and session invalidation",
    description: `Implement proper logout that invalidates the session in KV and clears cookies.`,
    status: "done",
    priority: "medium",
    type: "feature",
    assigneeId: johnDoe.id,
    reporterId: adminUser.id,
    projectId: authProject.id,
    cycleId: engSprint2.id,
    estimate: 2,
    startedAt: daysAgo(5),
    completedAt: daysAgo(4),
    sortOrder: 1,
  },
  {
    id: stableId("issue-auth-redirect-bug"),
    workspaceId: primaryWorkspace.id,
    teamId: engineeringTeam.id,
    number: nextIssueNumber(),
    title: "Fix infinite redirect loop after login",
    description: `## Bug Report
Users are experiencing an infinite redirect after successful login.

## Steps to Reproduce
1. Go to login page
2. Enter valid credentials
3. Click login
4. Page redirects infinitely

## Expected Behavior
User should be redirected to dashboard after login.

## Environment
- Browser: Chrome 120
- OS: macOS Sonoma`,
    status: "in_progress",
    priority: "urgent",
    type: "bug",
    assigneeId: adminUser.id,
    reporterId: johnDoe.id,
    projectId: authProject.id,
    cycleId: engSprint2.id,
    estimate: 3,
    startedAt: daysAgo(1),
    sortOrder: 2,
  },
  {
    id: stableId("issue-auth-password-reset"),
    workspaceId: primaryWorkspace.id,
    teamId: engineeringTeam.id,
    number: nextIssueNumber(),
    title: "Implement password reset flow",
    description: `Allow users to reset their password via email verification.

- Send reset link via email
- Token expires after 1 hour
- Rate limit reset requests`,
    status: "todo",
    priority: "high",
    type: "feature",
    assigneeId: johnDoe.id,
    reporterId: sarahChen.id,
    projectId: authProject.id,
    cycleId: engSprint3.id,
    estimate: 5,
    sortOrder: 3,
  },
  {
    id: stableId("issue-auth-2fa"),
    workspaceId: primaryWorkspace.id,
    teamId: engineeringTeam.id,
    number: nextIssueNumber(),
    title: "Add two-factor authentication support",
    description: `Implement TOTP-based 2FA for enhanced account security.`,
    status: "backlog",
    priority: "medium",
    type: "feature",
    assigneeId: null,
    reporterId: adminUser.id,
    projectId: authProject.id,
    cycleId: null,
    estimate: 8,
    sortOrder: 4,
  },

  // Engineering team issues - Core features
  {
    id: stableId("issue-workspace-crud"),
    workspaceId: primaryWorkspace.id,
    teamId: engineeringTeam.id,
    number: nextIssueNumber(),
    title: "Implement workspace CRUD operations",
    description: `Create, read, update, and delete workspaces with proper authorization.`,
    status: "done",
    priority: "high",
    type: "feature",
    assigneeId: adminUser.id,
    reporterId: sarahChen.id,
    projectId: v1LaunchProject.id,
    cycleId: engSprint2.id,
    estimate: 5,
    completedAt: daysAgo(7),
    sortOrder: 5,
  },
  {
    id: stableId("issue-team-management"),
    workspaceId: primaryWorkspace.id,
    teamId: engineeringTeam.id,
    number: nextIssueNumber(),
    title: "Team creation and member management",
    description: `Allow workspace admins to create teams and manage team membership.`,
    status: "in_progress",
    priority: "high",
    type: "feature",
    assigneeId: mikeWilson.id,
    reporterId: adminUser.id,
    projectId: v1LaunchProject.id,
    cycleId: engSprint2.id,
    estimate: 5,
    startedAt: daysAgo(2),
    sortOrder: 6,
  },
  {
    id: stableId("issue-invitation-system"),
    workspaceId: primaryWorkspace.id,
    teamId: engineeringTeam.id,
    number: nextIssueNumber(),
    title: "Workspace invitation system",
    description: `Implement email invitations for workspace members with role assignment.`,
    status: "in_review",
    priority: "medium",
    type: "feature",
    assigneeId: davidKim.id,
    reporterId: sarahChen.id,
    projectId: v1LaunchProject.id,
    cycleId: engSprint2.id,
    estimate: 4,
    startedAt: daysAgo(4),
    sortOrder: 7,
  },
  {
    id: stableId("issue-issue-crud"),
    workspaceId: primaryWorkspace.id,
    teamId: engineeringTeam.id,
    number: nextIssueNumber(),
    title: "Issue CRUD with status workflow",
    description: `Complete issue management with status transitions and validation.`,
    status: "done",
    priority: "high",
    type: "feature",
    assigneeId: johnDoe.id,
    reporterId: adminUser.id,
    projectId: v1LaunchProject.id,
    cycleId: engSprint2.id,
    estimate: 8,
    completedAt: daysAgo(5),
    sortOrder: 8,
  },
  {
    id: stableId("issue-slow-query"),
    workspaceId: primaryWorkspace.id,
    teamId: engineeringTeam.id,
    number: nextIssueNumber(),
    title: "Optimize slow issue list query",
    description: `The issue list query is taking too long when there are many issues.

Current query time: ~2s for 1000 issues
Target: <200ms

Need to add proper indexes and optimize joins.`,
    status: "todo",
    priority: "high",
    type: "bug",
    assigneeId: davidKim.id,
    reporterId: mikeWilson.id,
    projectId: v1LaunchProject.id,
    cycleId: engSprint3.id,
    estimate: 3,
    sortOrder: 9,
  },

  // Design team issues
  {
    id: stableId("issue-design-dashboard"),
    workspaceId: primaryWorkspace.id,
    teamId: designTeam.id,
    number: nextIssueNumber(),
    title: "Design main dashboard layout",
    description: `Create mockups for the main dashboard including:
- Issue list with filters
- Sidebar navigation
- Quick actions
- Statistics overview`,
    status: "done",
    priority: "high",
    type: "task",
    assigneeId: janeSmith.id,
    reporterId: sarahChen.id,
    projectId: designSystemProject.id,
    cycleId: dsnIteration2.id,
    estimate: 5,
    completedAt: daysAgo(10),
    sortOrder: 10,
  },
  {
    id: stableId("issue-design-issue-detail"),
    workspaceId: primaryWorkspace.id,
    teamId: designTeam.id,
    number: nextIssueNumber(),
    title: "Design issue detail view",
    description: `Design the issue detail page with all fields, comments, and activity.`,
    status: "in_progress",
    priority: "high",
    type: "task",
    assigneeId: janeSmith.id,
    reporterId: sarahChen.id,
    projectId: designSystemProject.id,
    cycleId: dsnIteration2.id,
    estimate: 4,
    startedAt: daysAgo(3),
    sortOrder: 11,
  },
  {
    id: stableId("issue-design-components"),
    workspaceId: primaryWorkspace.id,
    teamId: designTeam.id,
    number: nextIssueNumber(),
    title: "Create reusable component library",
    description: `Build Shadcn-based component library with proper theming.`,
    status: "in_progress",
    priority: "medium",
    type: "feature",
    assigneeId: sarahChen.id,
    reporterId: janeSmith.id,
    projectId: designSystemProject.id,
    cycleId: dsnIteration2.id,
    estimate: 8,
    startedAt: daysAgo(7),
    sortOrder: 12,
  },
  {
    id: stableId("issue-design-dark-mode"),
    workspaceId: primaryWorkspace.id,
    teamId: designTeam.id,
    number: nextIssueNumber(),
    title: "Implement dark mode support",
    description: `Add dark mode with proper color tokens and system preference detection.`,
    status: "backlog",
    priority: "low",
    type: "feature",
    assigneeId: null,
    reporterId: janeSmith.id,
    projectId: designSystemProject.id,
    cycleId: null,
    estimate: 5,
    sortOrder: 13,
  },

  // DevOps team issues
  {
    id: stableId("issue-ops-d1-setup"),
    workspaceId: primaryWorkspace.id,
    teamId: devopsTeam.id,
    number: nextIssueNumber(),
    title: "Set up D1 database with migrations",
    description: `Configure D1 database and set up Drizzle ORM migrations.`,
    status: "done",
    priority: "high",
    type: "task",
    assigneeId: mikeWilson.id,
    reporterId: adminUser.id,
    projectId: infraProject.id,
    cycleId: opsInfra2.id,
    estimate: 3,
    completedAt: daysAgo(14),
    sortOrder: 14,
  },
  {
    id: stableId("issue-ops-durable-objects"),
    workspaceId: primaryWorkspace.id,
    teamId: devopsTeam.id,
    number: nextIssueNumber(),
    title: "Implement Durable Objects for real-time",
    description: `Set up Durable Objects for real-time collaboration features.`,
    status: "in_progress",
    priority: "high",
    type: "feature",
    assigneeId: mikeWilson.id,
    reporterId: adminUser.id,
    projectId: infraProject.id,
    cycleId: opsInfra2.id,
    estimate: 8,
    startedAt: daysAgo(5),
    sortOrder: 15,
  },
  {
    id: stableId("issue-ops-monitoring"),
    workspaceId: primaryWorkspace.id,
    teamId: devopsTeam.id,
    number: nextIssueNumber(),
    title: "Set up monitoring and alerting",
    description: `Configure Analytics Engine and set up alerts for errors and performance.`,
    status: "todo",
    priority: "medium",
    type: "task",
    assigneeId: davidKim.id,
    reporterId: mikeWilson.id,
    projectId: infraProject.id,
    cycleId: opsInfra2.id,
    estimate: 4,
    sortOrder: 16,
  },
  {
    id: stableId("issue-ops-rate-limiting"),
    workspaceId: primaryWorkspace.id,
    teamId: devopsTeam.id,
    number: nextIssueNumber(),
    title: "Implement API rate limiting",
    description: `Add rate limiting to protect API endpoints from abuse.`,
    status: "backlog",
    priority: "medium",
    type: "feature",
    assigneeId: null,
    reporterId: adminUser.id,
    projectId: infraProject.id,
    cycleId: null,
    estimate: 3,
    sortOrder: 17,
  },

  // Product team issues
  {
    id: stableId("issue-prd-roadmap"),
    workspaceId: primaryWorkspace.id,
    teamId: productTeam.id,
    number: nextIssueNumber(),
    title: "Create Q1 product roadmap",
    description: `Define features and milestones for Q1 2024.`,
    status: "done",
    priority: "high",
    type: "task",
    assigneeId: sarahChen.id,
    reporterId: adminUser.id,
    projectId: null,
    cycleId: null,
    estimate: 5,
    completedAt: daysAgo(20),
    sortOrder: 18,
  },
  {
    id: stableId("issue-prd-user-research"),
    workspaceId: primaryWorkspace.id,
    teamId: productTeam.id,
    number: nextIssueNumber(),
    title: "Conduct user interviews for v2 features",
    description: `Interview 10 users to gather feedback on planned v2 features.`,
    status: "in_progress",
    priority: "medium",
    type: "task",
    assigneeId: sarahChen.id,
    reporterId: adminUser.id,
    projectId: null,
    cycleId: null,
    estimate: 8,
    startedAt: daysAgo(7),
    sortOrder: 19,
  },

  // Acme workspace issues
  {
    id: stableId("issue-acme-api-migration"),
    workspaceId: acmeWorkspace.id,
    teamId: acmeBackendTeam.id,
    number: 1,
    title: "Migrate legacy REST API endpoints",
    description: `Migrate all v1 REST endpoints to the new architecture.`,
    status: "in_progress",
    priority: "high",
    type: "task",
    assigneeId: johnDoe.id,
    reporterId: johnDoe.id,
    projectId: acmePlatformProject.id,
    cycleId: acmeQ1.id,
    estimate: 13,
    startedAt: daysAgo(14),
    sortOrder: 0,
  },
  {
    id: stableId("issue-acme-database-schema"),
    workspaceId: acmeWorkspace.id,
    teamId: acmeBackendTeam.id,
    number: 2,
    title: "Design new database schema",
    description: `Create normalized schema for the new platform.`,
    status: "done",
    priority: "high",
    type: "task",
    assigneeId: davidKim.id,
    reporterId: johnDoe.id,
    projectId: acmePlatformProject.id,
    cycleId: acmeQ1.id,
    estimate: 5,
    completedAt: daysAgo(7),
    sortOrder: 1,
  },

  // Startup workspace issues
  {
    id: stableId("issue-startup-landing"),
    workspaceId: startupWorkspace.id,
    teamId: startupCoreTeam.id,
    number: 1,
    title: "Build landing page",
    description: `Create a compelling landing page with waitlist signup.`,
    status: "done",
    priority: "urgent",
    type: "feature",
    assigneeId: janeSmith.id,
    reporterId: sarahChen.id,
    projectId: startupMvpProject.id,
    cycleId: startupWeek1.id,
    estimate: 3,
    completedAt: daysAgo(2),
    sortOrder: 0,
  },
  {
    id: stableId("issue-startup-core-feature"),
    workspaceId: startupWorkspace.id,
    teamId: startupCoreTeam.id,
    number: 2,
    title: "Implement core product feature",
    description: `Build the main value proposition feature for launch.`,
    status: "in_progress",
    priority: "urgent",
    type: "feature",
    assigneeId: sarahChen.id,
    reporterId: sarahChen.id,
    projectId: startupMvpProject.id,
    cycleId: startupWeek1.id,
    estimate: 8,
    startedAt: daysAgo(3),
    sortOrder: 1,
  },
  {
    id: stableId("issue-startup-analytics"),
    workspaceId: startupWorkspace.id,
    teamId: startupCoreTeam.id,
    number: 3,
    title: "Set up product analytics",
    description: `Integrate analytics to track user behavior.`,
    status: "todo",
    priority: "high",
    type: "task",
    assigneeId: janeSmith.id,
    reporterId: sarahChen.id,
    projectId: startupMvpProject.id,
    cycleId: startupWeek1.id,
    estimate: 2,
    sortOrder: 2,
  },
];

// Issue labels mapping
export const issueLabels: SeedIssueLabel[] = [
  // Auth issues
  { id: stableId("il-auth-login-feature"), issueId: issues[0].id, labelId: featureLabel.id },
  { id: stableId("il-auth-login-backend"), issueId: issues[0].id, labelId: backendLabel.id },
  { id: stableId("il-auth-redirect-bug"), issueId: issues[2].id, labelId: bugLabel.id },
  { id: stableId("il-auth-redirect-urgent"), issueId: issues[2].id, labelId: urgentLabel.id },
  { id: stableId("il-auth-2fa-security"), issueId: issues[4].id, labelId: securityLabel.id },

  // Core feature issues
  { id: stableId("il-invitation-review"), issueId: issues[7].id, labelId: needsReviewLabel.id },
  { id: stableId("il-slow-query-perf"), issueId: issues[9].id, labelId: performanceLabel.id },
  { id: stableId("il-slow-query-backend"), issueId: issues[9].id, labelId: backendLabel.id },

  // Design issues
  { id: stableId("il-design-components-frontend"), issueId: issues[12].id, labelId: frontendLabel.id },
  { id: stableId("il-design-dark-improvement"), issueId: issues[13].id, labelId: improvementLabel.id },

  // DevOps issues
  { id: stableId("il-ops-do-feature"), issueId: issues[15].id, labelId: featureLabel.id },
  { id: stableId("il-ops-ratelimit-security"), issueId: issues[17].id, labelId: securityLabel.id },
];

// Helper to get issues for a workspace/team
export function getIssuesForWorkspace(workspaceId: string): SeedIssue[] {
  return issues.filter((i) => i.workspaceId === workspaceId);
}

export function getIssuesForTeam(teamId: string): SeedIssue[] {
  return issues.filter((i) => i.teamId === teamId);
}
