import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PRIORITY_CONFIG, PRIORITY_ORDER } from '@/lib/issue-utils'
import type { IssuePriority } from '@/types/issues'
import { cn } from '@/lib/utils'

interface PrioritySelectProps {
  value: IssuePriority
  onValueChange: (value: IssuePriority) => void
  disabled?: boolean
  size?: 'sm' | 'default'
  className?: string
}

export function PrioritySelect({
  value,
  onValueChange,
  disabled,
  size = 'default',
  className,
}: PrioritySelectProps) {
  const currentConfig = PRIORITY_CONFIG[value]
  const Icon = currentConfig.icon

  return (
    <Select
      value={value}
      onValueChange={(v) => onValueChange(v as IssuePriority)}
      disabled={disabled}
    >
      <SelectTrigger size={size} className={cn('gap-2', className)}>
        <SelectValue>
          <Icon className={cn('size-4', currentConfig.color)} />
          <span>{currentConfig.label}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PRIORITY_ORDER.map((priority) => {
          const config = PRIORITY_CONFIG[priority]
          const PriorityIcon = config.icon
          return (
            <SelectItem key={priority} value={priority}>
              <PriorityIcon className={cn('size-4', config.color)} />
              <span>{config.label}</span>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
