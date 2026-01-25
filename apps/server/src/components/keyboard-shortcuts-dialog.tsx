import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface ShortcutGroup {
  name: string
  shortcuts: {
    keys: string[]
    description: string
  }[]
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    name: 'Navigation',
    shortcuts: [
      { keys: ['j'], description: 'Move selection down' },
      { keys: ['k'], description: 'Move selection up' },
      { keys: ['Enter'], description: 'Open selected issue' },
      { keys: ['Esc'], description: 'Clear selection / Close dialog' },
    ],
  },
  {
    name: 'Issue Actions',
    shortcuts: [
      { keys: ['c'], description: 'Create new issue' },
      { keys: ['/'], description: 'Focus search' },
    ],
  },
  {
    name: 'Quick Status',
    shortcuts: [
      { keys: ['1'], description: 'Set status to Backlog' },
      { keys: ['2'], description: 'Set status to Todo' },
      { keys: ['3'], description: 'Set status to In Progress' },
      { keys: ['4'], description: 'Set status to In Review' },
      { keys: ['5'], description: 'Set status to Done' },
      { keys: ['6'], description: 'Set status to Cancelled' },
    ],
  },
  {
    name: 'General',
    shortcuts: [{ keys: ['?'], description: 'Show keyboard shortcuts' }],
  },
]

interface KeyboardShortcutsDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = open ?? internalOpen
  const setIsOpen = onOpenChange ?? setInternalOpen

  // Listen for ? key to open dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in input
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [setIsOpen])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and manage issues quickly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.name}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {group.name}
              </h3>
              <div className="space-y-1">
                {group.shortcuts.map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, j) => (
                        <kbd
                          key={j}
                          className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium bg-muted rounded border border-border min-w-[24px]"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
