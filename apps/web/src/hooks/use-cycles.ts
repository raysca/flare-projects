import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { cycleKeys, issueKeys } from '@/lib/query-keys'
import type {
  Cycle,
  CycleWithStats,
  CreateCycleInput,
  UpdateCycleInput,
  Issue,
} from '@/types/issues'

// Re-export types for convenience
export type { CreateCycleInput, UpdateCycleInput }

// Get all cycles for a project
export function useProjectCycles(projectId: string | undefined) {
  return useQuery({
    queryKey: cycleKeys.list(projectId ?? ''),
    queryFn: () => apiFetch<Cycle[]>(`/cycles?projectId=${projectId}`),
    enabled: !!projectId,
  })
}

// Get a single cycle by ID
export function useCycle(cycleId: string | undefined) {
  return useQuery({
    queryKey: cycleKeys.detail(cycleId ?? ''),
    queryFn: () => apiFetch<Cycle>(`/cycles/${cycleId}`),
    enabled: !!cycleId,
  })
}

// Get cycle with stats (issues count, progress)
export function useCycleWithStats(cycleId: string | undefined) {
  return useQuery({
    queryKey: [...cycleKeys.detail(cycleId ?? ''), 'stats'],
    queryFn: () => apiFetch<CycleWithStats>(`/cycles/${cycleId}/stats`),
    enabled: !!cycleId,
  })
}

// Get issues for a specific cycle
export function useCycleIssues(
  cycleId: string | undefined,
  projectId: string | undefined,
) {
  return useQuery({
    queryKey: [...cycleKeys.detail(cycleId ?? ''), 'issues'],
    queryFn: () =>
      apiFetch<Issue[]>(`/issues?cycleId=${cycleId}&projectId=${projectId}`),
    enabled: !!cycleId && !!projectId,
  })
}

// Create a new cycle
export function useCreateCycle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateCycleInput) =>
      apiFetch<Cycle>('/cycles', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: cycleKeys.list(data.projectId ?? ''),
      })
    },
  })
}

// Update an existing cycle
export function useUpdateCycle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      cycleId,
      input,
    }: {
      cycleId: string
      input: UpdateCycleInput
    }) =>
      apiFetch<Cycle>(`/cycles/${cycleId}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      // Invalidate both detail and list queries
      queryClient.invalidateQueries({
        queryKey: cycleKeys.detail(data.id),
      })
      queryClient.invalidateQueries({
        queryKey: cycleKeys.list(data.projectId ?? ''),
      })
    },
  })
}

// Delete a cycle
export function useDeleteCycle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ cycleId }: { cycleId: string; projectId: string }) =>
      apiFetch<void>(`/cycles/${cycleId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({
        queryKey: cycleKeys.list(projectId),
      })
      // Also invalidate issues since they may have had their cycleId set to null
      queryClient.invalidateQueries({
        queryKey: issueKeys.all,
      })
    },
  })
}

// Add issue to cycle
export function useAddIssueToCycle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ issueId, cycleId }: { issueId: string; cycleId: string }) =>
      apiFetch<Issue>(`/issues/${issueId}`, {
        method: 'PATCH',
        body: JSON.stringify({ cycleId }),
      }),
    onSuccess: (data) => {
      // Invalidate issue queries
      queryClient.invalidateQueries({
        queryKey: issueKeys.detail(data.id),
      })
      queryClient.invalidateQueries({
        queryKey: issueKeys.all,
      })
      // Invalidate cycle stats
      if (data.cycleId) {
        queryClient.invalidateQueries({
          queryKey: cycleKeys.detail(data.cycleId),
        })
      }
    },
  })
}

// Remove issue from cycle
export function useRemoveIssueFromCycle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      issueId,
    }: {
      issueId: string
      previousCycleId: string
    }) =>
      apiFetch<Issue>(`/issues/${issueId}`, {
        method: 'PATCH',
        body: JSON.stringify({ cycleId: null }),
      }),
    onSuccess: (data, { previousCycleId }) => {
      // Invalidate issue queries
      queryClient.invalidateQueries({
        queryKey: issueKeys.detail(data.id),
      })
      queryClient.invalidateQueries({
        queryKey: issueKeys.all,
      })
      // Invalidate the previous cycle's stats
      queryClient.invalidateQueries({
        queryKey: cycleKeys.detail(previousCycleId),
      })
    },
  })
}
