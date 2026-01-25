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
  Project,
  User,
  Label,
  CreateIssueInput,
  Cycle,
} from '@/types/issues'

interface IssueFormProps {
  projects: Project[]
  members: User[]
  labels: Label[]
  cycles: Cycle[]
  onSubmit: (input: CreateIssueInput) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  initialValues?: Partial<CreateIssueInput>
  projectId: string
  onProjectChange: (projectId: string) => void
}

export function IssueForm({
  projects,
  members,
  labels,
  cycles,
  onSubmit,
  onCancel,
  isSubmitting,
  initialValues,
  projectId,
  onProjectChange,
}: IssueFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [description, setDescription] = useState(
    initialValues?.description ?? '',
  )
  const [cycleId, setCycleId] = useState(initialValues?.cycleId ?? '')
  const [status, setStatus] = useState<IssueStatus>(
    initialValues?.status ?? 'backlog',
  )
  const [priority, setPriority] = useState<IssuePriority>(
    initialValues?.priority ?? 'no_priority',
  )
  const [assigneeId, setAssigneeId] = useState<string | undefined>(
    initialValues?.assigneeId,
  )
  const [labelIds, setLabelIds] = useState<string[]>(
    initialValues?.labelIds ?? [],
  )
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (!projectId) {
      setError('Project is required')
      return
    }

    setError('')

    setError('')

    try {
      await onSubmit({
        title: title.trim(),
        description: description || undefined,
        status,
        priority,
        assigneeId,
        projectId,
        cycleId: cycleId && cycleId !== 'no_cycle' ? cycleId : undefined,
        labelIds: labelIds.length > 0 ? labelIds : undefined,
      })
    } catch (err) {
      console.error('Issue creation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create issue')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project */}
      <div className="space-y-2">
        <FormLabel htmlFor="project">Project</FormLabel>
        <Select value={projectId} onValueChange={onProjectChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name} ({project.identifier})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cycle (Optional) */}
      <div className="space-y-2">
        <FormLabel htmlFor="cycle">Cycle (Optional)</FormLabel>
        <Select
          value={cycleId || 'no_cycle'}
          onValueChange={(val) => setCycleId(val === 'no_cycle' ? '' : val)}
        >
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
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Issue'}
        </Button>
      </div>
    </form>
  )
}
