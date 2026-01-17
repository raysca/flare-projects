import { Button } from '../../components/ui/button'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { LayoutDashboard, Users, Settings } from 'lucide-react'

export const Route = createFileRoute('/workspace/$slug')({
    component: WorkspaceLayout,
})

function WorkspaceLayout() {
    const { slug } = Route.useParams()

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 hidden md:flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <Link to="/" className="flex items-center gap-2 font-bold text-lg">
                        <div className="bg-blue-600 p-1 rounded-sm w-6 h-6 flex items-center justify-center text-white text-xs">L</div>
                        LinearFlow
                    </Link>
                </div>

                <div className="p-4">
                    <div className="relative">
                        <div className="text-xs font-semibold text-muted-foreground uppercase mb-2 px-2">Workspace</div>
                        <div className="px-2 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-md text-sm font-medium truncate">
                            {slug}
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-2 space-y-1">
                    <Link
                        to="/workspace/$slug"
                        params={{ slug }}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 group"
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Issues
                    </Link>
                    <Link
                        to="/workspace/$slug/team"
                        params={{ slug }}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700 group transition-colors"
                    >
                        <Users className="w-4 h-4 text-slate-400 group-hover:text-slate-500" />
                        Team
                    </Link>
                    <Link
                        to="/workspace/$slug/settings"
                        params={{ slug }}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700 group transition-colors"
                    >
                        <Settings className="w-4 h-4 text-slate-400 group-hover:text-slate-500" />
                        Settings
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <Link to="/">
                        <Button variant="outline" size="sm" className="w-full">
                            Switch Workspace
                        </Button>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between md:hidden">
                    <span className="font-bold">{slug}</span>
                    {/* Mobile menu toggle would go here */}
                </header>

                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}
