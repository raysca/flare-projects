import { Link } from '@tanstack/react-router'
import { Calendar } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PROJECT_STATUS_CONFIG, getProgressColor } from '@/lib/project-utils'
import { getInitials } from '@/lib/issue-utils'
import { cn } from '@/lib/utils'
import type { ProjectListItem } from '@/types/projects'

interface ProjectCardProps {
  project: ProjectListItem
}

export function ProjectCard({ project }: ProjectCardProps) {
  const statusConfig = PROJECT_STATUS_CONFIG[project.status]
  const StatusIcon = statusConfig.icon

  return (
    <Link to="/projects/$projectId" params={{ projectId: project.id }}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full group">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold text-lg mb-3">
              {project.identifier.substring(0, 1)}
            </div>
            <div
              className={cn(
                'flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider',
                statusConfig.bgColor,
                statusConfig.textColor,
              )}
            >
              <StatusIcon className="size-3" />
              {statusConfig.label}
            </div>
          </div>
          <CardTitle className="leading-tight group-hover:text-primary transition-colors">
            {project.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground flex items-center gap-4">
              <span className="font-mono text-xs">{project.identifier}</span>
              {project.targetDate && (
                <span className="flex items-center gap-1 text-xs">
                  <Calendar className="w-3 h-3" />
                  {new Date(project.targetDate).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{project.progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    getProgressColor(project.status, project.progress),
                  )}
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>

            {project.lead && (
              <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground border-t">
                <Avatar className="size-5">
                  <AvatarImage src={project.lead.avatarUrl} />
                  <AvatarFallback className="text-[9px]">
                    {getInitials(project.lead.name)}
                  </AvatarFallback>
                </Avatar>
                <span>Led by {project.lead.name}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
