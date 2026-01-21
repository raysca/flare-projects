import { useState } from 'react'
import { Smile, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { useToggleReaction } from '@/hooks/use-issues'
import { useMe } from '@/hooks/use-users'
import { CommentReaction } from '@/types/issues'
import { cn } from '@/lib/utils'

interface CommentReactionsProps {
    issueId: string
    commentId: string
    reactions: CommentReaction[]
}

const COMMON_EMOJIS = ['👍', '👎', '😄', '🎉', '😕', '❤️', '🚀', '👀']

export function CommentReactions({
    issueId,
    commentId,
    reactions = [],
}: CommentReactionsProps) {
    const { data: me } = useMe()
    const toggleReaction = useToggleReaction()
    const [isOpen, setIsOpen] = useState(false)

    // Group reactions by emoji
    const groupedReactions = reactions.reduce(
        (acc, reaction) => {
            if (!acc[reaction.emoji]) {
                acc[reaction.emoji] = {
                    emoji: reaction.emoji,
                    count: 0,
                    hasReacted: false,
                    uids: [],
                }
            }
            acc[reaction.emoji].count++
            acc[reaction.emoji].uids.push(reaction.userId)
            if (me && reaction.userId === me.id) {
                acc[reaction.emoji].hasReacted = true
            }
            return acc
        },
        {} as Record<
            string,
            { emoji: string; count: number; hasReacted: boolean; uids: string[] }
        >,
    )

    const handleReaction = (emoji: string) => {
        toggleReaction.mutate({ issueId, commentId, emoji })
        setIsOpen(false)
    }

    return (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {Object.values(groupedReactions).map((group) => (
                <button
                    key={group.emoji}
                    onClick={() => handleReaction(group.emoji)}
                    disabled={toggleReaction.isPending}
                    className={cn(
                        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs border transition-colors',
                        group.hasReacted
                            ? 'bg-primary/10 border-primary/20 text-primary'
                            : 'bg-muted/30 border-transparent hover:bg-muted text-muted-foreground hover:text-foreground',
                    )}
                    title={group.hasReacted ? 'Remove reaction' : 'Add reaction'}
                >
                    <span>{group.emoji}</span>
                    <span className="font-medium">{group.count}</span>
                </button>
            ))}

            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Smile className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                    <div className="flex gap-1">
                        {COMMON_EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted text-lg transition-colors"
                                onClick={() => handleReaction(emoji)}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
