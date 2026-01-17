import { NewTeam, NewTeamMember } from "../../schema/teams";
import { stableId } from "../utils";
import { primaryWorkspace, acmeWorkspace, startupWorkspace } from "./workspaces";
import { adminUser, johnDoe, janeSmith, mikeWilson, sarahChen, davidKim } from "./users";

export interface SeedTeam extends NewTeam {
  id: string;
}

export interface SeedTeamMember extends NewTeamMember {
  id: string;
}

export const teams: SeedTeam[] = [
  // LinearFlow Demo workspace teams
  {
    id: stableId("team-engineering"),
    workspaceId: primaryWorkspace.id,
    name: "Engineering",
    identifier: "ENG",
    description: "Core engineering team building the platform",
    color: "#3b82f6",
    icon: "code",
    isActive: true,
  },
  {
    id: stableId("team-design"),
    workspaceId: primaryWorkspace.id,
    name: "Design",
    identifier: "DSN",
    description: "Product design and UX team",
    color: "#ec4899",
    icon: "palette",
    isActive: true,
  },
  {
    id: stableId("team-product"),
    workspaceId: primaryWorkspace.id,
    name: "Product",
    identifier: "PRD",
    description: "Product management team",
    color: "#8b5cf6",
    icon: "lightbulb",
    isActive: true,
  },
  {
    id: stableId("team-devops"),
    workspaceId: primaryWorkspace.id,
    name: "DevOps",
    identifier: "OPS",
    description: "Infrastructure and operations",
    color: "#f97316",
    icon: "server",
    isActive: true,
  },

  // Acme workspace teams
  {
    id: stableId("team-acme-backend"),
    workspaceId: acmeWorkspace.id,
    name: "Backend",
    identifier: "BE",
    description: "Backend services team",
    color: "#10b981",
    icon: "database",
    isActive: true,
  },
  {
    id: stableId("team-acme-frontend"),
    workspaceId: acmeWorkspace.id,
    name: "Frontend",
    identifier: "FE",
    description: "Frontend development team",
    color: "#06b6d4",
    icon: "layout",
    isActive: true,
  },

  // Startup workspace teams
  {
    id: stableId("team-startup-core"),
    workspaceId: startupWorkspace.id,
    name: "Core Team",
    identifier: "CORE",
    description: "Small but mighty core team",
    color: "#eab308",
    icon: "rocket",
    isActive: true,
  },
];

// Commonly referenced teams
export const engineeringTeam = teams[0];
export const designTeam = teams[1];
export const productTeam = teams[2];
export const devopsTeam = teams[3];
export const acmeBackendTeam = teams[4];
export const acmeFrontendTeam = teams[5];
export const startupCoreTeam = teams[6];

export const teamMembers: SeedTeamMember[] = [
  // Engineering team
  {
    id: stableId("tm-eng-admin"),
    teamId: engineeringTeam.id,
    userId: adminUser.id,
    isLead: true,
  },
  {
    id: stableId("tm-eng-john"),
    teamId: engineeringTeam.id,
    userId: johnDoe.id,
    isLead: false,
  },
  {
    id: stableId("tm-eng-mike"),
    teamId: engineeringTeam.id,
    userId: mikeWilson.id,
    isLead: false,
  },
  {
    id: stableId("tm-eng-david"),
    teamId: engineeringTeam.id,
    userId: davidKim.id,
    isLead: false,
  },

  // Design team
  {
    id: stableId("tm-dsn-jane"),
    teamId: designTeam.id,
    userId: janeSmith.id,
    isLead: true,
  },
  {
    id: stableId("tm-dsn-sarah"),
    teamId: designTeam.id,
    userId: sarahChen.id,
    isLead: false,
  },

  // Product team
  {
    id: stableId("tm-prd-sarah"),
    teamId: productTeam.id,
    userId: sarahChen.id,
    isLead: true,
  },
  {
    id: stableId("tm-prd-admin"),
    teamId: productTeam.id,
    userId: adminUser.id,
    isLead: false,
  },

  // DevOps team
  {
    id: stableId("tm-ops-mike"),
    teamId: devopsTeam.id,
    userId: mikeWilson.id,
    isLead: true,
  },
  {
    id: stableId("tm-ops-david"),
    teamId: devopsTeam.id,
    userId: davidKim.id,
    isLead: false,
  },

  // Acme teams
  {
    id: stableId("tm-acme-be-john"),
    teamId: acmeBackendTeam.id,
    userId: johnDoe.id,
    isLead: true,
  },
  {
    id: stableId("tm-acme-be-david"),
    teamId: acmeBackendTeam.id,
    userId: davidKim.id,
    isLead: false,
  },
  {
    id: stableId("tm-acme-fe-mike"),
    teamId: acmeFrontendTeam.id,
    userId: mikeWilson.id,
    isLead: true,
  },

  // Startup team
  {
    id: stableId("tm-startup-sarah"),
    teamId: startupCoreTeam.id,
    userId: sarahChen.id,
    isLead: true,
  },
  {
    id: stableId("tm-startup-jane"),
    teamId: startupCoreTeam.id,
    userId: janeSmith.id,
    isLead: false,
  },
];
