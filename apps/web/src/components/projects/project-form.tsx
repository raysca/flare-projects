import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ProjectStatusSelect } from './project-status-select'
import { ProjectLeadSelect } from './project-lead-select'
import type { ProjectStatus, CreateProjectInput } from '@/types/projects'


interface ProjectFormProps {
  onSubmit: (input: CreateProjectInput) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  initialValues?: Partial<CreateProjectInput>
}

export function ProjectForm({
  onSubmit,
  onCancel,
  isSubmitting,
  initialValues,
}: ProjectFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [identifier, setIdentifier] = useState(initialValues?.identifier ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [status, setStatus] = useState<ProjectStatus>(
    initialValues?.status ?? 'planned'
  )
  const [leadId, setLeadId] = useState<string | undefined>(initialValues?.leadId)
  const [startDate, setStartDate] = useState(
    initialValues?.startDate
      ? new Date(initialValues.startDate).toISOString().split('T')[0]
      : ''
  )
  const [targetDate, setTargetDate] = useState(
    initialValues?.targetDate
      ? new Date(initialValues.targetDate).toISOString().split('T')[0]
      : ''
  )
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Project name is required')
      return
    }

    if (!identifier.trim()) {
      setError('Project identifier is required')
      return
    }

    if (!/^[A-Z0-9]+$/.test(identifier.toUpperCase())) {
      setError('Identifier must contain only letters and numbers')
      return
    }

    setError('')

    try {
      await onSubmit({
        name: name.trim(),
        identifier: identifier.toUpperCase(),
        description: description || undefined,
        status,
        leadId,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    }
  }

  // Auto-generate identifier from name
  const handleNameChange = (value: string) => {
    setName(value)
    if (!initialValues?.identifier && value.length > 0) {
      // Generate identifier from first characters of words (max 4)
      const words = value.trim().split(/\s+/)
      const generated = words
        .slice(0, 4)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
      setIdentifier(generated)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Project Name</Label>
        <Input
          id="name"
          placeholder="e.g. Q1 Product Roadmap"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          autoFocus
        />
      </div>

      {/* Identifier */}
      <div className="space-y-2">
        <Label htmlFor="identifier">Identifier (3-5 chars)</Label>
        <Input
          id="identifier"
          placeholder="e.g. Q1PR"
          maxLength={5}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
        />
        <p className="text-xs text-muted-foreground">
          Used for quick reference (e.g., {identifier || 'PROJ'})
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the project goals and scope..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[100px]"
        />
      </div>

      {/* Status and Lead */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <ProjectStatusSelect value={status} onValueChange={setStatus} />
        </div>
        <div className="space-y-2">
          <Label>Lead</Label>
          <ProjectLeadSelect
            value={leadId}
            onValueChange={setLeadId}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
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
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Project'}
        </Button>
      </div>
    </form>
  )
}
