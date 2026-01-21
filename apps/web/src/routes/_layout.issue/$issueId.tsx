import { useState, useRef, useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  MessageSquare,
  Pencil,
  Check,
  X,
  Repeat,
  Network,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { StatusSelect } from '@/components/issues/status-select'
import { PrioritySelect } from '@/components/issues/priority-select'
import { AssigneeSelect } from '@/components/issues/assignee-select'
import {
  useIssue,
  useIssueComments,
  useUpdateIssue,
  useCreateComment,
} from '@/hooks/use-issues'
import { useUsers } from '@/hooks/use-users'
import { useIssueSocket } from '@/hooks/use-issue-socket'
import { getInitials } from '@/lib/issue-utils'
import type { IssueStatus, IssuePriority } from '@/types/issues'

export const Route = createFileRoute('/_layout/issue/$issueId')({
  component: IssueDetail,
})

function IssueDetail() {
  const { issueId } = Route.useParams()

  // Enable real-time updates
  useIssueSocket(issueId)

  // Queries
  const { data: issue, isLoading: isLoadingIssue } = useIssue(issueId)
  const { data: comments = [], isLoading: isLoadingComments } =
    useIssueComments(issueId)
  const { data: users = [] } = useUsers()

  // Mutations
  const updateIssue = useUpdateIssue()
  const createComment = useCreateComment()

  // Local state for editing
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedDescription, setEditedDescription] = useState('')
  const [newComment, setNewComment] = useState('')

  const titleInputRef = useRef<HTMLInputElement>(null)

  // Focus title input when editing
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  if (isLoadingIssue) {
    return <IssueDetailSkeleton />
  }

  if (!issue) {
    return (
      <div className="max-w-5xl mx-auto py-6">
        <Link
          to="/"
          className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Issues
        </Link>
        <p className="text-muted-foreground">Issue not found</p>
      </div>
    )
  }

  const handleTitleSave = async () => {
    if (editedTitle.trim() && editedTitle !== issue.title) {
      await updateIssue.mutateAsync({
        issueId: issue.id,
        input: { title: editedTitle.trim() },
      })
    }
    setIsEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave()
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false)
      setEditedTitle(issue.title)
    }
  }

  const handleDescriptionSave = async () => {
    if (editedDescription !== (issue.description ?? '')) {
      await updateIssue.mutateAsync({
        issueId: issue.id,
        input: { description: editedDescription },
      })
    }
    setIsEditingDescription(false)
  }

  const handleStatusChange = async (status: IssueStatus) => {
    await updateIssue.mutateAsync({
      issueId: issue.id,
      input: { status },
    })
  }

  const handlePriorityChange = async (priority: IssuePriority) => {
    await updateIssue.mutateAsync({
      issueId: issue.id,
      input: { priority },
    })
  }

  const handleAssigneeChange = async (assigneeId: string | undefined) => {
    await updateIssue.mutateAsync({
      issueId: issue.id,
      input: { assigneeId: assigneeId ?? null },
    })
  }

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    await createComment.mutateAsync({
      issueId: issue.id,
      body: newComment.trim(),
    })
    setNewComment('')
  }

  // Format issue identifier
  const issueIdentifier = issue.project
    ? `${issue.project.identifier}-${issue.number}`
    : `#${issue.number}`

  return (
    <div className="max-w-5xl mx-auto py-6">
      <Link
        to="/"
        className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Issues
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-muted-foreground text-sm font-mono">
              <span>{issueIdentifier}</span>
              <span>·</span>
              <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
            </div>

            {/* Editable Title */}
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  ref={titleInputRef}
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  onBlur={handleTitleSave}
                  className="text-2xl font-bold h-auto py-1"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleTitleSave}
                  className="shrink-0"
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditingTitle(false)
                    setEditedTitle(issue.title)
                  }}
                  className="shrink-0"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <h1
                className="text-3xl font-bold text-foreground cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1 group flex items-center gap-2"
                onClick={() => {
                  setEditedTitle(issue.title)
                  setIsEditingTitle(true)
                }}
              >
                {issue.title}
                <Pencil className="size-4 opacity-0 group-hover:opacity-50" />
              </h1>
            )}
          </div>

          {/* Description */}
          <div className="pb-8 border-b border-border">
            {isEditingDescription ? (
              <div className="space-y-2">
                <RichTextEditor
                  content={editedDescription}
                  onChange={setEditedDescription}
                  placeholder="Add a description..."
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsEditingDescription(false)
                      setEditedDescription(issue.description ?? '')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDescriptionSave}
                    disabled={updateIssue.isPending}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="group cursor-pointer hover:bg-accent/30 rounded-lg p-2 -m-2 min-h-[100px]"
                onClick={() => {
                  setEditedDescription(issue.description ?? '')
                  setIsEditingDescription(true)
                }}
              >
                {issue.description ? (
                  <RichTextEditor content={issue.description} readOnly />
                ) : (
                  <p className="text-muted-foreground italic">
                    No description provided. Click to add one.
                  </p>
                )}
                <div className="flex justify-end opacity-0 group-hover:opacity-100 mt-2">
                  <Button size="sm" variant="ghost">
                    <Pencil className="size-4 mr-1" /> Edit
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Comments */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Activity
            </h3>

            <form onSubmit={handleCreateComment} className="mb-8">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                  ME
                </div>
                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="Leave a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={createComment.isPending || !newComment.trim()}
                    >
                      {createComment.isPending ? 'Posting...' : 'Comment'}
                    </Button>
                  </div>
                </div>
              </div>
            </form>

            <div className="space-y-6">
              {isLoadingComments ? (
                <CommentsSkeleton />
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No comments yet.
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-4 group">
                    <Avatar className="size-8 shrink-0">
                      <AvatarImage src={comment.user.avatarUrl} />
                      <AvatarFallback className="text-xs">
                        {getInitials(comment.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          {comment.user.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm prose dark:prose-invert">
                        <p>{comment.body}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 items-center gap-2 text-sm">
                <span className="text-muted-foreground">Status</span>
                <div className="col-span-2">
                  <StatusSelect
                    value={issue.status}
                    onValueChange={handleStatusChange}
                    size="sm"
                    disabled={updateIssue.isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-2 text-sm">
                <span className="text-muted-foreground">Priority</span>
                <div className="col-span-2">
                  <PrioritySelect
                    value={issue.priority}
                    onValueChange={handlePriorityChange}
                    size="sm"
                    disabled={updateIssue.isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-2 text-sm">
                <span className="text-muted-foreground">Assignee</span>
                <div className="col-span-2">
                  <AssigneeSelect
                    value={issue.assigneeId}
                    onValueChange={handleAssigneeChange}
                    members={users}
                    size="sm"
                    disabled={updateIssue.isPending}
                  />
                </div>
              </div>

              {issue.labels && issue.labels.length > 0 && (
                <div className="grid grid-cols-3 items-start gap-2 text-sm">
                  <span className="text-muted-foreground">Labels</span>
                  <div className="col-span-2 flex flex-wrap gap-1">
                    {issue.labels.map((label) => (
                      <span
                        key={label.id}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: `${label.color}20`,
                          color: label.color,
                        }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 items-center gap-2 text-sm">
                <span className="text-muted-foreground">Reporter</span>
                <div className="col-span-2 flex items-center gap-2">
                  {issue.reporter ? (
                    <>
                      <Avatar className="size-5">
                        <AvatarImage src={issue.reporter.avatarUrl} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(issue.reporter.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{issue.reporter.name}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Unknown</span>
                  )}
                </div>
              </div>

              {issue.project && (
                <div className="grid grid-cols-3 items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Project</span>
                  <div className="col-span-2">
                    <Link
                      to="/projects/$projectId"
                      params={{ projectId: issue.project.id }}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <Network className="size-4 text-muted-foreground" />
                      <span>{issue.project.name}</span>
                    </Link>
                  </div>
                </div>
              )}

              {issue.cycle && (
                <div className="grid grid-cols-3 items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Cycle</span>
                  <div className="col-span-2 flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-muted-foreground" />
                    <span>{issue.cycle.name}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function IssueDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto py-6">
      <Link
        to="/"
        className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Issues
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-3/4" />
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
        <div>
          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-16" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-32" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function CommentsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
