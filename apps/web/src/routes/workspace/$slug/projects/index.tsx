import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Network, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectCard } from '@/components/projects/project-card'
import { useProjects } from '@/hooks/use-projects'
import { useWorkspaceBySlug } from '@/hooks/use-workspace'
import type { ProjectStatus } from '@/types/projects'
import { PROJECT_STATUS_CONFIG } from '@/lib/project-utils'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/workspace/$slug/projects/')({
  component: ProjectsList,
})

function ProjectsList() {
  const { slug } = Route.useParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all')

  const { data: workspace, isLoading: isLoadingWorkspace } =
    useWorkspaceBySlug(slug)
  const { data: projects = [], isLoading: isLoadingProjects } = useProjects(
    workspace?.id
  )

  const isLoading = isLoadingWorkspace || isLoadingProjects

  // Filter projects
  const filteredProjects = projects.filter((project) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (
        !project.name.toLowerCase().includes(query) &&
        !project.identifier.toLowerCase().includes(query)
      ) {
        return false
      }
    }
    // Status filter
    if (statusFilter !== 'all' && project.status !== statusFilter) {
      return false
    }
    return true
  })

  // Group by status for display
  const activeProjects = filteredProjects.filter((p) => p.status === 'active')
  const plannedProjects = filteredProjects.filter((p) => p.status === 'planned')
  const pausedProjects = filteredProjects.filter((p) => p.status === 'paused')
  const completedProjects = filteredProjects.filter(
    (p) => p.status === 'completed'
  )
  const cancelledProjects = filteredProjects.filter(
    (p) => p.status === 'cancelled'
  )

  if (isLoading) {
    return <ProjectsListSkeleton />
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Network className="w-6 h-6" />
          Projects
        </h2>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Create button */}
          <Link to="/workspace/$slug/projects/new" params={{ slug }}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
        <Button
          variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setStatusFilter('all')}
        >
          All ({projects.length})
        </Button>
        {(
          ['active', 'planned', 'paused', 'completed', 'cancelled'] as const
        ).map((status) => {
          const count = projects.filter((p) => p.status === status).length
          const config = PROJECT_STATUS_CONFIG[status]
          const Icon = config.icon
          return (
            <Button
              key={status}
              variant={statusFilter === status ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-1.5"
              onClick={() => setStatusFilter(status)}
            >
              <Icon className={cn('size-3.5', config.color)} />
              {config.label} ({count})
            </Button>
          )
        })}
      </div>

      {/* Empty state */}
      {projects.length === 0 && !searchQuery ? (
        <div className="text-center py-20 bg-muted/30 rounded-lg border border-dashed">
          <div className="inline-flex items-center justify-center p-4 bg-muted rounded-full mb-6">
            <Network className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first project to organize issues and track progress.
          </p>
          <Link to="/workspace/$slug/projects/new" params={{ slug }}>
            <Button>Create Project</Button>
          </Link>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No projects match your search criteria.
        </div>
      ) : statusFilter === 'all' ? (
        /* Grouped view */
        <div className="space-y-8">
          {activeProjects.length > 0 && (
            <ProjectSection
              title="Active"
              projects={activeProjects}
              workspaceSlug={slug}
              dotColor="bg-blue-500"
            />
          )}
          {plannedProjects.length > 0 && (
            <ProjectSection
              title="Planned"
              projects={plannedProjects}
              workspaceSlug={slug}
              dotColor="bg-slate-500"
            />
          )}
          {pausedProjects.length > 0 && (
            <ProjectSection
              title="Paused"
              projects={pausedProjects}
              workspaceSlug={slug}
              dotColor="bg-yellow-500"
            />
          )}
          {completedProjects.length > 0 && (
            <ProjectSection
              title="Completed"
              projects={completedProjects}
              workspaceSlug={slug}
              dotColor="bg-green-500"
            />
          )}
          {cancelledProjects.length > 0 && (
            <ProjectSection
              title="Cancelled"
              projects={cancelledProjects}
              workspaceSlug={slug}
              dotColor="bg-red-500"
            />
          )}
        </div>
      ) : (
        /* Flat filtered view */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              workspaceSlug={slug}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectSection({
  title,
  projects,
  workspaceSlug,
  dotColor,
}: {
  title: string
  projects: { id: string; name: string; identifier: string; status: string; progress: number; targetDate?: string; workspaceId: string; lead?: { id: string; name: string; avatarUrl?: string } }[]
  workspaceSlug: string
  dotColor: string
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <span className={cn('w-2 h-2 rounded-full', dotColor)} />
        {title}
        <span className="text-muted-foreground font-normal">
          ({projects.length})
        </span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project as any}
            workspaceSlug={workspaceSlug}
          />
        ))}
      </div>
    </div>
  )
}

function ProjectsListSkeleton() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
