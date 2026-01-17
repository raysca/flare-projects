import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/workspace/$slug/team')({
  component: TeamPage,
})

function TeamPage() {
  return <div>Team Page (Coming Soon)</div>
}
