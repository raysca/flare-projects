import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useDashboardActivity } from '@/hooks/use-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, GitCommit, MessageSquare, PlusCircle, Trash2, Edit, Tag } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';

export function RecentActivityCard() {
    const { data: activities, isLoading } = useDashboardActivity();

    return (
        <Card className="col-span-1 h-full flex flex-col min-h-[400px]">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Recent Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="space-y-6 pt-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <Skeleton className="h-2 w-2 rounded-full" />
                                    <Skeleton className="w-[1px] h-full mt-2" />
                                </div>
                                <div className="space-y-1 flex-1 pb-4">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activities?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center space-y-3">
                        <div className="p-3 bg-muted rounded-full">
                            <Activity className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">No recent activity.</p>
                    </div>
                ) : (
                    <div className="relative pl-2 pt-2">
                        {/* Timeline line */}
                        <div className="absolute top-4 bottom-4 left-[15px] w-px bg-border" />

                        <div className="space-y-6">
                            {activities?.map((activity) => (
                                <div key={activity.id} className="relative flex gap-4 group">
                                    <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background ring-2 ring-border group-hover:ring-primary transition-all">
                                        <ActivityIcon action={activity.action} />
                                    </div>
                                    <div className="flex-1 pt-0.5 space-y-1">
                                        <p className="text-sm">
                                            <span className="font-medium text-muted-foreground">You</span>{' '}
                                            {formatActivityAction(activity)}
                                            {activity.issue && (
                                                <>
                                                    {' '}
                                                    <Link
                                                        to="/issue/$issueId"
                                                        params={{ issueId: activity.issue.id }}
                                                        className="font-medium text-foreground hover:underline"
                                                    >
                                                        {activity.project?.identifier}-{activity.issue.number}
                                                    </Link>
                                                </>
                                            )}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function ActivityIcon({ action }: { action: string }) {
    switch (action) {
        case 'created': return <PlusCircle className="h-3.5 w-3.5 text-green-500" />;
        case 'deleted': return <Trash2 className="h-3.5 w-3.5 text-red-500" />;
        case 'commented': return <MessageSquare className="h-3.5 w-3.5 text-blue-500" />;
        case 'status_changed': return <GitCommit className="h-3.5 w-3.5 text-purple-500" />;
        case 'updated': return <Edit className="h-3.5 w-3.5 text-orange-500" />;
        case 'labeled': return <Tag className="h-3.5 w-3.5 text-yellow-500" />;
        default: return <Activity className="h-3.5 w-3.5 text-zinc-500" />;
    }
}

function formatActivityAction(activity: any): string {
    switch (activity.action) {
        case 'created': return 'created issue';
        case 'updated': return 'updated';
        case 'deleted': return 'deleted issue';
        case 'status_changed': return 'changed status of';
        case 'assigned': return 'assigned';
        case 'unassigned': return 'unassigned';
        case 'commented': return 'commented on';
        case 'labeled': return 'added label to';
        case 'unlabeled': return 'removed label from';
        default: return activity.action.replace('_', ' ');
    }
}
