import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { IssueColumn } from './issue-column'
import { IssueCard } from './issue-card'
import { STATUS_ORDER } from '@/lib/issue-utils'
import { useUpdateIssue } from '@/hooks/use-issues'
import type { Issue, IssueStatus } from '@/types/issues'

interface IssueBoardProps {
  issues: Issue[]
  workspaceSlug: string
  projectId?: string
  onQuickCreate?: (title: string, status: IssueStatus) => Promise<void>
  onExpandCreate?: (status: IssueStatus) => void
  isLoading?: boolean
}

export function IssueBoard({
  issues,
  workspaceSlug,
  onQuickCreate,
  onExpandCreate,
  isLoading,
}: IssueBoardProps) {
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null)
  const updateIssue = useUpdateIssue()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const issue = issues.find((i) => i.id === active.id)
    if (issue) {
      setActiveIssue(issue)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveIssue(null)

    if (!over) return

    const issueId = active.id as string
    const newStatus = over.id as IssueStatus

    // Find the issue being dragged
    const issue = issues.find((i) => i.id === issueId)
    if (!issue) return

    // Only update if status actually changed
    if (issue.status !== newStatus && STATUS_ORDER.includes(newStatus)) {
      updateIssue.mutate({
        issueId,
        input: { status: newStatus },
      })
    }
  }

  if (isLoading) {
    return <IssueBoardSkeleton />
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-4 h-[calc(100vh-220px)]">
          {STATUS_ORDER.map((status) => (
            <IssueColumn
              key={status}
              status={status}
              issues={issuesByStatus[status]}
              workspaceSlug={workspaceSlug}
              onQuickCreate={onQuickCreate}
              onExpandCreate={onExpandCreate}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activeIssue ? (
          <div className="opacity-80 rotate-3 scale-105">
            <IssueCard issue={activeIssue} workspaceSlug={workspaceSlug} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
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
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
