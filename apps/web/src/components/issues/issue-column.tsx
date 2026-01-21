import { useState, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { IssueCard } from './issue-card'
import { STATUS_CONFIG } from '@/lib/issue-utils'
import { cn } from '@/lib/utils'
import type { Issue, IssueStatus } from '@/types/issues'

interface IssueColumnProps {
  status: IssueStatus
  issues: Issue[]
  workspaceSlug: string
  onQuickCreate?: (title: string, status: IssueStatus) => Promise<void>
  onExpandCreate?: (status: IssueStatus) => void
}

export function IssueColumn({
  status,
  issues,
  workspaceSlug,
  onQuickCreate,
  onExpandCreate,
}: IssueColumnProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  const [isCreating, setIsCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isCreating])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isSubmitting || !onQuickCreate) return

    setIsSubmitting(true)
    try {
      await onQuickCreate(title.trim(), status)
      setTitle('')
      // Keep form open for rapid creation
    } catch (err) {
      console.error('Failed to create issue:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsCreating(false)
      setTitle('')
    } else if (e.key === 'Tab' && onExpandCreate) {
      e.preventDefault()
      onExpandCreate(status)
      setIsCreating(false)
      setTitle('')
    }
  }

  const handleClose = () => {
    setIsCreating(false)
    setTitle('')
  }

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
        {onQuickCreate && !isCreating && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="size-4" />
          </Button>
        )}
      </div>

      {/* Quick Create Form */}
      {isCreating && onQuickCreate && (
        <form onSubmit={handleSubmit} className="p-2 border-b">
          <Input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Issue title..."
            className="h-8 text-sm mb-2"
            disabled={isSubmitting}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">
              Enter to create · Tab to expand · Esc to cancel
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="submit"
                size="sm"
                className="h-6 text-xs"
                disabled={!title.trim() || isSubmitting}
              >
                {isSubmitting ? '...' : 'Create'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={handleClose}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

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
          {issues.length === 0 && !isCreating && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No issues
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
