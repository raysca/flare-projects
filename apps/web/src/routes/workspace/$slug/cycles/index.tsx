import { createFileRoute, Link } from '@tanstack/react-router'
import { Plus, Repeat, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

export const Route = createFileRoute('/workspace/$slug/cycles/')({
    component: CyclesList,
})

interface Cycle {
    id: string
    name: string
    startDate: string
    endDate: string
    status: 'upcoming' | 'active' | 'completed'
    progress: number
}

function CyclesList() {
    const { slug } = Route.useParams()
    const [workspace, setWorkspace] = useState<{ id: string } | null>(null)
    const [cycles, setCycles] = useState<Cycle[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadData = async () => {
            try {
                const workspaces = await apiFetch<{ id: string, slug: string }[]>('/workspaces')
                const activeWorkspace = workspaces.find(w => w.slug === slug)

                if (activeWorkspace) {
                    setWorkspace(activeWorkspace)
                    const cyclesData = await apiFetch<Cycle[]>(`/cycles?workspaceId=${activeWorkspace.id}`)
                    setCycles(cyclesData)
                }
            } catch (err) {
                console.error("Failed to load cycles", err)
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [slug])

    if (isLoading) return <div className="p-8">Loading cycles...</div>

    const activeCycles = cycles.filter(c => c.status === 'active')
    const upcomingCycles = cycles.filter(c => c.status === 'upcoming')
    const completedCycles = cycles.filter(c => c.status === 'completed')

    const CycleCard = ({ cycle }: { cycle: Cycle }) => (
        <Link to="/workspace/$slug/cycles/$cycleId" params={{ slug, cycleId: cycle.id }}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-base font-medium">{cycle.name}</CardTitle>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${cycle.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                cycle.status === 'completed' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' :
                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                            {cycle.status}
                        </span>
                    </div>
                    <CardDescription className="flex items-center gap-1.5 text-xs">
                        <Calendar className="w-3 h-3" />
                        {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>{Math.round(cycle.progress)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-500"
                                style={{ width: `${cycle.progress}%` }}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )

    return (
        <div className="container mx-auto py-6 max-w-5xl space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Cycles</h1>
                    <p className="text-muted-foreground">Manage your team's sprints and work cycles.</p>
                </div>
                <Link to="/workspace/$slug/cycles/new" params={{ slug }}>
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        New Cycle
                    </Button>
                </Link>
            </div>

            {cycles.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/50">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Repeat className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No cycles yet</h3>
                    <p className="text-muted-foreground text-center max-w-sm mb-6">
                        Cycles help you group work into time-boxed periods like sprints. Create your first cycle to get started.
                    </p>
                    <Link to="/workspace/$slug/cycles/new" params={{ slug }}>
                        <Button>Create Cycle</Button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-8">
                    {activeCycles.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                Active Cycles
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {activeCycles.map(cycle => (
                                    <CycleCard key={cycle.id} cycle={cycle} />
                                ))}
                            </div>
                        </div>
                    )}

                    {upcomingCycles.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                Upcoming Cycles
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {upcomingCycles.map(cycle => (
                                    <CycleCard key={cycle.id} cycle={cycle} />
                                ))}
                            </div>
                        </div>
                    )}

                    {completedCycles.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-slate-500" />
                                Completed Cycles
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {completedCycles.map(cycle => (
                                    <CycleCard key={cycle.id} cycle={cycle} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
