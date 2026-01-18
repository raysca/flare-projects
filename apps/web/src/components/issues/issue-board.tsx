import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { IssueColumn } from './issue-column'
import { STATUS_ORDER } from '@/lib/issue-utils'
import type { Issue, IssueStatus } from '@/types/issues'

interface IssueBoardProps {
  issues: Issue[]
  workspaceSlug: string
  onQuickCreate?: (status: IssueStatus) => void
  isLoading?: boolean
}

export function IssueBoard({
  issues,
  workspaceSlug,
  onQuickCreate,
  isLoading,
}: IssueBoardProps) {
  // Group issues by status
  const issuesByStatus = useMemo(() => {
    const grouped: Record<IssueStatus, Issue[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
      cancelled: [],
    }

    issues.forEach((issue) => {
      if (grouped[issue.status]) {
        grouped[issue.status].push(issue)
      }
    })

    return grouped
  }, [issues])

  if (isLoading) {
    return <IssueBoardSkeleton />
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-4 pb-4 h-[calc(100vh-220px)]">
        {STATUS_ORDER.map((status) => (
          <IssueColumn
            key={status}
            status={status}
            issues={issuesByStatus[status]}
            workspaceSlug={workspaceSlug}
            onQuickCreate={onQuickCreate}
          />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}

function IssueBoardSkeleton() {
  return (
    <div className="flex gap-4 pb-4">
      {STATUS_ORDER.map((status) => (
        <div
          key={status}
          className="flex flex-col min-w-[280px] max-w-[320px] bg-muted/30 rounded-lg"
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>
          <div className="p-2 space-y-2">
            {Array.from({ length: Math.floor(Math.random() * 3) + 1 }).map(
              (_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              )
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
