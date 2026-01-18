import { Button } from '../../../../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../../../lib/api'

// Force rebuild 2
export const Route = createFileRoute('/workspace/$slug/projects/new')({
  component: NewProject,
})

function NewProject() {
  const { slug } = Route.useParams()
  const navigate = useNavigate()

  const [workspace, setWorkspace] = useState<any>(null)
  const [name, setName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [description, setDescription] = useState('')
  const [targetDate, setTargetDate] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        const workspaces = await apiFetch<any[]>('/workspaces')
        const found = workspaces.find((w) => w.slug === slug)
        if (found) setWorkspace(found)
      } catch (e) { console.error(e) } finally { setIsLoading(false) }
    }
    loadWorkspace()
  }, [slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspace) return

    setIsSubmitting(true)
    try {
      await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId: workspace.id,
          name,
          identifier: identifier.toUpperCase(),
          description,
          targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
          status: 'planned'
        })
      })
      navigate({ to: '/workspace/$slug/projects', params: { slug } })
    } catch (err) {
      console.error(err)
      alert('Failed to create project')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="p-8">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Link to="/workspace/$slug/projects" params={{ slug }} className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create New Project</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="e.g. Q1 Roadmap"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="identifier">Identifier (3-5 chars)</Label>
              <Input
                id="identifier"
                placeholder="e.g. ROAD"
                maxLength={5}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
                required
              />
              <p className="text-xs text-muted-foreground">Used for project IDs (e.g. ROAD-1)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Describe the project goals..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetDate">Target Date</Label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
