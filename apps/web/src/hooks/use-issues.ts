import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { issueKeys } from '@/lib/query-keys'
import type {
  Issue,
  Comment,
  IssueFilters,
  CreateIssueInput,
  UpdateIssueInput,
} from '@/types/issues'

// Build query string from filters
// Build query string from filters
function buildQueryString(filters?: IssueFilters): string {
  const params = new URLSearchParams()

  if (filters?.status?.length) {
    filters.status.forEach((s) => params.append('status', s))
  }
  if (filters?.priority?.length) {
    filters.priority.forEach((p) => params.append('priority', p))
  }
  if (filters?.assigneeId) {
    params.set('assigneeId', filters.assigneeId)
  }
  if (filters?.labelIds?.length) {
    filters.labelIds.forEach((l) => params.append('labelId', l))
  }
  if (filters?.projectId) {
    params.set('projectId', filters.projectId)
  }
  if (filters?.search) {
    params.set('search', filters.search)
  }

  return params.toString()
}

// Fetch issues with optional filters
export function useIssues(filters?: IssueFilters) {
  return useQuery({
    queryKey: issueKeys.list(filters),
    queryFn: () => apiFetch<Issue[]>(`/issues?${buildQueryString(filters)}`),
  })
}

// Fetch a single issue by ID
export function useIssue(issueId: string | undefined) {
  return useQuery({
    queryKey: issueKeys.detail(issueId ?? ''),
    queryFn: () => apiFetch<Issue>(`/issues/${issueId}`),
    enabled: !!issueId,
  })
}

// Fetch comments for an issue
export function useIssueComments(issueId: string | undefined) {
  return useQuery({
    queryKey: issueKeys.comments(issueId ?? ''),
    queryFn: () => apiFetch<Comment[]>(`/issues/${issueId}/comments`),
    enabled: !!issueId,
  })
}

// Create a new issue
export function useCreateIssue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateIssueInput) =>
      apiFetch<Issue>('/issues', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      // Invalidate issues list to refetch
      queryClient.invalidateQueries({
        queryKey: issueKeys.lists(),
      })
    },
  })
}

// Update an issue with optimistic updates
export function useUpdateIssue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      issueId,
      input,
    }: {
      issueId: string
      input: UpdateIssueInput
    }) =>
      apiFetch<Issue>(`/issues/${issueId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onMutate: async ({ issueId, input }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: issueKeys.detail(issueId) })
      await queryClient.cancelQueries({ queryKey: issueKeys.lists() })

      // Snapshot previous values
      const previousIssue = queryClient.getQueryData<Issue>(
        issueKeys.detail(issueId),
      )
      const previousLists = queryClient.getQueriesData<Issue[]>({
        queryKey: issueKeys.lists(),
      })

      // Helper to merge update input with issue, handling null -> undefined conversion
      const mergeUpdate = (issue: Issue): Issue => {
        const merged = { ...issue }

        // Apply string | null fields
        if ('assigneeId' in input) {
          merged.assigneeId =
            input.assigneeId === null ? undefined : input.assigneeId
        }
        if ('projectId' in input) {
          merged.projectId =
            input.projectId === null ? undefined : input.projectId
        }

        // Apply number | null fields
        if ('estimate' in input) {
          merged.estimate = input.estimate === null ? undefined : input.estimate
        }

        // Apply other fields that don't have null handling
        if (input.title !== undefined) merged.title = input.title
        if (input.description !== undefined)
          merged.description = input.description
        if (input.status !== undefined) merged.status = input.status
        if (input.priority !== undefined) merged.priority = input.priority
        if (input.type !== undefined) merged.type = input.type
        if (input.labelIds !== undefined) {
          // Labels need to be updated via refetch, not optimistically
        }
        if (input.dueDate !== undefined) {
          merged.dueDate = input.dueDate === null ? undefined : input.dueDate
        }

        merged.updatedAt = new Date().toISOString()
        return merged
      }

      // Optimistically update the issue detail
      if (previousIssue) {
        queryClient.setQueryData<Issue>(
          issueKeys.detail(issueId),
          mergeUpdate(previousIssue),
        )
      }

      // Optimistically update issue in lists
      previousLists.forEach(([queryKey, issues]) => {
        if (issues) {
          queryClient.setQueryData<Issue[]>(
            queryKey,
            issues.map((issue) =>
              issue.id === issueId ? mergeUpdate(issue) : issue,
            ),
          )
        }
      })

      return { previousIssue, previousLists }
    },
    onError: (_err, { issueId }, context) => {
      // Rollback on error
      if (context?.previousIssue) {
        queryClient.setQueryData(
          issueKeys.detail(issueId),
          context.previousIssue,
        )
      }
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, issues]) => {
          queryClient.setQueryData(queryKey, issues)
        })
      }
    },
    onSettled: (_data, _err, { issueId }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: issueKeys.detail(issueId) })
      queryClient.invalidateQueries({ queryKey: issueKeys.lists() })
    },
  })
}

// Delete an issue
export function useDeleteIssue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (issueId: string) =>
      apiFetch<void>(`/issues/${issueId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, issueId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: issueKeys.detail(issueId) })
      queryClient.invalidateQueries({ queryKey: issueKeys.lists() })
    },
  })
}

// Create a comment
export function useCreateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ issueId, body }: { issueId: string; body: string }) =>
      apiFetch<Comment>(`/issues/${issueId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: (newComment, { issueId }) => {
      // Add to comments cache
      const previousComments = queryClient.getQueryData<Comment[]>(
        issueKeys.comments(issueId),
      )
      if (previousComments) {
        queryClient.setQueryData<Comment[]>(issueKeys.comments(issueId), [
          newComment,
          ...previousComments,
        ])
      } else {
        queryClient.invalidateQueries({ queryKey: issueKeys.comments(issueId) })
      }
    },
  })
}
