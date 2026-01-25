import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useDashboardOverdue } from '@/hooks/use-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CalendarClock, ArrowRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

export function OverdueIssuesCard() {
    const { data: overdueIssues, isLoading } = useDashboardOverdue();

    return (
        <Card className="col-span-1 h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-red-500" />
                    Overdue Issues
                </CardTitle>
                {overdueIssues && overdueIssues.length > 0 && (
                    <Badge variant="destructive" className="rounded-full px-2.5">
                        {overdueIssues.length}
                    </Badge>
                )}
            </CardHeader>
            <CardContent className="flex-1">
                {isLoading ? (
                    <div className="space-y-4 pt-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-3 w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : overdueIssues?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center space-y-3">
                        <div className="p-3 bg-muted rounded-full">
                            <CheckCircleIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-medium">All caught up!</p>
                            <p className="text-sm text-muted-foreground">No overdue issues found.</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1 pt-2">
                        {overdueIssues?.map((issue) => (
                            <Link
                                key={issue.id}
                                to="/issue/$issueId"
                                params={{ issueId: issue.id }}
                                className="flex items-start justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground">
                                            {issue.project.identifier}-{issue.number}
                                        </span>
                                        <span className="text-sm font-medium line-clamp-1">
                                            {issue.title}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-red-600 font-medium">
                                        <AlertCircle className="h-3 w-3" />
                                        {issue.daysOverdue} {issue.daysOverdue === 1 ? 'day' : 'days'} overdue
                                    </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                        ))}
                    </div>
                )}
            </CardContent>
            {overdueIssues && overdueIssues.length > 0 && (
                <div className="p-4 border-t pt-2">
                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground" asChild>
                        <Link to={"/issues" as any}>View all issues</Link>
                    </Button>
                </div>
            )}
        </Card>
    );
}

function CheckCircleIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    )
}
