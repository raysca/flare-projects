import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectForm } from '@/components/projects/project-form'
import { useCreateProject } from '@/hooks/use-projects'
import { useWorkspaceBySlug, useWorkspaceMembers } from '@/hooks/use-workspace'
import type { CreateProjectInput } from '@/types/projects'

export const Route = createFileRoute('/workspace/$slug/projects/new')({
  component: NewProject,
})

function NewProject() {
  const { slug } = Route.useParams()
  const navigate = useNavigate()

  const { data: workspace, isLoading: isLoadingWorkspace } =
    useWorkspaceBySlug(slug)
  const { data: members = [], isLoading: isLoadingMembers } =
    useWorkspaceMembers(workspace?.id)

  const createProject = useCreateProject()

  const isLoading = isLoadingWorkspace || isLoadingMembers

  const handleSubmit = async (input: CreateProjectInput) => {
    await createProject.mutateAsync(input)
    navigate({ to: '/workspace/$slug/projects', params: { slug } })
  }

  const handleCancel = () => {
    navigate({ to: '/workspace/$slug/projects', params: { slug } })
  }

  if (isLoading) {
    return <NewProjectSkeleton slug={slug} />
  }

  if (!workspace) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Link
          to="/workspace/$slug/projects"
          params={{ slug }}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
        </Link>
        <p className="text-muted-foreground">Workspace not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Link
        to="/workspace/$slug/projects"
        params={{ slug }}
        className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create New Project</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectForm
            workspaceId={workspace.id}
            members={members}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={createProject.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function NewProjectSkeleton({ slug }: { slug: string }) {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <Link
        to="/workspace/$slug/projects"
        params={{ slug }}
        className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
      </Link>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex justify-end gap-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-28" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
