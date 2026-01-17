import { NewProject } from "../../schema/projects";
import { stableId, daysFromNow, daysAgo } from "../utils";
import { primaryWorkspace, acmeWorkspace, startupWorkspace } from "./workspaces";
import { engineeringTeam, designTeam, productTeam, devopsTeam, acmeBackendTeam, startupCoreTeam } from "./teams";
import { adminUser, johnDoe, janeSmith, sarahChen, mikeWilson } from "./users";

export interface SeedProject extends NewProject {
  id: string;
}

export const projects: SeedProject[] = [
  // LinearFlow Demo workspace projects
  {
    id: stableId("project-v1-launch"),
    workspaceId: primaryWorkspace.id,
    teamId: engineeringTeam.id,
    name: "V1 Launch",
    identifier: "V1",
    description: "Initial product launch with core features including authentication, workspaces, and issue tracking",
    color: "#8b5cf6",
    icon: "rocket",
    status: "active",
    leadId: adminUser.id,
    startDate: daysAgo(30),
    targetDate: daysFromNow(60),
    progress: 35,
  },
  {
    id: stableId("project-auth-system"),
    workspaceId: primaryWorkspace.id,
    teamId: engineeringTeam.id,
    name: "Authentication System",
    identifier: "AUTH",
    description: "Complete authentication and authorization system with SSO support",
    color: "#ef4444",
    icon: "shield",
    status: "active",
    leadId: johnDoe.id,
    startDate: daysAgo(14),
    targetDate: daysFromNow(14),
    progress: 65,
  },
  {
    id: stableId("project-design-system"),
    workspaceId: primaryWorkspace.id,
    teamId: designTeam.id,
    name: "Design System",
    identifier: "DS",
    description: "Comprehensive design system with reusable components and design tokens",
    color: "#ec4899",
    icon: "palette",
    status: "active",
    leadId: janeSmith.id,
    startDate: daysAgo(45),
    targetDate: daysFromNow(30),
    progress: 50,
  },
  {
    id: stableId("project-api-v2"),
    workspaceId: primaryWorkspace.id,
    teamId: engineeringTeam.id,
    name: "API v2",
    identifier: "API2",
    description: "Next generation API with GraphQL support and improved performance",
    color: "#10b981",
    icon: "code",
    status: "planned",
    leadId: adminUser.id,
    startDate: daysFromNow(30),
    targetDate: daysFromNow(120),
    progress: 0,
  },
  {
    id: stableId("project-mobile-app"),
    workspaceId: primaryWorkspace.id,
    teamId: engineeringTeam.id,
    name: "Mobile App",
    identifier: "MOB",
    description: "Native mobile application for iOS and Android",
    color: "#3b82f6",
    icon: "smartphone",
    status: "planned",
    leadId: null,
    startDate: daysFromNow(90),
    targetDate: daysFromNow(180),
    progress: 0,
  },
  {
    id: stableId("project-infrastructure"),
    workspaceId: primaryWorkspace.id,
    teamId: devopsTeam.id,
    name: "Infrastructure Modernization",
    identifier: "INFRA",
    description: "Migrate to edge-first infrastructure with Cloudflare Workers",
    color: "#f97316",
    icon: "server",
    status: "active",
    leadId: mikeWilson.id,
    startDate: daysAgo(60),
    targetDate: daysFromNow(14),
    progress: 85,
  },
  {
    id: stableId("project-completed"),
    workspaceId: primaryWorkspace.id,
    teamId: productTeam.id,
    name: "Product Discovery",
    identifier: "PD",
    description: "Initial product discovery and user research phase",
    color: "#6366f1",
    icon: "search",
    status: "completed",
    leadId: sarahChen.id,
    startDate: daysAgo(90),
    targetDate: daysAgo(30),
    completedAt: daysAgo(28),
    progress: 100,
  },

  // Acme workspace projects
  {
    id: stableId("project-acme-platform"),
    workspaceId: acmeWorkspace.id,
    teamId: acmeBackendTeam.id,
    name: "Platform Rewrite",
    identifier: "PLAT",
    description: "Rewrite legacy platform with modern architecture",
    color: "#3b82f6",
    icon: "layers",
    status: "active",
    leadId: johnDoe.id,
    startDate: daysAgo(60),
    targetDate: daysFromNow(90),
    progress: 40,
  },

  // Startup workspace projects
  {
    id: stableId("project-startup-mvp"),
    workspaceId: startupWorkspace.id,
    teamId: startupCoreTeam.id,
    name: "MVP Launch",
    identifier: "MVP",
    description: "Minimum viable product for initial launch",
    color: "#eab308",
    icon: "zap",
    status: "active",
    leadId: sarahChen.id,
    startDate: daysAgo(14),
    targetDate: daysFromNow(45),
    progress: 25,
  },
];

// Commonly referenced projects
export const v1LaunchProject = projects[0];
export const authProject = projects[1];
export const designSystemProject = projects[2];
export const apiV2Project = projects[3];
export const infraProject = projects[5];
export const completedProject = projects[6];
export const acmePlatformProject = projects[7];
export const startupMvpProject = projects[8];
