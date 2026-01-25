import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useDashboardMentions } from '@/hooks/use-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Bell, AtSign, MessageSquare } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function NotificationsPreviewCard() {
    const { data: mentions, isLoading } = useDashboardMentions();

    return (
        <Card className="col-span-1 h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Mentions
                    {mentions && mentions.length > 0 && (
                        <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                            {mentions.length}
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                {isLoading ? (
                    <div className="space-y-4 pt-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex gap-4">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : mentions?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center space-y-3">
                        <div className="p-3 bg-muted rounded-full">
                            <AtSign className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">No recent mentions.</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {mentions?.map((mention) => (
                            <Link
                                key={mention.id}
                                to="/issue/$issueId"
                                params={{ issueId: mention.issue?.id ?? '' }}
                                className={cn(
                                    "flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors",
                                    !mention.isRead && "bg-blue-50/50 dark:bg-blue-950/20"
                                )}
                            >
                                <div className="mt-1">
                                    {mention.type === 'comment_mentioned' ? (
                                        <MessageSquare className="h-4 w-4 text-blue-500" />
                                    ) : (
                                        <AtSign className="h-4 w-4 text-orange-500" />
                                    )}
                                </div>
                                <div className="space-y-1 overflow-hidden">
                                    <p className="text-sm line-clamp-2">
                                        <span className="font-semibold text-foreground">
                                            {mention.project?.identifier}-{mention.issue?.number}
                                        </span>{' '}
                                        {mention.issue?.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {mention.message}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {formatDistanceToNow(new Date(mention.createdAt), { addSuffix: true })}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </CardContent>
            <div className="p-4 border-t pt-2">
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground" disabled>
                    View all notifications (Coming Soon)
                </Button>
            </div>
        </Card>
    );
}
