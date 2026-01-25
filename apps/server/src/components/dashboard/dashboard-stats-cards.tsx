import { StatCard } from './stat-card';
import { useDashboardStats } from '@/hooks/use-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import {
    CircleDashed,
    Circle,
    ArrowUpCircle,
    CheckCircle2,
} from 'lucide-react';

export function DashboardStatsCards() {
    const { data: stats, isLoading } = useDashboardStats();

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
                label="Backlog"
                count={stats.assigned.backlog || 0}
                icon={CircleDashed}
                variant="default"
                href={"/issues?status=backlog" as any}
            />
            <StatCard
                label="Todo"
                count={stats.assigned.todo || 0}
                icon={Circle}
                variant="info"
                href={"/issues?status=todo" as any}
            />
            <StatCard
                label="In Progress"
                count={stats.assigned.inProgress || 0}
                icon={ArrowUpCircle}
                variant="warning"
                href={"/issues?status=in_progress" as any}
            />
            <StatCard
                label="Done"
                count={stats.assigned.done || 0}
                icon={CheckCircle2}
                variant="success"
                href={"/issues?status=done" as any}
            />
        </div>
    );
}
