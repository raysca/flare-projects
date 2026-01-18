import { Button } from '../../../../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Calendar, BarChart, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../../../lib/api'

export const Route = createFileRoute('/workspace/$slug/projects/$projectId')({
    component: ProjectDetail,
})

function ProjectDetail() {
    const { slug, projectId } = Route.useParams()
    const [project, setProject] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadProject = async () => {
            try {
                const data = await apiFetch(`/projects/${projectId}`)
                setProject(data)
            } catch (e) { console.error(e) } finally { setIsLoading(false) }
        }
        loadProject()
    }, [projectId])

    if (isLoading) return <div className="p-8">Loading...</div>
    if (!project) return <div className="p-8">Project not found</div>

    return (
        <div className="max-w-5xl mx-auto py-8">
            <Link to="/workspace/$slug/projects" params={{ slug }} className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="text-sm font-mono text-muted-foreground mb-2">{project.identifier}</div>
                            <h1 className="text-3xl font-bold">{project.name}</h1>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${project.status === 'completed' ? 'bg-green-100 text-green-700' :
                                project.status === 'active' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-600'
                            }`}>
                            {project.status}
                        </span>
                    </div>

                    <div className="prose dark:prose-invert">
                        <p>{project.description || "No description provided."}</p>
                    </div>

                    {/* TODO: List issues associated with this project */}
                    <div className="border rounded-lg p-8 text-center bg-slate-50 dark:bg-slate-800/50 border-dashed">
                        <p className="text-muted-foreground">Issues view coming soon in M2.5</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm text-muted-foreground">Project Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Progress</span>
                                    <span>{project.progress}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                        style={{ width: `${project.progress}%` }}
                                    />
                                </div>
                            </div>

                            {project.targetDate && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <span>Target: {new Date(project.targetDate).toLocaleDateString()}</span>
                                </div>
                            )}

                            {project.lead && (
                                <div className="flex items-center gap-2 text-sm pt-2 border-t mt-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">
                                        {project.lead.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span>{project.lead.name}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
