import {
  Circle,
  CircleDot,
  CircleDashed,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Minus,
  type LucideIcon,
} from 'lucide-react'
import type { IssueStatus, IssuePriority } from '@/types/issues'

interface StatusConfig {
  label: string
  icon: LucideIcon
  color: string
  bgColor: string
  textColor: string
}

interface PriorityConfig {
  label: string
  icon: LucideIcon
  color: string
  bgColor: string
  textColor: string
}

export const STATUS_CONFIG: Record<IssueStatus, StatusConfig> = {
  backlog: {
    label: 'Backlog',
    icon: CircleDashed,
    color: 'text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-600 dark:text-slate-400',
  },
  todo: {
    label: 'Todo',
    icon: Circle,
    color: 'text-slate-500',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-700 dark:text-slate-300',
  },
  in_progress: {
    label: 'In Progress',
    icon: CircleDot,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
  },
  in_review: {
    label: 'In Review',
    icon: Clock,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
  },
  done: {
    label: 'Done',
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/30',
    textColor: 'text-red-600 dark:text-red-400',
  },
}

export const PRIORITY_CONFIG: Record<IssuePriority, PriorityConfig> = {
  no_priority: {
    label: 'No Priority',
    icon: Minus,
    color: 'text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-600 dark:text-slate-400',
  },
  low: {
    label: 'Low',
    icon: ArrowDown,
    color: 'text-slate-500',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-700 dark:text-slate-300',
  },
  medium: {
    label: 'Medium',
    icon: ArrowRight,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
  },
  high: {
    label: 'High',
    icon: ArrowUp,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-400',
  },
  urgent: {
    label: 'Urgent',
    icon: AlertTriangle,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
  },
}

// Ordered statuses for board columns
export const STATUS_ORDER: IssueStatus[] = [
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
  'cancelled',
]

// Ordered priorities for filtering/sorting
export const PRIORITY_ORDER: IssuePriority[] = [
  'urgent',
  'high',
  'medium',
  'low',
  'no_priority',
]

// Helper to get status config
export function getStatusConfig(status: IssueStatus): StatusConfig {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.backlog
}

// Helper to get priority config
export function getPriorityConfig(priority: IssuePriority): PriorityConfig {
  return PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.no_priority
}

// Format issue identifier (e.g., "PROJ-123")
export function formatIssueIdentifier(
  workspaceSlug: string,
  issueNumber: number
): string {
  return `${workspaceSlug.toUpperCase()}-${issueNumber}`
}

// Format relative time
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

  return date.toLocaleDateString()
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
