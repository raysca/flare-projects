import { useState, useCallback } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { LayoutDashboard, Plus, Search, HelpCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { IssueTable } from '@/components/issues/issue-table'
import { IssueBoard } from '@/components/issues/issue-board'
import { ViewToggle } from '@/components/issues/view-toggle'
import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts-dialog'
import { useIssues, useUpdateIssue } from '@/hooks/use-issues'
import { useMe } from '@/hooks/use-users'
import { useViewMode } from '@/hooks/use-view-mode'
import {
  useKeyboardShortcuts,
  useIssueListNavigation,
} from '@/hooks/use-keyboard-shortcuts'
import type { IssueStatus, IssueFilters } from '@/types/issues'

export const Route = createFileRoute('/_layout/')({
  component: MyIssuesPage,
})

function MyIssuesPage() {
  const navigate = useNavigate()
  const { data: user, isLoading: isLoadingUser } = useMe()

  // Filters
  const [filters, _setFilters] = useState<IssueFilters>({})
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch issues assigned to me
  const { data: issues = [], isLoading: isLoadingIssues } = useIssues({
    assigneeId: user?.id,
    ...filters,
    search: searchQuery || undefined
  })

  // View mode
  const { viewMode, setViewMode } = useViewMode('global')

  // Selection state
  const [selectedIssueId, setSelectedIssueId] = useState<string | undefined>()
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false)

  // Mutations
  const updateIssue = useUpdateIssue()

  // Navigation handler
  const handleOpenIssue = useCallback(
    (issueId: string) => {
      navigate({
        to: '/issue/$issueId',
        params: { issueId },
      })
    },
    [navigate]
  )

  useIssueListNavigation({
    issues,
    selectedId: selectedIssueId,
    onSelect: setSelectedIssueId,
    onOpen: handleOpenIssue,
    enabled: viewMode === 'table',
  })

  // Quick status change for keyboard shortcuts
  const handleQuickStatusChange = useCallback(
    async (status: IssueStatus) => {
      if (!selectedIssueId) return
      await updateIssue.mutateAsync({
        issueId: selectedIssueId,
        input: { status },
      })
    },
    [selectedIssueId, updateIssue]
  )

  useKeyboardShortcuts({
    shortcuts: [
      {
        key: '/',
        handler: () => document.getElementById('search-input')?.focus(),
      },
      { key: '1', handler: () => handleQuickStatusChange('backlog') },
      { key: '2', handler: () => handleQuickStatusChange('todo') },
      { key: '3', handler: () => handleQuickStatusChange('in_progress') },
      { key: '4', handler: () => handleQuickStatusChange('in_review') },
      { key: '5', handler: () => handleQuickStatusChange('done') },
      { key: '6', handler: () => handleQuickStatusChange('cancelled') },
    ],
    enabled: true,
  })

  if (isLoadingUser) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
  }

  // Loaded but no user? (Should be handled by auth guard)
  if (!user) return null

  // Empty state
  if (!isLoadingIssues && issues.length === 0 && !searchQuery) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="inline-flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-6">
          <LayoutDashboard className="w-12 h-12 text-slate-400" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Welcome, {user.name}</h2>
        <p className="text-muted-foreground max-w-lg mx-auto mb-8">
          You don't have any issues assigned to you yet.
          Create a new issue to get started.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/create-issue">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Issue
            </Button>
          </Link>
        </div>
        <KeyboardShortcutsDialog
          open={shortcutsDialogOpen}
          onOpenChange={setShortcutsDialogOpen}
        />
      </div>
    )
  }

  return (
    <div className="max-w-full mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">My Issues</h2>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="search-input"
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => setShortcutsDialogOpen(true)}
                >
                  <HelpCircle className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Keyboard shortcuts (?)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Link to="/create-issue">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Issue
            </Button>
          </Link>
        </div>
      </div>

      {viewMode === 'table' ? (
        <IssueTable
          issues={issues}
          workspaceSlug="global"
          selectedId={selectedIssueId}
          onSelectIssue={setSelectedIssueId}
          isLoading={isLoadingIssues}
        />
      ) : (
        <IssueBoard
          issues={issues}
          workspaceSlug="global"
          onQuickCreate={() => navigate({ to: '/create-issue' })}
          isLoading={isLoadingIssues}
        />
      )}

      <KeyboardShortcutsDialog
        open={shortcutsDialogOpen}
        onOpenChange={setShortcutsDialogOpen}
      />
    </div>
  )
}
