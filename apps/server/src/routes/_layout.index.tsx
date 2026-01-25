import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { DashboardStatsCards } from '@/components/dashboard/dashboard-stats-cards'
import { OverdueIssuesCard } from '@/components/dashboard/overdue-issues-card'
import { NotificationsPreviewCard } from '@/components/dashboard/notifications-preview-card'
import { MyIssuesCard } from '@/components/dashboard/my-issues-card'
import { RecentActivityCard } from '@/components/dashboard/recent-activity-card'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'

export const Route = createFileRoute('/_layout/')({
  component: DashboardPage,
})

function DashboardPage() {
  const navigate = useNavigate()
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false)

  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'c',
        handler: () => navigate({ to: '/create-issue' }),
      },
      { key: '?', handler: () => setShortcutsDialogOpen(true) },
    ],
    enabled: true,
  })

  return (
    <div className="space-y-6 pb-12">
      <DashboardHeader />

      <DashboardStatsCards />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-[300px]">
          <OverdueIssuesCard />
        </div>
        <div className="h-[300px]">
          <NotificationsPreviewCard />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-[400px]">
          <MyIssuesCard />
        </div>
        <div className="h-[400px]">
          <RecentActivityCard />
        </div>
      </div>
    </div>
  )
}
