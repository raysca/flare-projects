import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { apiFetch, clearAuthToken } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Plus, LogOut, ArrowRight, Layout } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

interface Workspace {
  id: string
  name: string
  slug: string
  role: string
}

function Dashboard() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      try {
        // Fetch user profile first to verify token
        const userProfile = await apiFetch<any>('/auth/me');
        setUser(userProfile);

        // Fetch workspaces
        const data = await apiFetch<Workspace[]>('/workspaces');
        setWorkspaces(data);
      } catch (err) {
        // If auth fails, redirect to login
        clearAuthToken();
        router.navigate({ to: '/login' });
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndFetch();
  }, [router]);

  const handleLogout = () => {
    clearAuthToken();
    router.navigate({ to: '/login' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-md">
            <Layout className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            LinearFlow
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {user?.name}
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">Your Workspaces</h2>
            <p className="text-muted-foreground">Manage your projects and teams.</p>
          </div>
          <Link to="/create-workspace">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Workspace
            </Button>
          </Link>
        </div>

        {workspaces.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            <div className="bg-slate-100 dark:bg-slate-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Layout className="w-8 h-8 text-slate-500 dark:text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No workspaces yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Create your first workspace to start managing issues and building great products.
            </p>
            <Link to="/create-workspace">
              <Button size="lg">Create Workspace</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                to={`/workspace/${workspace.slug}`}
                className="block group"
              >
                <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-blue-500/50">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {workspace.name}
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                    </CardTitle>
                    <CardDescription>{workspace.slug}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Can add stats here later */}
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 capitalize">
                      {workspace.role}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
