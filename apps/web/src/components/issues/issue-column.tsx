import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { IssueCard } from './issue-card'
import { STATUS_CONFIG } from '@/lib/issue-utils'
import { cn } from '@/lib/utils'
import type { Issue, IssueStatus } from '@/types/issues'

interface IssueColumnProps {
  status: IssueStatus
  issues: Issue[]
  workspaceSlug: string
  onQuickCreate?: (status: IssueStatus) => void
}

export function IssueColumn({
  status,
  issues,
  workspaceSlug,
  onQuickCreate,
}: IssueColumnProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] h-full bg-muted/30 rounded-lg">
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Icon className={cn('size-4', config.color)} />
          <span className="font-medium text-sm">{config.label}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {issues.length}
          </span>
        </div>
        {onQuickCreate && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onQuickCreate(status)}
          >
            <Plus className="size-4" />
          </Button>
        )}
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              workspaceSlug={workspaceSlug}
            />
          ))}
          {issues.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No issues
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
