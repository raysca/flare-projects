import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { LayoutDashboard, Plus, Circle, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../../lib/api'

export const Route = createFileRoute('/workspace/$slug/')({
    component: WorkspaceIndex,
})

interface Issue {
    id: string
    title: string
    number: number
    status: string
    priority: string
    createdAt: string
}

interface Workspace {
    id: string
    name: string
    slug: string
    role: string
}

function WorkspaceIndex() {
    const { slug } = Route.useParams()
    const navigate = useNavigate()
    const [workspace, setWorkspace] = useState<Workspace | null>(null)
    const [issues, setIssues] = useState<Issue[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadData = async () => {
            try {
                // 1. Get workspace by slug
                const workspaces = await apiFetch<Workspace[]>('/workspaces')
                const found = workspaces.find((w) => w.slug === slug)

                if (found) {
                    setWorkspace(found)
                    // 2. Get issues
                    const issuesData = await apiFetch<Issue[]>(`/issues?workspaceId=${found.id}`)
                    setIssues(issuesData)
                }
            } catch (err) {
                console.error("Failed to load workspace data", err)
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [slug])

    if (isLoading) {
        return <div className="p-8">Loading...</div>
    }

    if (!workspace) {
        return <div className="p-8">Workspace not found</div>
    }

    if (issues.length === 0) {
        return (
            <div className="max-w-4xl mx-auto text-center py-20">
                <div className="inline-flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-6">
                    <LayoutDashboard className="w-12 h-12 text-slate-400" />
                </div>
                <h2 className="text-3xl font-bold mb-4">Welcome to {workspace.name}</h2>
                <p className="text-muted-foreground max-w-lg mx-auto mb-8">
                    You haven't created any issues yet. Get started by creating your first task, bug, or feature request.
                </p>
                <div className="flex justify-center gap-4">
                    {/* We'll link to a create page */}
                    <Link to="/workspace/$slug/create-issue" params={{ slug }}>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Issue
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'done': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'in_progress': return <Circle className="w-4 h-4 text-yellow-500" />; // Half circle ideally
            case 'todo': return <Circle className="w-4 h-4 text-slate-400" />;
            default: return <Circle className="w-4 h-4 text-slate-400" />;
        }
    }

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Issues</h2>
                <Link to="/workspace/$slug/create-issue" params={{ slug }}>
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        New Issue
                    </Button>
                </Link>
            </div>

            <div className="space-y-2">
                {issues.map((issue) => (
                    <Link key={issue.id} to="/workspace/$slug/issue/$issueId" params={{ slug, issueId: issue.id }}>
                        <Card className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                            <CardHeader className="p-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-muted-foreground font-mono text-sm">{workspace.slug.toUpperCase()}-{issue.number}</span>
                                    {getStatusIcon(issue.status)}
                                    <h3 className="font-medium text-sm text-foreground">{issue.title}</h3>
                                    <div className="ml-auto text-xs text-muted-foreground">
                                        {new Date(issue.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    )
}
