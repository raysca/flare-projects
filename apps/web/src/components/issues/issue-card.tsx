import { Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  PRIORITY_CONFIG,
  getInitials,
} from '@/lib/issue-utils'
import { cn } from '@/lib/utils'
import type { Issue } from '@/types/issues'

interface IssueCardProps {
  issue: Issue
  workspaceSlug?: string
}

export function IssueCard({ issue }: IssueCardProps) {
  const priorityConfig = PRIORITY_CONFIG[issue.priority]
  const PriorityIcon = priorityConfig.icon

  // Format identifier based on project if available
  const identifier = issue.project
    ? `${issue.project.identifier}-${issue.number}`
    : `#${issue.number}`

  return (
    <Link
      to="/issue/$issueId"
      params={{ issueId: issue.id }}
      className="block"
    >
      <Card className="hover:bg-accent/50 hover:shadow-md transition-all cursor-pointer group">
        <CardContent className="p-3 space-y-2">
          {/* Top row: ID and Priority */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-muted-foreground">
              {identifier}
            </span>
            <PriorityIcon className={cn('size-3.5', priorityConfig.color)} />
          </div>

          {/* Title */}
          <p className="text-sm font-medium leading-snug line-clamp-2">
            {issue.title}
          </p>

          {/* Labels */}
          {issue.labels && issue.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {issue.labels.slice(0, 3).map((label) => (
                <Badge
                  key={label.id}
                  variant="secondary"
                  className="px-1.5 py-0 text-[10px]"
                  style={{
                    backgroundColor: `${label.color}20`,
                    color: label.color,
                  }}
                >
                  {label.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Bottom row: Assignee */}
          <div className="flex items-center justify-end pt-1">
            {issue.assignee ? (
              <Avatar className="size-5">
                <AvatarImage src={issue.assignee.avatarUrl} />
                <AvatarFallback className="text-[8px]">
                  {getInitials(issue.assignee.name)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="size-5 rounded-full border border-dashed border-muted-foreground/30" />
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
