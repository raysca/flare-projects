import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useDashboardIssues } from '@/hooks/use-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { Layers, User, Eye, AlertCircle, FilePlus, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type FilterType = 'assigned' | 'reported' | 'watching';

export function MyIssuesCard() {
    const [filter, setFilter] = useState<FilterType>('assigned');
    const { data, isLoading } = useDashboardIssues({ filter, limit: 10 });

    return (
        <Card className="col-span-1 lg:col-span-1 h-full flex flex-col min-h-[400px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    My Issues
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                <Tabs
                    value={filter}
                    onValueChange={(val) => setFilter(val as FilterType)}
                    className="w-full flex-1 flex flex-col"
                >
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="assigned">Assigned</TabsTrigger>
                        <TabsTrigger value="reported">Created</TabsTrigger>
                        <TabsTrigger value="watching">Watching</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-auto -mx-2 px-2">
                        {isLoading ? (
                            <div className="space-y-4">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex justify-between gap-4">
                                        <Skeleton className="h-12 w-full rounded-lg" />
                                    </div>
                                ))}
                            </div>
                        ) : data?.issues?.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center space-y-3">
                                <div className="p-3 bg-muted rounded-full">
                                    <FilePlus className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-medium">No issues found</p>
                                    <p className="text-sm text-muted-foreground">
                                        {filter === 'assigned' && "You don't have any assigned issues."}
                                        {filter === 'reported' && "You haven't created any issues yet."}
                                        {filter === 'watching' && "You aren't watching any issues."}
                                    </p>
                                </div>
                                {filter === 'reported' && (
                                    <Button variant="outline" size="sm" asChild>
                                        <Link to="/create-issue">Create Issue</Link>
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {data?.issues.map((issue) => (
                                    <Link
                                        key={issue.id}
                                        to="/issue/$issueId"
                                        params={{ issueId: issue.id }}
                                        className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                                    >
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="space-y-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs text-muted-foreground">
                                                        {issue.project.identifier}-{issue.number}
                                                    </span>
                                                    <span className="text-sm font-medium truncate blocked">
                                                        {issue.title}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <StatusBadge status={issue.status} />
                                                    <PriorityIcon priority={issue.priority} />
                                                    {issue.dueDate && (
                                                        <span className={cn("flex items-center gap-1",
                                                            new Date(issue.dueDate) < new Date() ? "text-red-500" : ""
                                                        )}>
                                                            <Calendar className="h-3 w-3" />
                                                            {format(new Date(issue.dueDate), 'MMM d')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="shrink-0">
                                                {/* Avatar or other indicator could go here */}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 mt-auto border-t">
                        <Button variant="ghost" size="sm" className="w-full text-muted-foreground" asChild>
                            <Link to={"/issues" as any} search={{ filter: filter === 'assigned' ? undefined : filter } as any}>
                                View All {filter === 'assigned' ? 'Assigned' : filter === 'reported' ? 'Created' : 'Watched'}
                            </Link>
                        </Button>
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
}

function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, string> = {
        backlog: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
        todo: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
        done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    };

    const labels: Record<string, string> = {
        backlog: 'Backlog',
        todo: 'Todo',
        in_progress: 'In Progress',
        done: 'Done',
        cancelled: 'Cancelled',
        in_review: 'In Review'
    };

    return (
        <span className={cn("px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider", variants[status] || variants.backlog)}>
            {labels[status] || status.replace('_', ' ')}
        </span>
    );
}

function PriorityIcon({ priority }: { priority: string }) {
    if (priority === 'urgent') return <Badge variant="destructive" className="text-[10px] h-4 px-1">Urgent</Badge>;
    if (priority === 'high') return <span className="text-orange-500 font-medium">High</span>;
    if (priority === 'medium') return <span className="text-yellow-500 font-medium">Medium</span>;
    if (priority === 'low') return <span className="text-blue-500 font-medium">Low</span>;
    return <span className="text-muted-foreground">No Priority</span>;
}
