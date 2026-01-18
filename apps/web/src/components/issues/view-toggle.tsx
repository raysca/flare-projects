import { List, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { ViewMode } from '@/types/issues'

interface ViewToggleProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  className?: string
}

export function ViewToggle({
  viewMode,
  onViewModeChange,
  className,
}: ViewToggleProps) {
  return (
    <TooltipProvider>
      <div
        className={cn(
          'inline-flex items-center rounded-md border bg-background p-0.5',
          className
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => onViewModeChange('table')}
            >
              <List className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Table view</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={viewMode === 'board' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => onViewModeChange('board')}
            >
              <LayoutGrid className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Board view</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
