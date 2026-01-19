import { NewLabel } from "../../schema/labels";
import { stableId } from "../utils";
import { v1LaunchProject, acmePlatformProject, startupMvpProject } from "./projects";

export interface SeedLabel extends NewLabel {
  id: string;
}

export const labels: SeedLabel[] = [
  // LinearFlow Demo project labels - Type labels
  {
    id: stableId("label-bug"),
    projectId: v1LaunchProject.id,
    name: "bug",
    description: "Something isn't working correctly",
    color: "#dc2626",
  },
  {
    id: stableId("label-feature"),
    projectId: v1LaunchProject.id,
    name: "feature",
    description: "New feature or enhancement request",
    color: "#16a34a",
  },
  {
    id: stableId("label-improvement"),
    projectId: v1LaunchProject.id,
    name: "improvement",
    description: "Improvement to existing functionality",
    color: "#0ea5e9",
  },
  {
    id: stableId("label-documentation"),
    projectId: v1LaunchProject.id,
    name: "documentation",
    description: "Documentation updates needed",
    color: "#8b5cf6",
  },

  // Priority labels
  {
    id: stableId("label-urgent"),
    projectId: v1LaunchProject.id,
    name: "urgent",
    description: "Needs immediate attention",
    color: "#ef4444",
  },
  {
    id: stableId("label-p0"),
    projectId: v1LaunchProject.id,
    name: "P0",
    description: "Critical priority - drop everything",
    color: "#b91c1c",
  },
  {
    id: stableId("label-p1"),
    projectId: v1LaunchProject.id,
    name: "P1",
    description: "High priority - address this week",
    color: "#ea580c",
  },
  {
    id: stableId("label-p2"),
    projectId: v1LaunchProject.id,
    name: "P2",
    description: "Medium priority - address this sprint",
    color: "#f59e0b",
  },

  // Status labels
  {
    id: stableId("label-blocked"),
    projectId: v1LaunchProject.id,
    name: "blocked",
    description: "Blocked by external dependency",
    color: "#6b7280",
  },
  {
    id: stableId("label-needs-review"),
    projectId: v1LaunchProject.id,
    name: "needs-review",
    description: "Ready for code review",
    color: "#f97316",
  },
  {
    id: stableId("label-wontfix"),
    projectId: v1LaunchProject.id,
    name: "wontfix",
    description: "This will not be worked on",
    color: "#9ca3af",
  },
  {
    id: stableId("label-duplicate"),
    projectId: v1LaunchProject.id,
    name: "duplicate",
    description: "This issue already exists",
    color: "#d4d4d4",
  },

  // Area labels
  {
    id: stableId("label-frontend"),
    projectId: v1LaunchProject.id,
    name: "frontend",
    description: "Frontend related changes",
    color: "#06b6d4",
  },
  {
    id: stableId("label-backend"),
    projectId: v1LaunchProject.id,
    name: "backend",
    description: "Backend/API related changes",
    color: "#10b981",
  },
  {
    id: stableId("label-database"),
    projectId: v1LaunchProject.id,
    name: "database",
    description: "Database schema or queries",
    color: "#a855f7",
  },
  {
    id: stableId("label-devops"),
    projectId: v1LaunchProject.id,
    name: "devops",
    description: "Infrastructure and deployment",
    color: "#f97316",
  },

  // Special labels
  {
    id: stableId("label-good-first-issue"),
    projectId: v1LaunchProject.id,
    name: "good first issue",
    description: "Good for newcomers",
    color: "#22c55e",
  },
  {
    id: stableId("label-help-wanted"),
    projectId: v1LaunchProject.id,
    name: "help wanted",
    description: "Extra attention is needed",
    color: "#eab308",
  },
  {
    id: stableId("label-security"),
    projectId: v1LaunchProject.id,
    name: "security",
    description: "Security related issue",
    color: "#ef4444",
  },
  {
    id: stableId("label-performance"),
    projectId: v1LaunchProject.id,
    name: "performance",
    description: "Performance optimization needed",
    color: "#3b82f6",
  },

  // Acme project labels
  {
    id: stableId("label-acme-bug"),
    projectId: acmePlatformProject.id,
    name: "bug",
    description: "Bug report",
    color: "#dc2626",
  },
  {
    id: stableId("label-acme-feature"),
    projectId: acmePlatformProject.id,
    name: "feature",
    description: "Feature request",
    color: "#16a34a",
  },
  {
    id: stableId("label-acme-technical-debt"),
    projectId: acmePlatformProject.id,
    name: "technical debt",
    description: "Technical debt to address",
    color: "#f59e0b",
  },

  // Startup project labels
  {
    id: stableId("label-startup-mvp"),
    projectId: startupMvpProject.id,
    name: "MVP",
    description: "Required for MVP launch",
    color: "#ef4444",
  },
  {
    id: stableId("label-startup-nice-to-have"),
    projectId: startupMvpProject.id,
    name: "nice-to-have",
    description: "Nice to have, not critical",
    color: "#94a3b8",
  },
];

// Helper to get labels for a project
export function getLabelsForProject(projectId: string): SeedLabel[] {
  return labels.filter((l) => l.projectId === projectId);
}

// Commonly referenced labels (primary project)
export const bugLabel = labels[0];
export const featureLabel = labels[1];
export const improvementLabel = labels[2];
export const urgentLabel = labels[4];
export const blockedLabel = labels[8];
export const needsReviewLabel = labels[9];
export const frontendLabel = labels[12];
export const backendLabel = labels[13];
export const securityLabel = labels[18];
export const performanceLabel = labels[19];
