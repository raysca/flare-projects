import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

import { ProjectForm } from '@/components/projects/project-form'
import { useCreateProject } from '@/hooks/use-projects'
import type { CreateProjectInput } from '@/types/projects'

export const Route = createFileRoute('/projects/new')({
  component: NewProject,
})

function NewProject() {
  const navigate = useNavigate()

  const createProject = useCreateProject()

  const handleSubmit = async (input: CreateProjectInput) => {
    await createProject.mutateAsync(input)
    navigate({ to: '/projects' })
  }

  const handleCancel = () => {
    navigate({ to: '/projects' })
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Link
        to="/projects"
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
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={createProject.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )

