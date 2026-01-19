import {
  FileText,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { ProjectStatus } from '@/types/projects'

interface ProjectStatusConfig {
  label: string
  icon: LucideIcon
  color: string
  bgColor: string
  textColor: string
}

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, ProjectStatusConfig> = {
  planned: {
    label: 'Planned',
    icon: FileText,
    color: 'text-slate-500',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-700 dark:text-slate-300',
  },
  active: {
    label: 'Active',
    icon: Play,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
  },
  paused: {
    label: 'Paused',
    icon: Pause,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
  },
  completed: {
    label: 'Completed',
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

// Ordered statuses for display
export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  'planned',
  'active',
  'paused',
  'completed',
  'cancelled',
]

// Helper to get status config
export function getProjectStatusConfig(status: ProjectStatus): ProjectStatusConfig {
  return PROJECT_STATUS_CONFIG[status] ?? PROJECT_STATUS_CONFIG.planned
}

// Format project identifier display
export function formatProjectIdentifier(identifier: string): string {
  return identifier.toUpperCase()
}

// Calculate days remaining until target date
export function getDaysUntilTarget(targetDate: string | undefined): number | null {
  if (!targetDate) return null

  const target = new Date(targetDate)
  const now = new Date()
  const diffTime = target.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

// Format target date with relative context
export function formatTargetDate(targetDate: string | undefined): string {
  if (!targetDate) return 'No target date'

  const days = getDaysUntilTarget(targetDate)
  const dateStr = new Date(targetDate).toLocaleDateString()

  if (days === null) return dateStr
  if (days < 0) return `${dateStr} (${Math.abs(days)} days overdue)`
  if (days === 0) return `${dateStr} (Due today)`
  if (days === 1) return `${dateStr} (Due tomorrow)`
  if (days <= 7) return `${dateStr} (${days} days left)`

  return dateStr
}

// Get progress bar color based on status and progress
export function getProgressColor(status: ProjectStatus, progress: number): string {
  if (status === 'completed') return 'bg-green-500'
  if (status === 'cancelled') return 'bg-red-400'
  if (status === 'paused') return 'bg-yellow-500'
  if (progress >= 75) return 'bg-green-500'
  if (progress >= 50) return 'bg-blue-500'
  if (progress >= 25) return 'bg-yellow-500'
  return 'bg-slate-400'
}
