// Issue status values
export const ISSUE_STATUSES = [
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
  'cancelled',
] as const

export type IssueStatus = (typeof ISSUE_STATUSES)[number]

// Issue priority values
export const ISSUE_PRIORITIES = [
  'no_priority',
  'urgent',
  'high',
  'medium',
  'low',
] as const

export type IssuePriority = (typeof ISSUE_PRIORITIES)[number]

// Issue type values
export const ISSUE_TYPES = ['bug', 'feature', 'improvement', 'task'] as const

export type IssueType = (typeof ISSUE_TYPES)[number]

// User type
export interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

// Label type
export interface Label {
  id: string
  name: string
  color: string
}

// Cycle status values
export const CYCLE_STATUSES = ['upcoming', 'active', 'completed'] as const

export type CycleStatus = (typeof CYCLE_STATUSES)[number]

// Cycle type
export interface Cycle {
  id: string
  name: string
  description?: string
  number: number
  projectId: string
  startDate: string
  endDate: string
  status: CycleStatus
  progress: number
  autoArchive: boolean
  createdAt: string
  updatedAt: string
}

// Cycle with computed stats
export interface CycleWithStats extends Cycle {
  totalIssues: number
  completedIssues: number
  inProgressIssues: number
}

// Cycle CRUD DTOs
export interface CreateCycleInput {
  name: string
  description?: string
  startDate: string
  endDate: string
  projectId: string
  autoArchive?: boolean
}

export interface UpdateCycleInput {
  name?: string
  description?: string
  startDate?: string
  endDate?: string
  status?: CycleStatus
  autoArchive?: boolean
}

// Project type
export interface Project {
  id: string
  name: string
  identifier: string
}

// Team type
export interface Team {
  id: string
  name: string
  identifier: string
}

// Workspace type
export interface Workspace {
  id: string
  name: string
  slug: string
  description?: string
  logoUrl?: string
  role?: string
}

// Issue type
export interface Issue {
  id: string
  number: number
  title: string
  description?: string
  status: IssueStatus
  priority: IssuePriority
  type?: IssueType
  assignee?: User
  assigneeId?: string
  reporter?: User
  reporterId: string
  project?: Project
  projectId?: string
  cycle?: Cycle
  cycleId?: string
  labels?: Label[]
  estimate?: number
  dueDate?: string
  startedAt?: string
  completedAt?: string
  cancelledAt?: string
  archivedAt?: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// Comment type
export interface Comment {
  id: string
  body: string
  createdAt: string
  updatedAt?: string
  user: User
  issueId: string
}

// Issue filters for list views
export interface IssueFilters {
  status?: IssueStatus[]
  priority?: IssuePriority[]
  assigneeId?: string | 'unassigned'
  labelIds?: string[]
  projectId?: string
  cycleId?: string
  search?: string
}

// Sort options
export type IssueSortField =
  | 'createdAt'
  | 'updatedAt'
  | 'priority'
  | 'status'
  | 'title'
  | 'number'

export type SortDirection = 'asc' | 'desc'

export interface IssueSort {
  field: IssueSortField
  direction: SortDirection
}

// Create/Update DTOs
export interface CreateIssueInput {
  title: string
  description?: string
  status?: IssueStatus
  priority?: IssuePriority
  type?: IssueType
  assigneeId?: string
  projectId: string
  cycleId?: string
  labelIds?: string[]
  estimate?: number
  dueDate?: string
}

export interface UpdateIssueInput {
  title?: string
  description?: string
  status?: IssueStatus
  priority?: IssuePriority
  type?: IssueType
  assigneeId?: string | null
  projectId?: string | null
  cycleId?: string | null
  labelIds?: string[]
  estimate?: number | null
  dueDate?: string | null
}

// View modes
export type ViewMode = 'table' | 'board'
