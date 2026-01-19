import type { User } from './issues'

// Project status values
export const PROJECT_STATUSES = [
  'planned',
  'active',
  'paused',
  'completed',
  'cancelled',
] as const

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

// Project type for list views (minimal data)
export interface ProjectListItem {
  id: string
  name: string
  identifier: string
  status: ProjectStatus
  progress: number
  targetDate?: string
  workspaceId: string
  lead?: {
    id: string
    name: string
    avatarUrl?: string
  }
}

// Project type for detail views (full data)
export interface Project {
  id: string
  workspaceId: string
  teamId?: string
  name: string
  identifier: string
  description?: string
  color?: string
  icon?: string
  status: ProjectStatus
  progress: number
  startDate?: string
  targetDate?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
  lead?: User
}

// Project with issue counts for dashboard
export interface ProjectWithStats extends Project {
  issueCount?: number
  completedIssueCount?: number
}

// Create project input
export interface CreateProjectInput {
  name: string
  identifier: string
  description?: string
  status?: ProjectStatus
  leadId?: string
  startDate?: string
  targetDate?: string
}

// Update project input
export interface UpdateProjectInput {
  name?: string
  identifier?: string
  description?: string
  status?: ProjectStatus
  leadId?: string | null
  startDate?: string | null
  targetDate?: string | null
  progress?: number
}

// Project filters for list views
export interface ProjectFilters {
  status?: ProjectStatus[]
  leadId?: string
  search?: string
}
