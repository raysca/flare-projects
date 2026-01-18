import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/workspace/$slug/cycles/$cycleId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/workspace/$slug/cycles/$cycleId"!</div>
}
