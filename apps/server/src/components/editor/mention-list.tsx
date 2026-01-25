import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useState,
    useRef,
} from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/issue-utils'
import { cn } from '@/lib/utils'

export interface MentionListProps {
    items: any[]
    command: (props: any) => void
}

export interface MentionListRef {
    onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
    (props, ref) => {
        const [selectedIndex, setSelectedIndex] = useState(0)
        const listRef = useRef<HTMLDivElement>(null)

        const selectItem = (index: number) => {
            const item = props.items[index]
            if (item) {
                props.command({ id: item.id, label: item.name }) // Pass name so it shows up in editor
            }
        }

        const upHandler = () => {
            setSelectedIndex(
                (selectedIndex + props.items.length - 1) % props.items.length,
            )
        }

        const downHandler = () => {
            setSelectedIndex((selectedIndex + 1) % props.items.length)
        }

        const enterHandler = () => {
            selectItem(selectedIndex)
        }

        useEffect(() => {
            setSelectedIndex(0)
        }, [props.items])

        useImperativeHandle(ref, () => ({
            onKeyDown: ({ event }) => {
                if (event.key === 'ArrowUp') {
                    upHandler()
                    return true
                }
                if (event.key === 'ArrowDown') {
                    downHandler()
                    return true
                }
                if (event.key === 'Enter') {
                    enterHandler()
                    return true
                }
                return false
            },
        }))

        // Scroll selected item into view
        useEffect(() => {
            if (listRef.current) {
                const selectedElement = listRef.current.children[selectedIndex] as HTMLElement
                if (selectedElement) {
                    // Very simple scroll into view, can be improved
                    selectedElement.scrollIntoView({ block: 'nearest' })
                }
            }
        }, [selectedIndex])


        if (props.items.length === 0) {
            return null;
        }

        return (
            <div
                ref={listRef}
                className="z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md p-1"
            >
                {props.items.map((item, index) => (
                    <button
                        key={item.id}
                        className={cn(
                            'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
                            index === selectedIndex
                                ? 'bg-accent text-accent-foreground'
                                : 'text-foreground hover:bg-accent/50',
                        )}
                        onClick={() => selectItem(index)}
                    >
                        <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={item.avatarUrl} />
                            <AvatarFallback className="text-[10px]">
                                {getInitials(item.name)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-left flex-1">{item.name}</span>
                    </button>
                ))}
            </div>
        )
    },
)

MentionList.displayName = 'MentionList'
