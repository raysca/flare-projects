import { useState } from 'react'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
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
import { useSearchUsers, type User } from '@/hooks/use-users'

interface UserSearchComboboxProps {
  value?: User | null
  onSelect: (user: User | null) => void
  onEmailEntered?: (email: string) => void
  placeholder?: string
  disabled?: boolean
}

export function UserSearchCombobox({
  value,
  onSelect,
  onEmailEntered,
  placeholder = 'Search users...',
  disabled = false,
}: UserSearchComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: users = [], isLoading } = useSearchUsers(searchQuery)

  // Check if input looks like an email
  const isValidEmail = (text: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
  }

  const handleSelectUser = (user: User) => {
    onSelect(user)
    setOpen(false)
    setSearchQuery('')
  }

  const handleInviteByEmail = () => {
    if (isValidEmail(searchQuery)) {
      console.log('User not found in system, inviting by email:', searchQuery)
      if (onEmailEntered) {
        onEmailEntered(searchQuery)
      }
      setOpen(false)
      setSearchQuery('')
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {value ? (
            <div className="flex items-center gap-2">
              <Avatar className="size-5">
                <AvatarImage src={value.avatarUrl} alt={value.name} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(value.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{value.name}</span>
              <span className="text-muted-foreground text-xs truncate">
                {value.email}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name or email..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-4 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <>
                <CommandEmpty>
                  {searchQuery.length < 1 ? (
                    'Start typing to search users'
                  ) : isValidEmail(searchQuery) ? (
                    <div className="space-y-2">
                      <p className="text-muted-foreground">
                        No user found with this email
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleInviteByEmail}
                      >
                        Invite {searchQuery}
                      </Button>
                    </div>
                  ) : (
                    'No users found. Enter a valid email to invite.'
                  )}
                </CommandEmpty>
              </>
            ) : (
              <CommandGroup heading="Users">
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.id}
                    onSelect={() => handleSelectUser(user)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Avatar className="size-6">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="truncate">{user.name}</span>
                        <span className="text-muted-foreground text-xs truncate">
                          {user.email}
                        </span>
                      </div>
                    </div>
                    <Check
                      className={cn(
                        'size-4 shrink-0',
                        value?.id === user.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
