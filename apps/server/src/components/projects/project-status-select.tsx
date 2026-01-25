import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PROJECT_STATUS_CONFIG,
  PROJECT_STATUS_ORDER,
} from '@/lib/project-utils'
import type { ProjectStatus } from '@/types/projects'
import { cn } from '@/lib/utils'

interface ProjectStatusSelectProps {
  value: ProjectStatus
  onValueChange: (value: ProjectStatus) => void
  disabled?: boolean
  size?: 'sm' | 'default'
  className?: string
}

export function ProjectStatusSelect({
  value,
  onValueChange,
  disabled,
  size = 'default',
  className,
}: ProjectStatusSelectProps) {
  const currentConfig = PROJECT_STATUS_CONFIG[value]
  const Icon = currentConfig.icon

  return (
    <Select
      value={value}
      onValueChange={(v) => onValueChange(v as ProjectStatus)}
      disabled={disabled}
    >
      <SelectTrigger size={size} className={cn('gap-2', className)}>
        <SelectValue>
          <Icon className={cn('size-4', currentConfig.color)} />
          <span>{currentConfig.label}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PROJECT_STATUS_ORDER.map((status) => {
          const config = PROJECT_STATUS_CONFIG[status]
          const StatusIcon = config.icon
          return (
            <SelectItem key={status} value={status}>
              <StatusIcon className={cn('size-4', config.color)} />
              <span>{config.label}</span>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
