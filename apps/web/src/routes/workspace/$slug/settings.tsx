import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/workspace/$slug/settings')({
    component: SettingsPage,
})

function SettingsPage() {
    return <div>Settings Page (Coming Soon)</div>
}
