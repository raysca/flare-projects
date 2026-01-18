import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { IssueForm } from '@/components/issues/issue-form'
import { useCreateIssue } from '@/hooks/use-issues'
import {
  useWorkspaceBySlug,
  useWorkspaceTeams,
  useWorkspaceProjects,
  useWorkspaceMembers,
  useWorkspaceLabels,
} from '@/hooks/use-workspace'
import type { CreateIssueInput } from '@/types/issues'

export const Route = createFileRoute('/workspace/$slug/create-issue')({
  component: CreateIssue,
})

function CreateIssue() {
  const { slug } = Route.useParams()
  const navigate = useNavigate()

  // Queries
  const { data: workspace, isLoading: isLoadingWorkspace } =
    useWorkspaceBySlug(slug)
  const { data: teams = [], isLoading: isLoadingTeams } = useWorkspaceTeams(
    workspace?.id
  )
  const { data: projects = [], isLoading: isLoadingProjects } =
    useWorkspaceProjects(workspace?.id)
  const { data: members = [], isLoading: isLoadingMembers } =
    useWorkspaceMembers(workspace?.id)
  const { data: labels = [], isLoading: isLoadingLabels } = useWorkspaceLabels(
    workspace?.id
  )

  // Mutation
  const createIssue = useCreateIssue()

  const isLoading =
    isLoadingWorkspace ||
    isLoadingTeams ||
    isLoadingProjects ||
    isLoadingMembers ||
    isLoadingLabels

  const handleSubmit = async (input: CreateIssueInput) => {
    await createIssue.mutateAsync(input)
    navigate({ to: '/workspace/$slug', params: { slug } })
  }

  const handleCancel = () => {
    navigate({ to: '/workspace/$slug', params: { slug } })
  }

  if (isLoading) {
    return <CreateIssueSkeleton slug={slug} />
  }

  if (!workspace) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Link
          to="/workspace/$slug"
          params={{ slug }}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Issues
        </Link>
        <p className="text-muted-foreground">Workspace not found</p>
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Link
          to="/workspace/$slug"
          params={{ slug }}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Issues
        </Link>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              You need to create a team before you can create issues.
            </p>
            <Link
              to="/workspace/$slug/settings"
              params={{ slug }}
              className="text-primary hover:underline"
            >
              Go to Settings to create a team
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Link
        to="/workspace/$slug"
        params={{ slug }}
        className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Issues
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create New Issue</CardTitle>
        </CardHeader>
        <CardContent>
          <IssueForm
            workspaceId={workspace.id}
            teams={teams}
            projects={projects}
            members={members}
            labels={labels}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={createIssue.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function CreateIssueSkeleton({ slug }: { slug: string }) {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <Link
        to="/workspace/$slug"
        params={{ slug }}
        className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Issues
      </Link>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-40 w-full" />
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
