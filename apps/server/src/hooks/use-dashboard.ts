import { useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSocket } from './use-socket'
import { apiFetch } from '@/lib/api'
import { dashboardKeys } from '@/lib/query-keys'
import type {
    DashboardStats,
    DashboardOverdueIssue,
    DashboardIssuesResponse,
    DashboardActivity,
    DashboardMention,
} from '@/types/dashboard'
import type {
    WebSocketMessage,
    IssueCreatedEvent,
    IssueUpdatedEvent,
    IssueDeletedEvent,
} from '../types/websocket'

// 2.1 Stats Hook
export function useDashboardStats() {
    return useQuery({
        queryKey: dashboardKeys.stats(),
        queryFn: () => apiFetch<DashboardStats>('/dashboard/stats'),
        staleTime: 30 * 1000, // 30 seconds
    })
}

// 2.2 Overdue Hook
export function useDashboardOverdue(limit = 5) {
    return useQuery({
        queryKey: dashboardKeys.overdue(),
        queryFn: () => apiFetch<DashboardOverdueIssue[]>(`/dashboard/overdue?limit=${limit}`),
        staleTime: 60 * 1000,
    })
}

// 2.3 Issues Hook
export function useDashboardIssues({
    filter,
    limit = 50,
    offset = 0,
}: {
    filter: 'assigned' | 'reported' | 'watching'
    limit?: number
    offset?: number
}) {
    return useQuery({
        queryKey: dashboardKeys.issues(filter),
        queryFn: () =>
            apiFetch<DashboardIssuesResponse>(
                `/dashboard/issues?filter=${filter}&limit=${limit}&offset=${offset}`,
            ),
        staleTime: 30 * 1000,
    })
}

// 2.4 Activity Hook
export function useDashboardActivity(limit = 10) {
    return useQuery({
        queryKey: dashboardKeys.activity(),
        queryFn: () => apiFetch<DashboardActivity[]>(`/dashboard/activity?limit=${limit}`),
        staleTime: 60 * 1000,
    })
}

// 2.5 Mentions Hook
export function useDashboardMentions(limit = 10) {
    return useQuery({
        queryKey: dashboardKeys.mentions(),
        queryFn: () => apiFetch<DashboardMention[]>(`/dashboard/mentions?limit=${limit}`),
        staleTime: 2 * 60 * 1000, // 2 minutes
    })
}

// 4.2 WebSocket Integration
export function useDashboardSocket() {
    const queryClient = useQueryClient()

    const invalidateDashboard = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() })
        queryClient.invalidateQueries({ queryKey: dashboardKeys.issues() }) // invalidates all filters
        queryClient.invalidateQueries({ queryKey: dashboardKeys.overdue() })
        queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() })
    }, [queryClient])

    return { invalidateDashboard }
}
