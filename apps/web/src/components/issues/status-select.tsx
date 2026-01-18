import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { STATUS_CONFIG, STATUS_ORDER } from '@/lib/issue-utils'
import type { IssueStatus } from '@/types/issues'
import { cn } from '@/lib/utils'

interface StatusSelectProps {
  value: IssueStatus
  onValueChange: (value: IssueStatus) => void
  disabled?: boolean
  size?: 'sm' | 'default'
  className?: string
}

export function StatusSelect({
  value,
  onValueChange,
  disabled,
  size = 'default',
  className,
}: StatusSelectProps) {
  const currentConfig = STATUS_CONFIG[value]
  const Icon = currentConfig.icon

  return (
    <Select
      value={value}
      onValueChange={(v) => onValueChange(v as IssueStatus)}
      disabled={disabled}
    >
      <SelectTrigger size={size} className={cn('gap-2', className)}>
        <SelectValue>
          <Icon className={cn('size-4', currentConfig.color)} />
          <span>{currentConfig.label}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {STATUS_ORDER.map((status) => {
          const config = STATUS_CONFIG[status]
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
