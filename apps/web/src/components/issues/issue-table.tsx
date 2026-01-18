import { Skeleton } from '@/components/ui/skeleton'
import { IssueRow } from './issue-row'
import type { Issue } from '@/types/issues'

interface IssueTableProps {
  issues: Issue[]
  workspaceSlug: string
  selectedId?: string
  onSelectIssue?: (issueId: string) => void
  isLoading?: boolean
}

export function IssueTable({
  issues,
  workspaceSlug,
  selectedId,
  onSelectIssue,
  isLoading,
}: IssueTableProps) {
  if (isLoading) {
    return <IssueTableSkeleton />
  }

  if (issues.length === 0) {
    return <IssueTableEmpty />
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
        <span className="w-20 shrink-0">ID</span>
        <span className="w-4 shrink-0" /> {/* Status icon space */}
        <span className="flex-1">Title</span>
        <span className="hidden md:block w-24 shrink-0">Labels</span>
        <span className="w-4 shrink-0">Pri</span>
        <span className="w-6 shrink-0">Asn</span>
        <span className="hidden sm:block w-16 text-right shrink-0">Date</span>
      </div>

      {/* Rows */}
      <div>
        {issues.map((issue) => (
          <IssueRow
            key={issue.id}
            issue={issue}
            workspaceSlug={workspaceSlug}
            isSelected={selectedId === issue.id}
            onSelect={() => onSelectIssue?.(issue.id)}
          />
        ))}
      </div>
    </div>
  )
}

function IssueTableSkeleton() {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/50">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 flex-1 max-w-md" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

function IssueTableEmpty() {
  return (
    <div className="border rounded-lg p-12 text-center">
      <p className="text-muted-foreground text-sm">
        No issues found. Create your first issue to get started.
      </p>
    </div>
  )
}
