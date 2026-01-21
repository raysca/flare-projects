import { useState, useCallback } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Plus, Search, HelpCircle, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IssueTable } from '@/components/issues/issue-table'
import { IssueBoard } from '@/components/issues/issue-board'
import { ViewToggle } from '@/components/issues/view-toggle'
import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useProject, useProjectIssues } from '@/hooks/use-projects'
import { useUpdateIssue, useCreateIssue } from '@/hooks/use-issues'
import { useViewMode } from '@/hooks/use-view-mode'
import {
  useKeyboardShortcuts,
  useIssueListNavigation,
} from '@/hooks/use-keyboard-shortcuts'
import { useWorkspaceSocket } from '@/hooks/use-workspace-socket'
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/lib/issue-utils'
import type { IssueStatus, IssuePriority } from '@/types/issues'

export const Route = createFileRoute('/_layout/projects/$projectId/issues')({
  component: ProjectIssuesPage,
})

function ProjectIssuesPage() {
  const navigate = useNavigate()
  const { projectId } = Route.useParams()

  // Enable real-time updates
  useWorkspaceSocket(projectId)

  // Fetch project and issues
  const { data: project, isLoading: isLoadingProject } = useProject(projectId)
  const { data: issues = [], isLoading: isLoadingIssues } =
    useProjectIssues(projectId)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<IssuePriority | 'all'>(
    'all',
  )

  // View mode (persisted per project)
  const { viewMode, setViewMode } = useViewMode(`project-${projectId}`)

  // Selection state
  const [selectedIssueId, setSelectedIssueId] = useState<string | undefined>()
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false)

  // Mutations
  const updateIssue = useUpdateIssue()
  const createIssue = useCreateIssue()

  // Handle inline create from board
  const handleInlineCreate = useCallback(async (title: string, status: IssueStatus) => {
    if (!projectId) return;
    await createIssue.mutateAsync({
      title,
      status,
      projectId,
      priority: 'no_priority'
    });
  }, [createIssue, projectId]);

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesTitle = issue.title.toLowerCase().includes(query)
      const matchesId = `${project?.identifier}-${issue.number}`
        .toLowerCase()
        .includes(query)
      if (!matchesTitle && !matchesId) return false
    }

    // Status filter
    if (statusFilter !== 'all' && issue.status !== statusFilter) return false

    // Priority filter
    if (priorityFilter !== 'all' && issue.priority !== priorityFilter)
      return false

    return true
  })

  // Navigation handler
  const handleOpenIssue = useCallback(
    (issueId: string) => {
      navigate({
        to: '/issue/$issueId',
        params: { issueId },
      })
    },
    [navigate],
  )

  useIssueListNavigation({
    issues: filteredIssues,
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
    [selectedIssueId, updateIssue],
  )

  // Handle navigate to create page
  const handleNavigateToCreate = useCallback(() => {
    navigate({
      to: '/create-issue',
      search: { projectId },
    })
  }, [navigate, projectId])

  useKeyboardShortcuts({
    shortcuts: [
      {
        key: '/',
        handler: () => document.getElementById('project-search-input')?.focus(),
      },
      {
        key: 'c',
        handler: handleNavigateToCreate,
      },
      { key: '1', handler: () => handleQuickStatusChange('backlog') },
      { key: '2', handler: () => handleQuickStatusChange('todo') },
      { key: '3', handler: () => handleQuickStatusChange('in_progress') },
      { key: '4', handler: () => handleQuickStatusChange('in_review') },
      { key: '5', handler: () => handleQuickStatusChange('done') },
      { key: '6', handler: () => handleQuickStatusChange('cancelled') },
      { key: '?', handler: () => setShortcutsDialogOpen(true) },
    ],
    enabled: true,
  })

  const isLoading = isLoadingProject || isLoadingIssues

  if (isLoading) {
    return <ProjectIssuesSkeleton />
  }

  if (!project) {
    return (
      <div className="max-w-5xl mx-auto py-6">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    )
  }

  // Calculate stats
  const totalIssues = issues.length
  const openIssues = issues.filter(
    (i) => !['done', 'cancelled'].includes(i.status),
  ).length

  return (
    <div className="max-w-full mx-auto py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">{project.name} Issues</h2>
          <p className="text-sm text-muted-foreground">
            {openIssues} open · {totalIssues} total
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="project-search-input"
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* View toggle */}
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />

          {/* Help */}
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

          {/* Create issue */}
          <Link to="/create-issue" search={{ projectId }}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Issue
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="size-4" />
          <span>Filter:</span>
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as IssueStatus | 'all')
          }
        >
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
              const Icon = config.icon
              return (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <Icon className={`size-3.5 ${config.color}`} />
                    {config.label}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>

        <Select
          value={priorityFilter}
          onValueChange={(value) =>
            setPriorityFilter(value as IssuePriority | 'all')
          }
        >
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => {
              const Icon = config.icon
              return (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <Icon className={`size-3.5 ${config.color}`} />
                    {config.label}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>

        {(statusFilter !== 'all' ||
          priorityFilter !== 'all' ||
          searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                setStatusFilter('all')
                setPriorityFilter('all')
                setSearchQuery('')
              }}
            >
              Clear filters
            </Button>
          )}

        <div className="flex-1" />

        <span className="text-sm text-muted-foreground">
          {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Issue list/board */}
      {viewMode === 'table' ? (
        <IssueTable
          issues={filteredIssues}
          workspaceSlug={project.identifier}
          selectedId={selectedIssueId}
          onSelectIssue={setSelectedIssueId}
          isLoading={false}
        />
      ) : (
        <IssueBoard
          issues={filteredIssues}
          workspaceSlug={project.identifier}
          onQuickCreate={handleInlineCreate}
          isLoading={false}
        />
      )}

      {/* Empty state */}
      {!isLoading && filteredIssues.length === 0 && issues.length > 0 && (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-4">
            No issues match your current filters.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setStatusFilter('all')
              setPriorityFilter('all')
              setSearchQuery('')
            }}
          >
            Clear filters
          </Button>
        </div>
      )}

      {!isLoading && issues.length === 0 && (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <p className="text-muted-foreground mb-4">
            No issues in this project yet. Create your first issue to get
            started.
          </p>
          <Link to="/create-issue" search={{ projectId }}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Issue
            </Button>
          </Link>
        </div>
      )}

      <KeyboardShortcutsDialog
        open={shortcutsDialogOpen}
        onOpenChange={setShortcutsDialogOpen}
      />
    </div>
  )
}

function ProjectIssuesSkeleton() {
  return (
    <div className="max-w-full mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-8 w-[140px]" />
        <Skeleton className="h-8 w-[140px]" />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/50">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
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
