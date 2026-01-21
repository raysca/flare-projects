import { useState, useCallback } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  Calendar,
  ArrowLeft,
  Edit,
  Trash2,
  Loader2,
  Plus,
  CheckCircle2,
  Clock,
  CircleDot,
  MoreHorizontal,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  useCycleWithStats,
  useCycleIssues,
  useUpdateCycle,
  useDeleteCycle,
} from '@/hooks/use-cycles'
import { useViewMode } from '@/hooks/use-view-mode'
import type { CycleStatus } from '@/types/issues'

export const Route = createFileRoute(
  '/_layout/projects/$projectId/cycles/$cycleId',
)({
  component: CycleDetail,
})

function CycleDetail() {
  const { projectId, cycleId } = Route.useParams()
  const navigate = useNavigate()

  const { data: cycle, isLoading: isLoadingCycle } = useCycleWithStats(cycleId)
  const { data: issues = [], isLoading: isLoadingIssues } =
    useCycleIssues(cycleId, projectId)
  const updateCycle = useUpdateCycle()
  const deleteCycle = useDeleteCycle()

  const { viewMode, setViewMode } = useViewMode('cycle')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIssueId, setSelectedIssueId] = useState<string | undefined>()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editStatus, setEditStatus] = useState<CycleStatus>('upcoming')

  const openEditDialog = useCallback(() => {
    if (cycle) {
      setEditName(cycle.name)
      setEditDescription(cycle.description || '')
      setEditStartDate(cycle.startDate.split('T')[0])
      setEditEndDate(cycle.endDate.split('T')[0])
      setEditStatus(cycle.status)
      setIsEditDialogOpen(true)
    }
  }, [cycle])

  const handleSaveEdit = async () => {
    if (!cycle) return

    await updateCycle.mutateAsync({
      cycleId: cycle.id,
      input: {
        name: editName,
        description: editDescription || undefined,
        startDate: new Date(editStartDate).toISOString(),
        endDate: new Date(editEndDate).toISOString(),
        status: editStatus,
      },
    })
    setIsEditDialogOpen(false)
  }

  const handleDelete = async () => {
    await deleteCycle.mutateAsync({ cycleId, projectId })
    navigate({ to: '/projects/$projectId/cycles', params: { projectId } })
  }

  // Filter issues by search query
  const filteredIssues = issues.filter((issue) =>
    searchQuery
      ? issue.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  )

  if (isLoadingCycle) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="animate-spin size-6" />
      </div>
    )
  }

  if (!cycle) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Cycle not found</p>
        <Link
          to="/projects/$projectId/cycles"
          params={{ projectId }}
          className="text-primary hover:underline"
        >
          Back to cycles
        </Link>
      </div>
    )
  }

  const startDate = new Date(cycle.startDate)
  const endDate = new Date(cycle.endDate)
  const now = new Date()

  // Calculate cycle duration and days remaining
  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  )
  const daysRemaining = Math.max(
    0,
    Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  )

  const statusColorClasses = {
    active:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    upcoming:
      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    completed:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/projects/$projectId/cycles" params={{ projectId }}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4 mr-2" />
            Back to Cycles
          </Button>
        </Link>
      </div>

      {/* Cycle Overview */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{cycle.name}</h1>
            <span
              className={`px-2.5 py-0.5 rounded text-xs uppercase font-bold tracking-wider ${statusColorClasses[cycle.status]}`}
            >
              {cycle.status}
            </span>
          </div>
          {cycle.description && (
            <p className="text-muted-foreground max-w-2xl">
              {cycle.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-4" />
              {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
            </span>
            <span>
              {totalDays} days
              {cycle.status === 'active' && ` (${daysRemaining} remaining)`}
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={openEditDialog}>
              <Edit className="size-4 mr-2" />
              Edit Cycle
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="size-4 mr-2" />
              Delete Cycle
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Progress</CardDescription>
            <CardTitle className="text-2xl">{cycle.progress}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={cycle.progress} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <CircleDot className="size-3.5 text-slate-500" />
              Total Issues
            </CardDescription>
            <CardTitle className="text-2xl">{cycle.totalIssues}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Issues in this cycle
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-yellow-500" />
              In Progress
            </CardDescription>
            <CardTitle className="text-2xl">{cycle.inProgressIssues}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Being worked on</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-green-500" />
              Completed
            </CardDescription>
            <CardTitle className="text-2xl">{cycle.completedIssues}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Issues done</p>
          </CardContent>
        </Card>
      </div>

      {/* Issues Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Issues in Cycle</h2>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />

            <Link to="/create-issue" search={{ projectId }}>
              <Button size="sm">
                <Plus className="size-4 mr-2" />
                Add Issue
              </Button>
            </Link>
          </div>
        </div>

        {isLoadingIssues ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin size-6" />
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="border rounded-lg p-12 text-center">
            <p className="text-muted-foreground text-sm mb-4">
              {searchQuery
                ? 'No issues match your search'
                : 'No issues in this cycle yet'}
            </p>
            {!searchQuery && (
              <Link to="/create-issue" search={{ projectId }}>
                <Button variant="outline" size="sm">
                  <Plus className="size-4 mr-2" />
                  Add First Issue
                </Button>
              </Link>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <IssueTable
            issues={filteredIssues}
            workspaceSlug={projectId}
            selectedId={selectedIssueId}
            onSelectIssue={setSelectedIssueId}
          />
        ) : (
          <IssueBoard issues={filteredIssues} workspaceSlug={projectId} />
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Cycle</DialogTitle>
            <DialogDescription>Update the cycle details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Sprint 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={editStatus}
                onValueChange={(value: CycleStatus) => setEditStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editName || updateCycle.isPending}
            >
              {updateCycle.isPending ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cycle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{cycle.name}"? This action cannot
              be undone. Issues in this cycle will not be deleted, but they will
              be removed from the cycle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteCycle.isPending ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
