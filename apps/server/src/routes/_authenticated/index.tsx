import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Issues</h1>
        <p className="text-muted-foreground">
          View and manage issues assigned to you
        </p>
      </div>

      {/* Placeholder for issue list - will be implemented in Phase 3/4 */}
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Issue list coming soon. This page will show issues assigned to you.
        </p>
      </div>
    </div>
  );
}
