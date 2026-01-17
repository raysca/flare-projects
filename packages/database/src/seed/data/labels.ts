import { NewLabel } from "../../schema/labels";
import { stableId } from "../utils";
import { primaryWorkspace, acmeWorkspace, startupWorkspace } from "./workspaces";

export interface SeedLabel extends NewLabel {
  id: string;
}

export const labels: SeedLabel[] = [
  // LinearFlow Demo workspace labels - Type labels
  {
    id: stableId("label-bug"),
    workspaceId: primaryWorkspace.id,
    name: "bug",
    description: "Something isn't working correctly",
    color: "#dc2626",
  },
  {
    id: stableId("label-feature"),
    workspaceId: primaryWorkspace.id,
    name: "feature",
    description: "New feature or enhancement request",
    color: "#16a34a",
  },
  {
    id: stableId("label-improvement"),
    workspaceId: primaryWorkspace.id,
    name: "improvement",
    description: "Improvement to existing functionality",
    color: "#0ea5e9",
  },
  {
    id: stableId("label-documentation"),
    workspaceId: primaryWorkspace.id,
    name: "documentation",
    description: "Documentation updates needed",
    color: "#8b5cf6",
  },

  // Priority labels
  {
    id: stableId("label-urgent"),
    workspaceId: primaryWorkspace.id,
    name: "urgent",
    description: "Needs immediate attention",
    color: "#ef4444",
  },
  {
    id: stableId("label-p0"),
    workspaceId: primaryWorkspace.id,
    name: "P0",
    description: "Critical priority - drop everything",
    color: "#b91c1c",
  },
  {
    id: stableId("label-p1"),
    workspaceId: primaryWorkspace.id,
    name: "P1",
    description: "High priority - address this week",
    color: "#ea580c",
  },
  {
    id: stableId("label-p2"),
    workspaceId: primaryWorkspace.id,
    name: "P2",
    description: "Medium priority - address this sprint",
    color: "#f59e0b",
  },

  // Status labels
  {
    id: stableId("label-blocked"),
    workspaceId: primaryWorkspace.id,
    name: "blocked",
    description: "Blocked by external dependency",
    color: "#6b7280",
  },
  {
    id: stableId("label-needs-review"),
    workspaceId: primaryWorkspace.id,
    name: "needs-review",
    description: "Ready for code review",
    color: "#f97316",
  },
  {
    id: stableId("label-wontfix"),
    workspaceId: primaryWorkspace.id,
    name: "wontfix",
    description: "This will not be worked on",
    color: "#9ca3af",
  },
  {
    id: stableId("label-duplicate"),
    workspaceId: primaryWorkspace.id,
    name: "duplicate",
    description: "This issue already exists",
    color: "#d4d4d4",
  },

  // Area labels
  {
    id: stableId("label-frontend"),
    workspaceId: primaryWorkspace.id,
    name: "frontend",
    description: "Frontend related changes",
    color: "#06b6d4",
  },
  {
    id: stableId("label-backend"),
    workspaceId: primaryWorkspace.id,
    name: "backend",
    description: "Backend/API related changes",
    color: "#10b981",
  },
  {
    id: stableId("label-database"),
    workspaceId: primaryWorkspace.id,
    name: "database",
    description: "Database schema or queries",
    color: "#a855f7",
  },
  {
    id: stableId("label-devops"),
    workspaceId: primaryWorkspace.id,
    name: "devops",
    description: "Infrastructure and deployment",
    color: "#f97316",
  },

  // Special labels
  {
    id: stableId("label-good-first-issue"),
    workspaceId: primaryWorkspace.id,
    name: "good first issue",
    description: "Good for newcomers",
    color: "#22c55e",
  },
  {
    id: stableId("label-help-wanted"),
    workspaceId: primaryWorkspace.id,
    name: "help wanted",
    description: "Extra attention is needed",
    color: "#eab308",
  },
  {
    id: stableId("label-security"),
    workspaceId: primaryWorkspace.id,
    name: "security",
    description: "Security related issue",
    color: "#ef4444",
  },
  {
    id: stableId("label-performance"),
    workspaceId: primaryWorkspace.id,
    name: "performance",
    description: "Performance optimization needed",
    color: "#3b82f6",
  },

  // Acme workspace labels
  {
    id: stableId("label-acme-bug"),
    workspaceId: acmeWorkspace.id,
    name: "bug",
    description: "Bug report",
    color: "#dc2626",
  },
  {
    id: stableId("label-acme-feature"),
    workspaceId: acmeWorkspace.id,
    name: "feature",
    description: "Feature request",
    color: "#16a34a",
  },
  {
    id: stableId("label-acme-technical-debt"),
    workspaceId: acmeWorkspace.id,
    name: "technical debt",
    description: "Technical debt to address",
    color: "#f59e0b",
  },

  // Startup workspace labels
  {
    id: stableId("label-startup-mvp"),
    workspaceId: startupWorkspace.id,
    name: "MVP",
    description: "Required for MVP launch",
    color: "#ef4444",
  },
  {
    id: stableId("label-startup-nice-to-have"),
    workspaceId: startupWorkspace.id,
    name: "nice-to-have",
    description: "Nice to have, not critical",
    color: "#94a3b8",
  },
];

// Helper to get labels for a workspace
export function getLabelsForWorkspace(workspaceId: string): SeedLabel[] {
  return labels.filter((l) => l.workspaceId === workspaceId);
}

// Commonly referenced labels (primary workspace)
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
