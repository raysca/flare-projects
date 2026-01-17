import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Link, useRouter, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { apiFetch } from '../lib/api'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/create-workspace')({
    component: CreateWorkspace,
})

function CreateWorkspace() {
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setName(newName);
        // Auto-generate slug from name if slug hasn't been manually edited (simple heuristic)
        if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, -1)) {
            setSlug(newName.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            await apiFetch('/workspaces', {
                method: 'POST',
                body: JSON.stringify({ name, slug }),
            })

            // Redirect to dashboard
            router.navigate({ to: '/' })
        } catch (err: any) {
            setError(err.message || 'Failed to create workspace')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <span className="text-sm font-medium text-muted-foreground">Back to Dashboard</span>
                    </div>
                    <CardTitle className="text-2xl font-bold">Create a new workspace</CardTitle>
                    <CardDescription>
                        Workspaces are where your team collaborates.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Workspace Name</Label>
                            <Input
                                id="name"
                                placeholder="Acme Corp"
                                value={name}
                                onChange={handleNameChange}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="slug">Workspace URL</Label>
                            <div className="flex items-center">
                                <span className="bg-muted px-3 py-2 border border-r-0 border-input rounded-l-md text-sm text-muted-foreground bg-slate-100 dark:bg-slate-800">
                                    linearflow.app/
                                </span>
                                <Input
                                    id="slug"
                                    placeholder="acme"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    className="rounded-l-none"
                                    required
                                    pattern="^[a-z0-9-]+$"
                                    title="Only lowercase letters, numbers, and hyphens allowed."
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                This will be the URL where your team accesses the workspace.
                            </p>
                        </div>

                        {error && <p className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-md">{error}</p>}

                        <div className="flex justify-end gap-3 pt-2">
                            <Link to="/">
                                <Button type="button" variant="ghost">Cancel</Button>
                            </Link>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Creating...' : 'Create Workspace'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
