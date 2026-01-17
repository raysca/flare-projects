import { NewWorkspace, NewWorkspaceMember } from "../../schema/workspaces";
import { stableId } from "../utils";
import { adminUser, johnDoe, janeSmith, mikeWilson, sarahChen, davidKim, emilyBrown } from "./users";

export interface SeedWorkspace extends NewWorkspace {
  id: string;
}

export interface SeedWorkspaceMember extends NewWorkspaceMember {
  id: string;
}

export const workspaces: SeedWorkspace[] = [
  {
    id: stableId("linearflow-demo"),
    name: "LinearFlow Demo",
    slug: "linearflow-demo",
    description: "Demo workspace showcasing LinearFlow features",
    createdBy: adminUser.id,
    isActive: true,
  },
  {
    id: stableId("acme-corp"),
    name: "Acme Corporation",
    slug: "acme-corp",
    description: "Acme Corp engineering workspace",
    createdBy: johnDoe.id,
    isActive: true,
  },
  {
    id: stableId("startup-xyz"),
    name: "Startup XYZ",
    slug: "startup-xyz",
    description: "Fast-moving startup workspace",
    createdBy: sarahChen.id,
    isActive: true,
  },
];

// Primary workspace for most seed data
export const primaryWorkspace = workspaces[0];
export const acmeWorkspace = workspaces[1];
export const startupWorkspace = workspaces[2];

// Workspace members
export const workspaceMembers: SeedWorkspaceMember[] = [
  // LinearFlow Demo workspace - all users
  {
    id: stableId("member-demo-admin"),
    workspaceId: primaryWorkspace.id,
    userId: adminUser.id,
    role: "admin",
  },
  {
    id: stableId("member-demo-john"),
    workspaceId: primaryWorkspace.id,
    userId: johnDoe.id,
    role: "member",
  },
  {
    id: stableId("member-demo-jane"),
    workspaceId: primaryWorkspace.id,
    userId: janeSmith.id,
    role: "member",
  },
  {
    id: stableId("member-demo-mike"),
    workspaceId: primaryWorkspace.id,
    userId: mikeWilson.id,
    role: "member",
  },
  {
    id: stableId("member-demo-sarah"),
    workspaceId: primaryWorkspace.id,
    userId: sarahChen.id,
    role: "admin",
  },
  {
    id: stableId("member-demo-david"),
    workspaceId: primaryWorkspace.id,
    userId: davidKim.id,
    role: "member",
  },
  {
    id: stableId("member-demo-emily"),
    workspaceId: primaryWorkspace.id,
    userId: emilyBrown.id,
    role: "guest",
  },

  // Acme workspace - subset of users
  {
    id: stableId("member-acme-john"),
    workspaceId: acmeWorkspace.id,
    userId: johnDoe.id,
    role: "admin",
  },
  {
    id: stableId("member-acme-mike"),
    workspaceId: acmeWorkspace.id,
    userId: mikeWilson.id,
    role: "member",
  },
  {
    id: stableId("member-acme-david"),
    workspaceId: acmeWorkspace.id,
    userId: davidKim.id,
    role: "member",
  },

  // Startup workspace
  {
    id: stableId("member-startup-sarah"),
    workspaceId: startupWorkspace.id,
    userId: sarahChen.id,
    role: "admin",
  },
  {
    id: stableId("member-startup-jane"),
    workspaceId: startupWorkspace.id,
    userId: janeSmith.id,
    role: "member",
  },
];
