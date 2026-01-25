import { useState } from 'react';
import { useMe } from '@/hooks/use-users';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts-dialog';
import { Plus, Keyboard } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export function DashboardHeader() {
    const { data: user, isLoading } = useMe();
    const [showShortcuts, setShowShortcuts] = useState(false);

    // Get greeting based on time of day
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between py-6">
            <div className="space-y-1">
                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {greeting}, {user?.name.split(' ')[0]}!
                        </h1>
                        <p className="text-muted-foreground">
                            Here's what's happening in your projects today.
                        </p>
                    </>
                )}
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowShortcuts(true)}
                    title="Keyboard shortcuts (?)"
                >
                    <Keyboard className="h-4 w-4" />
                </Button>

                <Button asChild>
                    <Link to="/create-issue">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Issue
                    </Link>
                </Button>
            </div>

            <KeyboardShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
        </div>
    );
}
