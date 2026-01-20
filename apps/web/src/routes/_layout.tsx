import { useAuth } from '../context/auth-context'
import { useEffect } from 'react'
import { createFileRoute, Link, Outlet, useLocation, useRouter } from '@tanstack/react-router'
import { LayoutDashboard, Settings, Network, Search, Plus, User as UserIcon, LogOut } from 'lucide-react'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'
import { useProjects } from '../hooks/use-projects'

export const Route = createFileRoute('/_layout')({
  component: AppLayout,
})

function AppLayout() {
  const { isAuthenticated, isLoading, user, logout } = useAuth()
  const { data: projects = [] } = useProjects()
  const location = useLocation()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.navigate({ to: '/login' })
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  const navItems = [
    {
      to: '/',
      icon: LayoutDashboard,
      label: 'My Issues',
      exact: true,
    },
    {
      to: '/settings',
      icon: Settings,
      label: 'Settings',
    },
  ]

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[220px] bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
        {/* Logo */}
        <div className="h-12 flex items-center px-3 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-sidebar-accent transition-colors w-full">
            <div className="w-5 h-5 rounded bg-violet-600 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">L</span>
            </div>
            <span className="text-sm font-medium text-sidebar-foreground truncate flex-1">
              LinearFlow
            </span>
          </Link>
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
        <nav className="flex-1 px-2 py-2 space-y-4 overflow-y-auto">
          {/* Main Links */}
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = item.exact
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to)

              return (
                <Link
                  key={item.to}
                  to={item.to}
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
          </div>

          {/* Projects List */}
          <div className="space-y-0.5">
            <div className="px-2 text-xs font-semibold text-muted-foreground mb-2">Projects</div>
            {projects.map((project) => (
              <Link
                key={project.id}
                to="/projects/$projectId"
                params={{ projectId: project.id }}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 text-sm font-medium rounded-md transition-colors',
                  location.pathname.includes(`/projects/${project.id}`)
                    ? 'bg-sidebar-accent text-sidebar-foreground'
                    : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <Network className={cn('w-4 h-4', location.pathname.includes(`/projects/${project.id}`) ? 'text-violet-500' : '')} />
                <span className="truncate">{project.name}</span>
              </Link>
            ))}
            <Link
              to="/projects"
              className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Project
            </Link>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-2 border-t border-sidebar-border space-y-1">
          <Link to="/settings" className="block">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 px-2 h-auto py-1.5"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <UserIcon className="w-4 h-4" />
              )}
              <div className="flex flex-col items-start overflow-hidden">
                <span className="text-sm font-medium truncate w-full text-left">{user?.name || 'User'}</span>
                <span className="text-xs text-muted-foreground truncate w-full text-left">{user?.email}</span>
              </div>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 px-2 text-muted-foreground hover:text-destructive h-8"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2">
            {/* Breadcrumb place holder */}
          </div>
          <div className="flex items-center gap-1">
            <Link to="/create-issue">
              <Button size="sm" className="h-7 gap-1">
                <Plus className="w-3.5 h-3.5" />
                New Issue
              </Button>
            </Link>
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
