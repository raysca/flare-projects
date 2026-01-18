// ... imports
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../../lib/api'

export const Route = createFileRoute('/workspace/$slug/create-issue')({
  component: CreateIssue,
})

interface Workspace {
  id: string
  name: string
  slug: string
}

interface Team {
  id: string
  name: string
  identifier: string
}

interface Project {
  id: string
  name: string
  identifier: string
}

function CreateIssue() {
  const { slug } = Route.useParams()
  const navigate = useNavigate()

  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('backlog')
  const [priority, setPriority] = useState('no_priority')
  const [teamId, setTeamId] = useState('')
  const [projectId, setProjectId] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Get workspace
        const workspaces = await apiFetch<Workspace[]>('/workspaces')
        const found = workspaces.find((w) => w.slug === slug)

        if (found) {
          setWorkspace(found)
          // 2. Get teams & projects in parallel
          const [teamsData, projectsData] = await Promise.all([
            apiFetch<Team[]>(`/workspaces/${found.id}/teams`),
            apiFetch<Project[]>(`/projects?workspaceId=${found.id}`)
          ])

          setTeams(teamsData)
          setProjects(projectsData)

          // Auto-select first team
          if (teamsData.length > 0) {
            setTeamId(teamsData[0].id)
          }
        }
      } catch (err) {
        console.error("Failed to load data", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspace) return
    if (!teamId) {
      setError('Please select a team. If none exist, create one in settings.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await apiFetch('/issues', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId: workspace.id,
          teamId,
          projectId: projectId || undefined,
          title,
          description,
          status,
          priority
        })
      })

      // Navigate back to issue list
      navigate({ to: '/workspace/$slug', params: { slug } })
    } catch (err: any) {
      setError(err.message || 'Failed to create issue')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="p-8">Loading...</div>
  if (!workspace) return <div className="p-8">Workspace not found</div>

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Link to="/workspace/$slug" params={{ slug }} className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Issues
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create New Issue</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="team">Team</Label>
                <select
                  id="team"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  required
                >
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.identifier})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Project (Optional)</Label>
                <select
                  id="project"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">No Project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.identifier})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Issue title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Add a description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="backlog">Backlog</option>
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="no_priority">No Priority</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <Link to="/workspace/$slug" params={{ slug }}>
                <Button type="button" variant="ghost">Cancel</Button>
              </Link>
              <Button type="submit" disabled={isSubmitting || teams.length === 0}>
                {isSubmitting ? 'Creating...' : 'Create Issue'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
