import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { IssueForm } from '@/components/issues/issue-form'
import { useCreateIssue } from '@/hooks/use-issues'
import { useProjects } from '@/hooks/use-projects'
import type { CreateIssueInput } from '@/types/issues'

export const Route = createFileRoute('/_layout/create-issue')({
  component: CreateIssue,
})

function CreateIssue() {
  const navigate = useNavigate()

  // Queries
  const { data: projectList = [], isLoading: isLoadingProjects } = useProjects()

  // We should ideally fetch members/labels/cycles here but they might be project-specific.
  // For now, let's fetch GLOBAL users (or just me?) for assignee.
  // And fetch GLOBAL labels? Or we need to fetch labels for selected project?
  // Since IssueForm handles project selection internally (or we pass list), fetching project-specific data
  // inside CreateIssue is hard unless we lift state.

  // If we want IssueForm to be generic, it should probably be able to handle fetching or we pass "loadProjectData" callback?
  // Or: CreateIssue creates issue, but IssueForm needs to switch resources on project change.
  // Let's keep it simple: Pass ALL users and ALL labels (if global or manageable).
  // But wait, labels are workspace specific (now project specific?).

  // Let's fetch global users for now.
  // Labels... maybe we can leave empty or fetch global labels if they exist.
  // Cycles... need projectId.

  // Refactor needed: IssueForm should take `projectId` and `onProjectIdChange` so parent can fetch data.
  // But IssueForm was managing it. I'll stick to basic implementation: Create Issue with minimal deps.
  // Labels/Cycles/Assignees might need improvement later.

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

  // Temporary: Empty arrays for members/labels/cycles until we implement dynamic fetching or global store.
  // We can fetch members via useUsers() (global).
  // Cycles/Labels require projectId.

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
            members={[]} // To be implemented: Fetch users
            labels={[]} // To be implemented: Fetch labels for selected project
            cycles={[]} // To be implemented: Fetch cycles for selected project
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={createIssue.isPending}
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
