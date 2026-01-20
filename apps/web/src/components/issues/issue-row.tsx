import { Link } from '@tanstack/react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  formatRelativeTime,
  getInitials,
} from '@/lib/issue-utils'
import { cn } from '@/lib/utils'
import type { Issue } from '@/types/issues'

interface IssueRowProps {
  issue: Issue
  workspaceSlug?: string
  isSelected?: boolean
  onSelect?: () => void
}

export function IssueRow({
  issue,
  isSelected,
  onSelect,
}: IssueRowProps) {
  const statusConfig = STATUS_CONFIG[issue.status]
  const priorityConfig = PRIORITY_CONFIG[issue.priority]
  const StatusIcon = statusConfig.icon
  const PriorityIcon = priorityConfig.icon

  // Format identifier based on project if available
  const identifier = issue.project
    ? `${issue.project.identifier}-${issue.number}`
    : `#${issue.number}`

  return (
    <Link
      to="/issue/$issueId"
      params={{ issueId: issue.id }}
      onClick={onSelect}
      className={cn(
        'group flex items-center gap-3 px-4 py-2.5 border-b border-border hover:bg-accent/50 transition-colors cursor-pointer',
        isSelected && 'bg-accent'
      )}
    >
      {/* Issue ID */}
      <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">
        {identifier}
      </span>

      {/* Status icon */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="shrink-0">
              <StatusIcon className={cn('size-4', statusConfig.color)} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{statusConfig.label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Title */}
      <span className="flex-1 truncate text-sm font-medium text-foreground">
        {issue.title}
      </span>

      {/* Labels */}
      {issue.labels && issue.labels.length > 0 && (
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {issue.labels.slice(0, 2).map((label) => (
            <Badge
              key={label.id}
              variant="secondary"
              className="px-1.5 py-0 text-[10px] font-medium"
              style={{
                backgroundColor: `${label.color}20`,
                color: label.color,
              }}
            >
              {label.name}
            </Badge>
          ))}
          {issue.labels.length > 2 && (
            <span className="text-xs text-muted-foreground">
              +{issue.labels.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Priority */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="shrink-0">
              <PriorityIcon className={cn('size-4', priorityConfig.color)} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{priorityConfig.label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Assignee */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="shrink-0">
              {issue.assignee ? (
                <Avatar className="size-6">
                  <AvatarImage src={issue.assignee.avatarUrl} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(issue.assignee.name)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="size-6 rounded-full border-2 border-dashed border-muted-foreground/30" />
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{issue.assignee?.name ?? 'Unassigned'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Date */}
      <span className="hidden sm:block text-xs text-muted-foreground w-16 text-right shrink-0">
        {formatRelativeTime(issue.createdAt)}
      </span>
    </Link>
  )
}
