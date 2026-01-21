import { useState, useEffect } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { IssueForm } from '@/components/issues/issue-form'
import { useCreateIssue } from '@/hooks/use-issues'
import { useProjects, useProjectMembers } from '@/hooks/use-projects'
import { useProjectCycles } from '@/hooks/use-cycles'
import { useProjectLabels } from '@/hooks/use-labels'
import type { CreateIssueInput } from '@/types/issues'

interface CreateIssueSearch {
  projectId?: string
}

export const Route = createFileRoute('/_layout/create-issue')({
  component: CreateIssue,
  validateSearch: (search: Record<string, unknown>): CreateIssueSearch => {
    return {
      projectId: search.projectId as string | undefined,
    }
  },
})

function CreateIssue() {
  const navigate = useNavigate()
  const search = Route.useSearch()

  // Queries
  const { data: projectList = [], isLoading: isLoadingProjects } = useProjects()

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    search.projectId ?? '',
  )

  // Sync selectedProjectId with projectList if empty
  useEffect(() => {
    if (!selectedProjectId && projectList.length > 0) {
      setSelectedProjectId(projectList[0].id)
    }
  }, [projectList, selectedProjectId])

  const { data: members = [] } = useProjectMembers(selectedProjectId)
  const { data: cycles = [] } = useProjectCycles(selectedProjectId)
  const { data: labels = [] } = useProjectLabels(selectedProjectId)

  const createIssue = useCreateIssue()

  const handleSubmit = async (input: CreateIssueInput) => {
    await createIssue.mutateAsync(input)
    navigate({ to: '/' })
  }

  const handleCancel = () => {
    navigate({ to: '/' })
  }

  if (isLoadingProjects) {
    return <CreateIssueSkeleton />
  }

  if (projectList.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Link
          to="/"
          className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Issues
        </Link>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              You need to create a project first.
            </p>
            <Link to="/projects/new" className="text-primary hover:underline">
              Create a Project
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Link
        to="/"
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
            projects={projectList}
            members={members.map((m) => ({
              id: m.userId,
              name: m.name,
              email: m.email,
              avatarUrl: m.avatarUrl,
            }))}
            labels={labels}
            cycles={cycles}
            projectId={selectedProjectId}
            onProjectChange={setSelectedProjectId}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={createIssue.isPending}
            initialValues={{ projectId: selectedProjectId }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function CreateIssueSkeleton() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <Link
        to="/"
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
