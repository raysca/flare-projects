import { useRef, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from '@tanstack/react-router'
import { IssueCard } from './issue-card'
import { cn } from '@/lib/utils'
import type { Issue } from '@/types/issues'

interface DraggableIssueCardProps {
  issue: Issue
  workspaceSlug: string
}

export function DraggableIssueCard({
  issue,
}: DraggableIssueCardProps) {
  const navigate = useNavigate()
  const wasDragging = useRef(false)

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: issue.id,
    })

  // Track when dragging ends
  useEffect(() => {
    if (isDragging) {
      wasDragging.current = true
    }
  }, [isDragging])

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  const handleClick = (e: React.MouseEvent) => {
    // If we were just dragging, don't navigate
    if (wasDragging.current) {
      wasDragging.current = false
      e.preventDefault()
      return
    }
    navigate({ to: '/issue/$issueId', params: { issueId: issue.id } })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={cn(
        'touch-none',
        isDragging && 'opacity-50 cursor-grabbing',
        !isDragging && 'cursor-grab',
      )}
    >
      <IssueCard issue={issue} disableLink />
    </div>
  )
}
