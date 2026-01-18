import { useState, useRef, useEffect } from 'react'
import { Plus, Expand } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { IssueStatus } from '@/types/issues'

interface IssueQuickCreateProps {
  workspaceId: string
  teamId: string
  defaultStatus?: IssueStatus
  onSubmit: (title: string, status?: IssueStatus) => Promise<void>
  onExpandToForm?: () => void
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

export function IssueQuickCreate({
  workspaceId: _workspaceId,
  teamId: _teamId,
  defaultStatus = 'backlog',
  onSubmit,
  onExpandToForm,
  isOpen,
  onOpenChange,
  className,
}: IssueQuickCreateProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const open = isOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmit(title.trim(), defaultStatus)
      setTitle('')
      // Keep open for rapid creation
    } catch (err) {
      console.error('Failed to create issue:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      setTitle('')
    } else if (e.key === 'Tab' && onExpandToForm) {
      e.preventDefault()
      onExpandToForm()
    }
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn('gap-2 text-muted-foreground', className)}
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        New Issue
      </Button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex items-center gap-2 p-2 border rounded-lg bg-background',
        className
      )}
    >
      <Plus className="size-4 text-muted-foreground shrink-0" />
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Issue title... (Enter to create, Tab to expand, Esc to cancel)"
        className="border-0 shadow-none focus-visible:ring-0 h-8 px-0"
        disabled={isSubmitting}
      />
      <div className="flex items-center gap-1 shrink-0">
        {onExpandToForm && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onExpandToForm}
            title="Expand to full form"
          >
            <Expand className="size-4" />
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          className="h-7"
          disabled={!title.trim() || isSubmitting}
        >
          {isSubmitting ? '...' : 'Create'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7"
          onClick={() => {
            setOpen(false)
            setTitle('')
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
