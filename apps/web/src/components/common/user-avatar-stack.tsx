import { usePresenceStore } from '@/stores/presence-store'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface UserAvatarStackProps {
    contextId: string
    className?: string
    limit?: number
}

const EMPTY_OBJECT = {}

export function UserAvatarStack({
    contextId,
    className,
    limit = 5,
}: UserAvatarStackProps) {
    const activeUsers = usePresenceStore((state) => state.activeUsers[contextId] || EMPTY_OBJECT)
    const users = Object.values(activeUsers)

    if (users.length === 0) return null

    const displayUsers = users.slice(0, limit)
    const remainingCount = users.length - limit

    return (
        <div className={cn('flex items-center -space-x-2', className)}>
            <TooltipProvider delayDuration={100}>
                {displayUsers.map((user) => (
                    <Tooltip key={user.userId}>
                        <TooltipTrigger asChild>
                            <Avatar className="h-8 w-8 border-2 border-background ring-2 ring-background transition-transform hover:z-10 hover:scale-110">
                                <AvatarImage src={user.avatarUrl} alt={user.userName} />
                                <AvatarFallback>
                                    {user.userName.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{user.userName}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
                {remainingCount > 0 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium ring-2 ring-background">
                        +{remainingCount}
                    </div>
                )}
            </TooltipProvider>
        </div>
    )
}
