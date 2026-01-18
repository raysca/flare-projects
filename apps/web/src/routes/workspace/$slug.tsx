import { Button } from '../../components/ui/button'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { LayoutDashboard, Users, Settings, Network } from 'lucide-react'

export const Route = createFileRoute('/workspace/$slug')({
    component: WorkspaceLayout,
})

function WorkspaceLayout() {
    const { slug } = Route.useParams()

    return (
        <div className="flex min-h-screen bg-background">
            {/* Sidebar */}
            <aside className="w-60 bg-bg-subtle border-r border-border-subtle hidden md:flex flex-col">
                <div className="p-4 border-b border-border-subtle">
                    <Link to="/" className="flex items-center gap-2 font-semibold text-base focus-visible-ring rounded-md">
                        <div className="bg-primary p-1 rounded-md w-6 h-6 flex items-center justify-center text-primary-foreground text-xs font-bold">L</div>
                        <span className="text-text-primary">LinearFlow</span>
                    </Link>
                </div>

                <div className="p-3">
                    <div className="relative">
                        <div className="text-xs font-semibold text-text-tertiary uppercase mb-2 px-2">Workspace</div>
                        <div className="px-2 py-1.5 bg-bg-muted rounded-md text-sm font-medium text-text-primary truncate">
                            {slug}
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-2 space-y-0.5 py-2">
                    <Link
                        to="/workspace/$slug"
                        params={{ slug }}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-bg-active text-primary group transition-colors focus-visible-ring"
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Issues</span>
                    </Link>
                    <Link
                        to="/workspace/$slug/team"
                        params={{ slug }}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover group transition-colors focus-visible-ring"
                    >
                        <Users className="w-4 h-4" />
                        <span>Team</span>
                    </Link>
                    <Link
                        to="/workspace/$slug/projects"
                        params={{ slug }}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover group transition-colors focus-visible-ring"
                    >
                        <Network className="w-4 h-4" />
                        <span>Projects</span>
                    </Link>
                    <Link
                        to="/workspace/$slug/settings"
                        params={{ slug }}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover group transition-colors focus-visible-ring"
                    >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                    </Link>
                </nav>

                <div className="p-3 border-t border-border-subtle">
                    <Link to="/">
                        <Button variant="outline" size="sm" className="w-full justify-start text-text-secondary hover:text-text-primary">
                            Switch Workspace
                        </Button>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-background">
                <header className="bg-bg-subtle border-b border-border-subtle px-6 py-3 flex items-center justify-between md:hidden">
                    <span className="font-semibold text-text-primary">{slug}</span>
                    {/* Mobile menu toggle would go here */}
                </header>

                <div className="p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}
