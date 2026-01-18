import { useState } from 'react'
import { Check, ChevronsUpDown, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Label } from '@/types/issues'

interface LabelSelectProps {
  value: string[]
  onValueChange: (value: string[]) => void
  labels: Label[]
  disabled?: boolean
  size?: 'sm' | 'default'
  className?: string
}

export function LabelSelect({
  value,
  onValueChange,
  labels,
  disabled,
  size = 'default',
  className,
}: LabelSelectProps) {
  const [open, setOpen] = useState(false)
  const selectedLabels = labels.filter((l) => value.includes(l.id))

  const toggleLabel = (labelId: string) => {
    if (value.includes(labelId)) {
      onValueChange(value.filter((id) => id !== labelId))
    } else {
      onValueChange([...value, labelId])
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'justify-between gap-2',
            size === 'sm' ? 'h-8 text-xs' : 'h-9',
            className
          )}
        >
          {selectedLabels.length > 0 ? (
            <div className="flex items-center gap-1 overflow-hidden">
              {selectedLabels.slice(0, 2).map((label) => (
                <Badge
                  key={label.id}
                  variant="secondary"
                  className="px-1.5 py-0 text-xs"
                  style={{ backgroundColor: `${label.color}20`, color: label.color }}
                >
                  {label.name}
                </Badge>
              ))}
              {selectedLabels.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{selectedLabels.length - 2}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Tag className="size-4" />
              <span>Add labels</span>
            </div>
          )}
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search labels..." />
          <CommandList>
            <CommandEmpty>No label found.</CommandEmpty>
            <CommandGroup>
              {labels.map((label) => (
                <CommandItem
                  key={label.id}
                  value={label.name}
                  onSelect={() => toggleLabel(label.id)}
                >
                  <div
                    className="size-3 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <span>{label.name}</span>
                  <Check
                    className={cn(
                      'ml-auto size-4',
                      value.includes(label.id) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
