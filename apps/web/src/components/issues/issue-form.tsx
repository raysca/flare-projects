import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label as FormLabel } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { StatusSelect } from './status-select'
import { PrioritySelect } from './priority-select'
import { AssigneeSelect } from './assignee-select'
import { LabelSelect } from './label-select'
import type {
  IssueStatus,
  IssuePriority,
  Team,
  Project,
  User,
  Label,
  CreateIssueInput,
  Cycle,
} from '@/types/issues'

interface IssueFormProps {
  workspaceId: string
  teams: Team[]
  projects: Project[]
  members: User[]
  labels: Label[]
  cycles: Cycle[]
  onSubmit: (input: CreateIssueInput) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  initialValues?: Partial<CreateIssueInput>
}

export function IssueForm({
  workspaceId,
  teams,
  projects,
  members,
  labels,
  cycles,
  onSubmit,
  onCancel,
  isSubmitting,
  initialValues,
}: IssueFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [description, setDescription] = useState(
    initialValues?.description ?? ''
  )
  const [teamId, setTeamId] = useState(initialValues?.teamId ?? teams[0]?.id ?? '')
  const [projectId, setProjectId] = useState(initialValues?.projectId ?? '')
  const [cycleId, setCycleId] = useState(initialValues?.cycleId ?? '')
  const [status, setStatus] = useState<IssueStatus>(
    initialValues?.status ?? 'backlog'
  )
  const [priority, setPriority] = useState<IssuePriority>(
    initialValues?.priority ?? 'no_priority'
  )
  const [assigneeId, setAssigneeId] = useState<string | undefined>(
    initialValues?.assigneeId
  )
  const [labelIds, setLabelIds] = useState<string[]>(
    initialValues?.labelIds ?? []
  )
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (!teamId) {
      setError('Team is required')
      return
    }

    setError('')

    try {
      await onSubmit({
        workspaceId,
        teamId,
        title: title.trim(),
        description: description || undefined,
        status,
        priority,
        assigneeId,
        projectId: projectId || undefined,
        cycleId: cycleId || undefined,
        labelIds: labelIds.length > 0 ? labelIds : undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create issue')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Team and Project */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <FormLabel htmlFor="team">Team</FormLabel>
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger>
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name} ({team.identifier})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="project">Project (Optional)</FormLabel>
          <Select value={projectId || 'no_project'} onValueChange={(val) => setProjectId(val === 'no_project' ? '' : val)}>
            <SelectTrigger>
              <SelectValue placeholder="No project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no_project">No Project</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name} ({project.identifier})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cycle (Optional) */}
      <div className="space-y-2">
        <FormLabel htmlFor="cycle">Cycle (Optional)</FormLabel>
        <Select value={cycleId || 'no_cycle'} onValueChange={(val) => setCycleId(val === 'no_cycle' ? '' : val)}>
          <SelectTrigger>
            <SelectValue placeholder="No cycle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no_cycle">No Cycle</SelectItem>
            {cycles.map((cycle) => (
              <SelectItem key={cycle.id} value={cycle.id}>
                {cycle.name} ({cycle.status})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <FormLabel htmlFor="title">Title</FormLabel>
        <Input
          id="title"
          placeholder="Issue title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <FormLabel>Description</FormLabel>
        <RichTextEditor
          content={description}
          onChange={setDescription}
          placeholder="Add a description..."
        />
      </div>

      {/* Status and Priority */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <FormLabel>Status</FormLabel>
          <StatusSelect value={status} onValueChange={setStatus} />
        </div>
        <div className="space-y-2">
          <FormLabel>Priority</FormLabel>
          <PrioritySelect value={priority} onValueChange={setPriority} />
        </div>
      </div>

      {/* Assignee and Labels */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <FormLabel>Assignee</FormLabel>
          <AssigneeSelect
            value={assigneeId}
            onValueChange={setAssigneeId}
            members={members}
          />
        </div>
        <div className="space-y-2">
          <FormLabel>Labels</FormLabel>
          <LabelSelect
            value={labelIds}
            onValueChange={setLabelIds}
            labels={labels}
          />
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || teams.length === 0}>
          {isSubmitting ? 'Creating...' : 'Create Issue'}
        </Button>
      </div>
    </form>
  )
}
