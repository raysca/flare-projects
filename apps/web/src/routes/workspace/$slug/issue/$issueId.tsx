import { Button } from '../../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Clock, Calendar, Hash, User, MessageSquare, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../../../lib/api'

export const Route = createFileRoute('/workspace/$slug/issue/$issueId')({
    component: IssueDetail,
})

interface User {
    id: string
    name: string
    avatarUrl?: string
    email: string
}

interface Label {
    id: string
    name: string
    color: string
}

interface Issue {
    id: string
    number: number
    title: string
    description: string
    status: string
    priority: string
    createdAt: string
    updatedAt: string
    workspaceId: string
    assignee?: User
    reporter?: User
    project?: {
        id: string
        name: string
        identifier: string
    }
    labels?: Label[]
}

interface Comment {
    id: string
    body: string
    createdAt: string
    user: User
}

function IssueDetail() {
    const { slug, issueId } = Route.useParams()
    const navigate = useNavigate()

    const [issue, setIssue] = useState<Issue | null>(null)
    const [comments, setComments] = useState<Comment[]>([])
    const [newComment, setNewComment] = useState('')

    const [isLoading, setIsLoading] = useState(true)
    const [isSubmittingComment, setIsSubmittingComment] = useState(false)

    // Fetch data
    useEffect(() => {
        const loadData = async () => {
            try {
                const [issueData, commentsData] = await Promise.all([
                    apiFetch<Issue>(`/issues/${issueId}`),
                    apiFetch<Comment[]>(`/issues/${issueId}/comments`)
                ]);
                setIssue(issueData)
                setComments(commentsData)
            } catch (err) {
                console.error("Failed to load issue", err)
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [issueId])

    const handleCreateComment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newComment.trim()) return

        setIsSubmittingComment(true)
        try {
            const created = await apiFetch<Comment>(`/issues/${issueId}/comments`, {
                method: 'POST',
                body: JSON.stringify({ body: newComment })
            })
            setComments([created, ...comments])
            setNewComment('')
        } catch (err) {
            console.error("Failed to create comment", err)
        } finally {
            setIsSubmittingComment(false)
        }
    }

    if (isLoading) return <div className="p-8">Loading...</div>
    if (!issue) return <div className="p-8">Issue not found</div>

    return (
        <div className="max-w-5xl mx-auto py-6">
            <Link to="/workspace/$slug" params={{ slug }} className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Issues
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Header */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-muted-foreground text-sm font-mono">
                            <span>{slug.toUpperCase()}-{issue.number}</span>
                            <span>•</span>
                            <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h1 className="text-3xl font-bold text-foreground">{issue.title}</h1>
                    </div>

                    {/* Description */}
                    <div className="prose dark:prose-invert max-w-none pb-8 border-b border-border">
                        <p className="whitespace-pre-wrap">{issue.description || "No description provided."}</p>
                    </div>

                    {/* Comments */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" />
                            Activity
                        </h3>

                        <form onSubmit={handleCreateComment} className="mb-8">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                    ME
                                </div>
                                <div className="flex-1 space-y-2">
                                    <textarea
                                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Leave a comment..."
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                    />
                                    <div className="flex justify-end">
                                        <Button type="submit" size="sm" disabled={isSubmittingComment || !newComment.trim()}>
                                            {isSubmittingComment ? 'Posting...' : 'Comment'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </form>

                        <div className="space-y-6">
                            {comments.map((comment) => (
                                <div key={comment.id} className="flex gap-4 group">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold overflow-hidden">
                                        {comment.user.avatarUrl ? (
                                            <img src={comment.user.avatarUrl} alt={comment.user.name} />
                                        ) : (
                                            comment.user.name.substring(0, 2).toUpperCase()
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-sm">{comment.user.name}</span>
                                            <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div className="text-sm prose dark:prose-invert">
                                            <p>{comment.body}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {comments.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    No comments yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Status</span>
                                <div className="col-span-2">
                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium capitalize">
                                        {issue.status.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Priority</span>
                                <div className="col-span-2">
                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium capitalize">
                                        {issue.priority.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Assignee</span>
                                <div className="col-span-2 flex items-center gap-2">
                                    {issue.assignee ? (
                                        <>
                                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">
                                                {issue.assignee.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span>{issue.assignee.name}</span>
                                        </>
                                    ) : (
                                        <span className="text-muted-foreground italic">Unassigned</span>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Reporter</span>
                                <div className="col-span-2 flex items-center gap-2">
                                    {issue.reporter ? (
                                        <>
                                            <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px]">
                                                {issue.reporter.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span>{issue.reporter.name}</span>
                                        </>
                                    ) : (
                                        <span>Unknown</span>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Project</span>
                                <div className="col-span-2 flex items-center gap-2">
                                    {issue.project ? (
                                        <Link
                                            to="/workspace/$slug/projects/$projectId"
                                            params={{ slug, projectId: issue.project.id }}
                                            className="flex items-center gap-2 hover:underline decoration-blue-500 underline-offset-4"
                                        >
                                            <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center text-[10px] border border-blue-200">
                                                {issue.project.identifier.substring(0, 1)}
                                            </div>
                                            <span>{issue.project.name}</span>
                                        </Link>
                                    ) : (
                                        <span className="text-muted-foreground italic">None</span>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
