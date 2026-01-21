import { usePresenceStore } from '@/stores/presence-store'
import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
    contextId: string
    className?: string
}

const EMPTY_OBJECT = {}

export function TypingIndicator({ contextId, className }: TypingIndicatorProps) {
    const typingUsers = usePresenceStore((state) => state.typingUsers[contextId] || EMPTY_OBJECT)
    const activeUsers = usePresenceStore((state) => state.activeUsers[contextId] || EMPTY_OBJECT)

    const typingUserIds = Object.keys(typingUsers).filter(id => typingUsers[id])

    if (typingUserIds.length === 0) return null

    // Map IDs to names
    const names = typingUserIds.map(id => activeUsers[id]?.userName || 'Someone')

    let text = ''
    if (names.length === 1) {
        text = `${names[0]} is typing...`
    } else if (names.length === 2) {
        text = `${names[0]} and ${names[1]} are typing...`
    } else if (names.length > 2) {
        text = `${names[0]}, ${names[1]} and ${names.length - 2} others are typing...`
    }

    return (
        <div className={cn('flex items-center gap-2 text-xs text-muted-foreground animate-pulse', className)}>
            <div className="flex gap-0.5">
                <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" />
            </div>
            <span>{text}</span>
        </div>
    )
}
