import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/projects/$projectId/cycles/$cycleId')({
    component: RouteComponent,
})

function RouteComponent() {
    return <div>Cycle Detail (Implementation Pending)</div>
}
