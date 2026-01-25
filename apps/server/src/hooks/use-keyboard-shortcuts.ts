import { useEffect, useCallback, useRef } from 'react'

interface ShortcutConfig {
  key: string
  handler: () => void
  enabled?: boolean
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
}

interface UseKeyboardShortcutsOptions {
  shortcuts: ShortcutConfig[]
  enabled?: boolean
}

function isInputElement(element: EventTarget | null): boolean {
  if (!element || !(element instanceof HTMLElement)) return false

  const tagName = element.tagName.toLowerCase()
  const isInput =
    tagName === 'input' || tagName === 'textarea' || tagName === 'select'
  const isEditable = element.isContentEditable

  return isInput || isEditable
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Ignore if user is typing in an input
      if (isInputElement(event.target)) return

      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue

        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatch = !!shortcut.ctrl === event.ctrlKey
        const shiftMatch = !!shortcut.shift === event.shiftKey
        const altMatch = !!shortcut.alt === event.altKey
        const metaMatch = !!shortcut.meta === event.metaKey

        if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
          event.preventDefault()
          shortcut.handler()
          return
        }
      }
    },
    [enabled],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Hook for issue list navigation
interface UseIssueListNavigationOptions {
  issues: { id: string }[]
  selectedId: string | undefined
  onSelect: (id: string | undefined) => void
  onOpen: (id: string) => void
  enabled?: boolean
}

export function useIssueListNavigation({
  issues,
  selectedId,
  onSelect,
  onOpen,
  enabled = true,
}: UseIssueListNavigationOptions) {
  const currentIndex = issues.findIndex((issue) => issue.id === selectedId)

  const moveDown = useCallback(() => {
    if (issues.length === 0) return
    if (currentIndex === -1) {
      onSelect(issues[0].id)
    } else if (currentIndex < issues.length - 1) {
      onSelect(issues[currentIndex + 1].id)
    }
  }, [issues, currentIndex, onSelect])

  const moveUp = useCallback(() => {
    if (issues.length === 0) return
    if (currentIndex === -1) {
      onSelect(issues[issues.length - 1].id)
    } else if (currentIndex > 0) {
      onSelect(issues[currentIndex - 1].id)
    }
  }, [issues, currentIndex, onSelect])

  const openSelected = useCallback(() => {
    if (selectedId) {
      onOpen(selectedId)
    }
  }, [selectedId, onOpen])

  const clearSelection = useCallback(() => {
    onSelect(undefined)
  }, [onSelect])

  useKeyboardShortcuts({
    shortcuts: [
      { key: 'j', handler: moveDown },
      { key: 'k', handler: moveUp },
      { key: 'ArrowDown', handler: moveDown },
      { key: 'ArrowUp', handler: moveUp },
      { key: 'Enter', handler: openSelected, enabled: !!selectedId },
      { key: 'Escape', handler: clearSelection },
    ],
    enabled,
  })

  return { moveDown, moveUp, openSelected, clearSelection }
}
