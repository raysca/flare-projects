import { useState, useCallback } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { LayoutDashboard, Plus, Search, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { IssueTable } from '@/components/issues/issue-table'
import { IssueBoard } from '@/components/issues/issue-board'
import { ViewToggle } from '@/components/issues/view-toggle'
import { IssueQuickCreate } from '@/components/issues/issue-quick-create'
import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts-dialog'
import { useIssues, useCreateIssue, useUpdateIssue } from '@/hooks/use-issues'
import {
  useWorkspaceBySlug,
  useWorkspaceTeams,
} from '@/hooks/use-workspace'
import { useViewMode } from '@/hooks/use-view-mode'
import {
  useKeyboardShortcuts,
  useIssueListNavigation,
} from '@/hooks/use-keyboard-shortcuts'
import type { IssueStatus, IssueFilters } from '@/types/issues'

export const Route = createFileRoute('/workspace/$slug/')({
  component: WorkspaceIndex,
})

function WorkspaceIndex() {
  const { slug } = Route.useParams()
  const navigate = useNavigate()

  // Data queries
  const { data: workspace, isLoading: isLoadingWorkspace } =
    useWorkspaceBySlug(slug)
  const { data: teams = [] } = useWorkspaceTeams(workspace?.id)

  // Filters state (setter for future filter UI)
  const [filters, _setFilters] = useState<IssueFilters>({})
  const [searchQuery, setSearchQuery] = useState('')

  const { data: issues = [], isLoading: isLoadingIssues } = useIssues(
    workspace?.id,
    { ...filters, search: searchQuery || undefined }
  )

  // View mode
  const { viewMode, setViewMode } = useViewMode(slug)

  // Selection state for keyboard navigation
  const [selectedIssueId, setSelectedIssueId] = useState<string | undefined>()

  // Quick create state
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)

  // Shortcuts dialog
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false)

  // Mutations
  const createIssue = useCreateIssue()
  const updateIssue = useUpdateIssue()

  // Navigation handler for keyboard
  const handleOpenIssue = useCallback(
    (issueId: string) => {
      navigate({
        to: '/workspace/$slug/issue/$issueId',
        params: { slug, issueId },
      })
    },
    [navigate, slug]
  )

  // Keyboard navigation for issue list
  useIssueListNavigation({
    issues,
    selectedId: selectedIssueId,
    onSelect: setSelectedIssueId,
    onOpen: handleOpenIssue,
    enabled: viewMode === 'table',
  })

  // Quick create handler
  const handleQuickCreate = async (title: string, status?: IssueStatus) => {
    if (!workspace || teams.length === 0) return

    await createIssue.mutateAsync({
      workspaceId: workspace.id,
      teamId: teams[0].id,
      title,
      status: status ?? 'backlog',
    })
  }

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

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'c',
        handler: () => setQuickCreateOpen(true),
        enabled: !quickCreateOpen,
      },
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

  if (isLoadingWorkspace) {
    return <WorkspaceIndexSkeleton />
  }

  if (!workspace) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Workspace not found</p>
      </div>
    )
  }

  // Empty state
  if (!isLoadingIssues && issues.length === 0 && !searchQuery && !filters.status?.length) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="inline-flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-6">
          <LayoutDashboard className="w-12 h-12 text-slate-400" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Welcome to {workspace.name}</h2>
        <p className="text-muted-foreground max-w-lg mx-auto mb-8">
          You haven't created any issues yet. Get started by creating your first
          task, bug, or feature request.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/workspace/$slug/create-issue" params={{ slug }}>
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">Issues</h2>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search */}
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

          {/* View toggle */}
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />

          {/* Shortcuts help */}
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

          {/* Create button */}
          <Link to="/workspace/$slug/create-issue" params={{ slug }}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Issue
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick create */}
      {teams.length > 0 && (
        <div className="mb-4">
          <IssueQuickCreate
            workspaceId={workspace.id}
            teamId={teams[0].id}
            onSubmit={handleQuickCreate}
            isOpen={quickCreateOpen}
            onOpenChange={setQuickCreateOpen}
            onExpandToForm={() =>
              navigate({ to: '/workspace/$slug/create-issue', params: { slug } })
            }
          />
        </div>
      )}

      {/* Content */}
      {viewMode === 'table' ? (
        <IssueTable
          issues={issues}
          workspaceSlug={slug}
          selectedId={selectedIssueId}
          onSelectIssue={setSelectedIssueId}
          isLoading={isLoadingIssues}
        />
      ) : (
        <IssueBoard
          issues={issues}
          workspaceSlug={slug}
          onQuickCreate={() => {
            setQuickCreateOpen(true)
          }}
          isLoading={isLoadingIssues}
        />
      )}

      {/* Shortcuts dialog */}
      <KeyboardShortcutsDialog
        open={shortcutsDialogOpen}
        onOpenChange={setShortcutsDialogOpen}
      />
    </div>
  )
}

function WorkspaceIndexSkeleton() {
  return (
    <div className="max-w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <Skeleton className="h-10 w-full mb-4" />
      <div className="border rounded-lg">
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
    </div>
  )
}
