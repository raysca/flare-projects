import { NewCycle } from "../../schema/cycles";
import { stableId, daysFromNow, daysAgo } from "../utils";
import { v1LaunchProject, authProject, designSystemProject, infraProject, acmePlatformProject, startupMvpProject } from "./projects";

export interface SeedCycle extends NewCycle {
  id: string;
}

export const cycles: SeedCycle[] = [
  // LinearFlow Demo cycles - Engineering
  {
    id: stableId("cycle-eng-sprint-1"),
    projectId: v1LaunchProject.id,
    name: "Sprint 1",
    description: "Foundation sprint - auth, setup, basic issue CRUD",
    number: 1,
    status: "completed",
    startDate: daysAgo(28),
    endDate: daysAgo(14),
    autoArchive: true,
    progress: 100,
  },
  {
    id: stableId("cycle-eng-sprint-2"),
    projectId: v1LaunchProject.id,
    name: "Sprint 2",
    description: "Current sprint - projects, improved issue management",
    number: 2,
    status: "active",
    startDate: daysAgo(14),
    endDate: daysFromNow(0),
    autoArchive: true,
    progress: 75,
  },
  {
    id: stableId("cycle-eng-sprint-3"),
    projectId: v1LaunchProject.id,
    name: "Sprint 3",
    description: "Upcoming sprint - real-time collaboration, notifications",
    number: 3,
    status: "upcoming",
    startDate: daysFromNow(1),
    endDate: daysFromNow(15),
    autoArchive: true,
    progress: 0,
  },
  {
    id: stableId("cycle-eng-sprint-4"),
    projectId: v1LaunchProject.id,
    name: "Sprint 4",
    description: "Future sprint - integrations, API improvements",
    number: 4,
    status: "upcoming",
    startDate: daysFromNow(16),
    endDate: daysFromNow(30),
    autoArchive: true,
    progress: 0,
  },

  // Design team cycles
  {
    id: stableId("cycle-dsn-iteration-1"),
    projectId: designSystemProject.id,
    name: "Design Iteration 1",
    description: "Core component library and style guide",
    number: 1,
    status: "completed",
    startDate: daysAgo(42),
    endDate: daysAgo(21),
    autoArchive: true,
    progress: 100,
  },
  {
    id: stableId("cycle-dsn-iteration-2"),
    projectId: designSystemProject.id,
    name: "Design Iteration 2",
    description: "Dashboard and issue views design",
    number: 2,
    status: "active",
    startDate: daysAgo(21),
    endDate: daysFromNow(7),
    autoArchive: true,
    progress: 60,
  },

  // DevOps cycles
  {
    id: stableId("cycle-ops-infra-1"),
    projectId: infraProject.id,
    name: "Infrastructure Phase 1",
    description: "Set up D1, KV, R2, and Workers",
    number: 1,
    status: "completed",
    startDate: daysAgo(45),
    endDate: daysAgo(30),
    autoArchive: true,
    progress: 100,
  },
  {
    id: stableId("cycle-ops-infra-2"),
    projectId: infraProject.id,
    name: "Infrastructure Phase 2",
    description: "Durable Objects, Queues, and monitoring",
    number: 2,
    status: "active",
    startDate: daysAgo(14),
    endDate: daysFromNow(7),
    autoArchive: true,
    progress: 80,
  },

  // Acme cycles
  {
    id: stableId("cycle-acme-q1"),
    projectId: acmePlatformProject.id,
    name: "Q1 2024",
    description: "Backend services migration",
    number: 1,
    status: "active",
    startDate: daysAgo(30),
    endDate: daysFromNow(60),
    autoArchive: false,
    progress: 35,
  },

  // Startup cycles
  {
    id: stableId("cycle-startup-week-1"),
    projectId: startupMvpProject.id,
    name: "Week 1",
    description: "Initial MVP development",
    number: 1,
    status: "active",
    startDate: daysAgo(7),
    endDate: daysFromNow(0),
    autoArchive: true,
    progress: 90,
  },
  {
    id: stableId("cycle-startup-week-2"),
    projectId: startupMvpProject.id,
    name: "Week 2",
    description: "MVP refinement and testing",
    number: 2,
    status: "upcoming",
    startDate: daysFromNow(1),
    endDate: daysFromNow(8),
    autoArchive: true,
    progress: 0,
  },
];

// Commonly referenced cycles
export const engSprint1 = cycles[0];
export const engSprint2 = cycles[1];
export const engSprint3 = cycles[2];
export const dsnIteration2 = cycles[5];
export const opsInfra2 = cycles[7];
export const acmeQ1 = cycles[8];
export const startupWeek1 = cycles[9];
