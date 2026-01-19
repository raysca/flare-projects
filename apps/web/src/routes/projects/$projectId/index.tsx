import { useState, useRef, useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Calendar,
  Pencil,
  Check,
  X,
  ListTodo,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectStatusSelect } from '@/components/projects/project-status-select'
import { ProjectLeadSelect } from '@/components/projects/project-lead-select'
import { StatusSelect } from '@/components/issues/status-select'
import { useProject, useUpdateProject, useProjectIssues } from '@/hooks/use-projects'
import {
  getProgressColor,
  formatTargetDate,
} from '@/lib/project-utils'
import { getInitials } from '@/lib/issue-utils'
import { cn } from '@/lib/utils'
import type { ProjectStatus } from '@/types/projects'

export const Route = createFileRoute('/projects/$projectId/')({
  component: ProjectDetail,
})

function ProjectDetail() {
  const { projectId } = Route.useParams()

  // Queries
  const { data: project, isLoading: isLoadingProject } = useProject(projectId)
  const { data: issues = [], isLoading: isLoadingIssues } =
    useProjectIssues(projectId)

  // Mutations
  const updateProject = useUpdateProject()

  // Editing states
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedDescription, setEditedDescription] = useState('')

  const nameInputRef = useRef<HTMLInputElement>(null)

  // Focus name input when editing
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [isEditingName])

  const isLoading = isLoadingProject

  if (isLoading) {
    return <ProjectDetailSkeleton />
  }

  if (!project) {
    return (
      <div className="max-w-5xl mx-auto py-6">
        <Link
          to="/projects"
          className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
        </Link>
        <p className="text-muted-foreground">Project not found</p>
      </div>
    )
  }

  const handleNameSave = async () => {
    if (editedName.trim() && editedName !== project.name) {
      await updateProject.mutateAsync({
        projectId: project.id,
        input: { name: editedName.trim() },
      })
    }
    setIsEditingName(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave()
    } else if (e.key === 'Escape') {
      setIsEditingName(false)
      setEditedName(project.name)
    }
  }

  const handleDescriptionSave = async () => {
    if (editedDescription !== (project.description ?? '')) {
      await updateProject.mutateAsync({
        projectId: project.id,
        input: { description: editedDescription },
      })
    }
    setIsEditingDescription(false)
  }

  const handleStatusChange = async (status: ProjectStatus) => {
    await updateProject.mutateAsync({
      projectId: project.id,
      input: { status },
    })
  }

  const handleLeadChange = async (leadId: string | undefined) => {
    await updateProject.mutateAsync({
      projectId: project.id,
      input: { leadId: leadId ?? null },
    })
  }

  const handleProgressChange = async (progress: number) => {
    await updateProject.mutateAsync({
      projectId: project.id,
      input: { progress },
    })
  }

  // Calculate issue stats
  const totalIssues = issues.length
  const completedIssues = issues.filter(
    (i) => i.status === 'done' || i.status === 'cancelled'
  ).length
  const inProgressIssues = issues.filter(
    (i) => i.status === 'in_progress' || i.status === 'in_review'
  ).length

  return (
    <div className="max-w-5xl mx-auto py-6">
      <Link
        to="/projects"
        className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-muted-foreground text-sm font-mono">
              <span>{project.identifier}</span>
              <span>·</span>
              <span>
                Created {new Date(project.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Editable Name */}
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  ref={nameInputRef}
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  onBlur={handleNameSave}
                  className="text-2xl font-bold h-auto py-1"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleNameSave}
                  className="shrink-0"
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditingName(false)
                    setEditedName(project.name)
                  }}
                  className="shrink-0"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <h1
                className="text-3xl font-bold text-foreground cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1 group flex items-center gap-2"
                onClick={() => {
                  setEditedName(project.name)
                  setIsEditingName(true)
                }}
              >
                {project.name}
                <Pencil className="size-4 opacity-0 group-hover:opacity-50" />
              </h1>
            )}
          </div>

          {/* Description */}
          <div className="pb-8 border-b border-border">
            {isEditingDescription ? (
              <div className="space-y-2">
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  placeholder="Add a description..."
                  className="min-h-[120px]"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsEditingDescription(false)
                      setEditedDescription(project.description ?? '')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDescriptionSave}
                    disabled={updateProject.isPending}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="group cursor-pointer hover:bg-accent/30 rounded-lg p-2 -m-2 min-h-[100px]"
                onClick={() => {
                  setEditedDescription(project.description ?? '')
                  setIsEditingDescription(true)
                }}
              >
                {project.description ? (
                  <p className="text-foreground whitespace-pre-wrap">
                    {project.description}
                  </p>
                ) : (
                  <p className="text-muted-foreground italic">
                    No description provided. Click to add one.
                  </p>
                )}
                <div className="flex justify-end opacity-0 group-hover:opacity-100 mt-2">
                  <Button size="sm" variant="ghost">
                    <Pencil className="size-4 mr-1" /> Edit
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Issues Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ListTodo className="w-5 h-5" />
              Issues
              {totalIssues > 0 && (
                <span className="text-muted-foreground font-normal">
                  ({totalIssues})
                </span>
              )}
            </h3>

            {isLoadingIssues ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : issues.length === 0 ? (
              <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed">
                <p className="text-muted-foreground mb-4">
                  No issues assigned to this project yet.
                </p>
                <Link
                  to="/create-issue"
                  search={{ projectId: project.id }}
                >
                  <Button variant="outline" size="sm">
                    Create Issue
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="border rounded-lg divide-y">
                {issues.slice(0, 10).map((issue) => (
                  <Link
                    key={issue.id}
                    to="/issue/$issueId"
                    params={{ issueId: issue.id }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
                  >
                    <StatusSelect
                      value={issue.status}
                      onValueChange={() => {
                        // Status changes are handled on the issue detail page
                      }}
                      size="sm"
                      disabled
                    />
                    <span className="text-sm font-mono text-muted-foreground">
                      {project.identifier}-{issue.number}
                    </span>
                    <span className="text-sm truncate flex-1">
                      {issue.title}
                    </span>
                    {issue.assignee && (
                      <Avatar className="size-5">
                        <AvatarImage src={issue.assignee.avatarUrl} />
                        <AvatarFallback className="text-[9px]">
                          {getInitials(issue.assignee.name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </Link>
                ))}
                {issues.length > 10 && (
                  <div className="px-4 py-2 text-center text-sm text-muted-foreground">
                    And {issues.length - 10} more issues...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Project Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 items-center gap-2 text-sm">
                <span className="text-muted-foreground">Status</span>
                <div className="col-span-2">
                  <ProjectStatusSelect
                    value={project.status}
                    onValueChange={handleStatusChange}
                    size="sm"
                    disabled={updateProject.isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-2 text-sm">
                <span className="text-muted-foreground">Lead</span>
                <div className="col-span-2">
                  <ProjectLeadSelect
                    value={project.lead?.id}
                    onValueChange={handleLeadChange}
                    size="sm"
                    disabled={updateProject.isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 items-start gap-2 text-sm">
                <span className="text-muted-foreground">Progress</span>
                <div className="col-span-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={project.progress}
                      onChange={(e) =>
                        handleProgressChange(parseInt(e.target.value))
                      }
                      className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-xs w-8 text-right">
                      {project.progress}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        getProgressColor(project.status, project.progress)
                      )}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {project.startDate && (
                <div className="grid grid-cols-3 items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Start</span>
                  <div className="col-span-2 flex items-center gap-2">
                    <Calendar className="size-4 text-muted-foreground" />
                    {new Date(project.startDate).toLocaleDateString()}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 items-center gap-2 text-sm">
                <span className="text-muted-foreground">Target</span>
                <div className="col-span-2 flex items-center gap-2">
                  <Target className="size-4 text-muted-foreground" />
                  {formatTargetDate(project.targetDate)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Issue Stats Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Issue Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">{totalIssues}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">In Progress</span>
                <span className="font-medium text-yellow-600">
                  {inProgressIssues}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium text-green-600">
                  {completedIssues}
                </span>
              </div>
              {totalIssues > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Completion</span>
                    <span>
                      {Math.round((completedIssues / totalIssues) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{
                        width: `${(completedIssues / totalIssues) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ProjectDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto py-6">
      <Link
        to="/projects"
        className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-3/4" />
          </div>
          <Skeleton className="h-40 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
        <div>
          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-32" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
