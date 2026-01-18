import { Button } from '../../../../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Network, Plus, Calendar, BarChart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../../../lib/api'

export const Route = createFileRoute('/workspace/$slug/projects/')({
  component: ProjectsList,
})

interface Project {
  id: string
  name: string
  identifier: string
  status: string
  progress: number
  targetDate?: string
  lead?: {
    name: string
    avatarUrl?: string
  }
}

interface Workspace {
  id: string
}

function ProjectsList() {
  const { slug } = Route.useParams()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const workspaces = await apiFetch<any[]>('/workspaces')
        const found = workspaces.find((w) => w.slug === slug)
        if (found) {
          setWorkspace(found)
          const projectsData = await apiFetch<Project[]>(`/projects?workspaceId=${found.id}`)
          setProjects(projectsData)
        }
      } catch (err) {
        console.error("Failed to load projects", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [slug])

  if (isLoading) return <div className="p-8">Loading...</div>

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Network className="w-6 h-6" />
          Projects
        </h2>
        <Link to="/workspace/$slug/projects/new" params={{ slug }}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-medium mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-6">Create your first project to organize issues.</p>
          <Link to="/workspace/$slug/projects/new" params={{ slug }}>
            <Button variant="outline">Create Project</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <Link key={project.id} to="/workspace/$slug/projects/$projectId" params={{ slug, projectId: project.id }}>
              <Card className="hover:border-blue-500 transition-colors cursor-pointer h-full group">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg mb-3">
                      {project.identifier.substring(0, 1)}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${project.status === 'completed' ? 'bg-green-100 text-green-700' :
                        project.status === 'active' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                      }`}>
                      {project.status}
                    </span>
                  </div>
                  <CardTitle className="leading-tight group-hover:text-blue-600 transition-colors">
                    {project.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground flex items-center gap-4">
                      <span className="font-mono text-xs">{project.identifier}</span>
                      {project.targetDate && (
                        <span className="flex items-center gap-1 text-xs">
                          <Calendar className="w-3 h-3" />
                          {new Date(project.targetDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    {project.lead && (
                      <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold">
                          {project.lead.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span>Led by {project.lead.name}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
