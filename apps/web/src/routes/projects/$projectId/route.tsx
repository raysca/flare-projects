import { createFileRoute, Outlet, Link } from '@tanstack/react-router'
import { LayoutDashboard, Repeat, Settings } from 'lucide-react'

export const Route = createFileRoute('/projects/$projectId')({
    component: ProjectLayout,
})

function ProjectLayout() {
    const { projectId } = Route.useParams()

    return (
        <div className="flex flex-col min-h-screen">
            <div className="border-b bg-background">
                <div className="container max-w-5xl mx-auto px-0">
                    <nav className="flex items-center h-12 space-x-6 text-sm font-medium">
                        <Link
                            to="/projects/$projectId"
                            params={{ projectId }}
                            activeOptions={{ exact: true }}
                            activeProps={{ className: 'text-foreground border-b-2 border-primary' }}
                            inactiveProps={{ className: 'text-muted-foreground hover:text-foreground' }}
                            className="flex items-center gap-2 h-full px-2 border-b-2 border-transparent transition-colors"
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Overview
                        </Link>
                        <Link
                            to="/projects/$projectId/cycles"
                            params={{ projectId }}
                            activeProps={{ className: 'text-foreground border-b-2 border-primary' }}
                            inactiveProps={{ className: 'text-muted-foreground hover:text-foreground' }}
                            className="flex items-center gap-2 h-full px-2 border-b-2 border-transparent transition-colors"
                        >
                            <Repeat className="w-4 h-4" />
                            Cycles
                        </Link>
                        {/* Add Issues tab later if needed, currently issues are accessed via Overview or global list? 
                 Actually issue detail is at /issue/$issueId (global). 
                 A project-filtered issue list would be nice at /projects/$projectId/issues */}
                    </nav>
                </div>
            </div>
            <div className="flex-1">
                <Outlet />
            </div>
        </div>
    )
}
