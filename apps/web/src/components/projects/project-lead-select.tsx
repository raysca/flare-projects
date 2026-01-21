import { useState } from 'react'
import { Check, ChevronsUpDown, UserCircle } from 'lucide-react'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/issue-utils'
import { useUsers } from '@/hooks/use-users'

interface ProjectLeadSelectProps {
  value: string | undefined
  onValueChange: (value: string | undefined) => void
  disabled?: boolean
  size?: 'sm' | 'default'
  className?: string
}

export function ProjectLeadSelect({
  value,
  onValueChange,
  disabled,
  size = 'default',
  className,
}: ProjectLeadSelectProps) {
  const [open, setOpen] = useState(false)

  const { data: users = [] } = useUsers()

  const selectedMember = users.find((m) => m.id === value)

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
            className,
          )}
        >
          {selectedMember ? (
            <div className="flex items-center gap-2">
              <Avatar className="size-5">
                <AvatarImage src={selectedMember.avatarUrl} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(selectedMember.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{selectedMember.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserCircle className="size-4" />
              <span>No lead</span>
            </div>
          )}
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search members..." />
          <CommandList>
            <CommandEmpty>No member found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="no-lead"
                onSelect={() => {
                  onValueChange(undefined)
                  setOpen(false)
                }}
              >
                <UserCircle className="size-4 text-muted-foreground" />
                <span>No lead</span>
                <Check
                  className={cn(
                    'ml-auto size-4',
                    !value ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </CommandItem>
              {users.map((member) => (
                <CommandItem
                  key={member.id}
                  value={member.name}
                  onSelect={() => {
                    onValueChange(member.id)
                    setOpen(false)
                  }}
                >
                  <Avatar className="size-5">
                    <AvatarImage src={member.avatarUrl} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{member.name}</span>
                  <Check
                    className={cn(
                      'ml-auto size-4',
                      value === member.id ? 'opacity-100' : 'opacity-0',
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
