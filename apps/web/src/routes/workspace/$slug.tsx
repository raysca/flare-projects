import { createFileRoute, Link, Outlet, useMatchRoute } from '@tanstack/react-router'
import { LayoutDashboard, Users, Settings, Network, Repeat, ChevronDown, Search, Plus } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils'

export const Route = createFileRoute('/workspace/$slug')({
  component: WorkspaceLayout,
})

function WorkspaceLayout() {
  const { slug } = Route.useParams()
  const matchRoute = useMatchRoute()

  const navItems = [
    {
      to: '/workspace/$slug',
      icon: LayoutDashboard,
      label: 'Issues',
      exact: true,
    },
    {
      to: '/workspace/$slug/projects',
      icon: Network,
      label: 'Projects',
    },
    {
      to: '/workspace/$slug/cycles',
      icon: Repeat,
      label: 'Cycles',
    },
    {
      to: '/workspace/$slug/team',
      icon: Users,
      label: 'Team',
    },
    {
      to: '/workspace/$slug/settings',
      icon: Settings,
      label: 'Settings',
    },
  ]

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[220px] bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
        {/* Logo & Workspace Selector */}
        <div className="h-12 flex items-center px-3 border-b border-sidebar-border">
          <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-sidebar-accent transition-colors w-full group">
            <div className="w-5 h-5 rounded bg-violet-500 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">L</span>
            </div>
            <span className="text-sm font-medium text-sidebar-foreground truncate flex-1 text-left">
              {slug}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="px-2 py-2 border-b border-sidebar-border">
          <button className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors">
            <Search className="w-4 h-4" />
            <span>Search</span>
            <kbd className="ml-auto text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              /
            </kbd>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = matchRoute({
              to: item.to,
              params: { slug },
              fuzzy: !item.exact,
            })

            return (
              <Link
                key={item.to}
                to={item.to}
                params={{ slug }}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-foreground'
                    : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <item.icon className={cn('w-4 h-4', isActive ? 'text-violet-500' : '')} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-2 border-t border-sidebar-border">
          <Link to="/" className="block">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground text-sm h-8"
            >
              Switch Workspace
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            {/* Breadcrumb would go here */}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <Search className="w-4 h-4" />
            </Button>
            <Button size="sm" className="h-7 gap-1">
              <Plus className="w-3.5 h-3.5" />
              New Issue
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
