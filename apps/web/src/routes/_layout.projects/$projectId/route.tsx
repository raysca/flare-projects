import { createFileRoute, Outlet, Link } from '@tanstack/react-router'
import { LayoutDashboard, Repeat, Settings } from 'lucide-react'

export const Route = createFileRoute('/_layout/projects/$projectId')({
    component: ProjectLayout,
})

function ProjectLayout() {
    const { projectId } = Route.useParams()

    const navItems = [
        {
            to: '/projects/$projectId',
            params: { projectId },
            label: 'Overview',
            icon: LayoutDashboard,
            exact: true
        },
        {
            to: '/projects/$projectId/cycles',
            params: { projectId },
            label: 'Cycles',
            icon: Repeat,
        },
        {
            to: '/projects/$projectId/settings',
            params: { projectId },
            label: 'Settings',
            icon: Settings,
        }
    ]

    return (
        <div className="flex flex-col min-h-screen">
            <div className="border-b bg-background">
                <div className="container max-w-5xl mx-auto px-0">
                    <nav className="flex items-center h-12 space-x-6 text-sm font-medium">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            return (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    params={item.params}
                                    activeOptions={{ exact: item.exact }}
                                    activeProps={{ className: 'text-foreground border-b-2 border-primary' }}
                                    inactiveProps={{ className: 'text-muted-foreground hover:text-foreground' }}
                                    className="flex items-center gap-2 h-full px-2 border-b-2 border-transparent transition-colors"
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </nav>
                </div>
            </div>
            <div className="flex-1">
                <Outlet />
            </div>
        </div>
    )
}
