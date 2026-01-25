import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { Link } from '@tanstack/react-router';

const statCardVariants = cva(
    'transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer border-l-4',
    {
        variants: {
            variant: {
                default: 'border-l-zinc-500 hover:border-l-zinc-400',
                warning: 'border-l-yellow-500 hover:border-l-yellow-400',
                success: 'border-l-green-500 hover:border-l-green-400',
                info: 'border-l-blue-500 hover:border-l-blue-400',
                destructive: 'border-l-red-500 hover:border-l-red-400',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

interface StatCardProps extends VariantProps<typeof statCardVariants> {
    icon: LucideIcon;
    label: string;
    count: number;
    href?: string;
    className?: string;
}

export function StatCard({
    icon: Icon,
    label,
    count,
    variant,
    href,
    className,
}: StatCardProps) {
    const content = (
        <Card className={cn(statCardVariants({ variant }), className)}>
            <CardContent className="flex items-center justify-between p-6">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                    <div className="text-2xl font-bold">{count}</div>
                </div>
                <div className={cn("p-2 rounded-full bg-muted/50", {
                    "text-zinc-500": variant === 'default',
                    "text-yellow-500": variant === 'warning',
                    "text-green-500": variant === 'success',
                    "text-blue-500": variant === 'info',
                    "text-red-500": variant === 'destructive',
                })}>
                    <Icon className="h-6 w-6" />
                </div>
            </CardContent>
        </Card>
    );

    if (href) {
        return (
            <Link to={href} className="block">
                {content}
            </Link>
        );
    }

    return content;
}
