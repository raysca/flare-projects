import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/projects/$projectId/cycles/$cycleId')({
    component: CycleDetail,
})

function CycleDetail() {
    return <div>Cycle Detail (Implementation Pending)</div>
}
