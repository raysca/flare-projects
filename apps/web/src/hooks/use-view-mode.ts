import { useState, useEffect, useCallback } from 'react'
import type { ViewMode } from '@/types/issues'

const STORAGE_KEY_PREFIX = 'issue-view-mode'

function getStorageKey(workspaceSlug: string): string {
  return `${STORAGE_KEY_PREFIX}-${workspaceSlug}`
}

export function useViewMode(workspaceSlug: string) {
  const [viewMode, setViewModeState] = useState<ViewMode>('table')
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(getStorageKey(workspaceSlug))
    if (stored === 'table' || stored === 'board') {
      setViewModeState(stored)
    }
    setIsLoaded(true)
  }, [workspaceSlug])

  // Persist to localStorage when changed
  const setViewMode = useCallback(
    (mode: ViewMode) => {
      setViewModeState(mode)
      localStorage.setItem(getStorageKey(workspaceSlug), mode)
    },
    [workspaceSlug]
  )

  const toggleViewMode = useCallback(() => {
    setViewMode(viewMode === 'table' ? 'board' : 'table')
  }, [viewMode, setViewMode])

  return {
    viewMode,
    setViewMode,
    toggleViewMode,
    isLoaded,
  }
}
