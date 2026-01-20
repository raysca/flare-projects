import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { projectKeys, issueKeys } from '@/lib/query-keys'
import type {
  Project,
  ProjectListItem,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectMember,
  Invitation,
  CreateInvitationInput,
} from '@/types/projects'
import type { Issue } from '@/types/issues'

// Fetch projects for the authenticated user
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: () => apiFetch<ProjectListItem[]>('/projects'),
  })
}

// Fetch a single project by ID
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(projectId ?? ''),
    queryFn: () => apiFetch<Project>(`/projects/${projectId}`),
    enabled: !!projectId,
  })
}

// Fetch issues for a project
export function useProjectIssues(projectId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.issues(projectId ?? ''),
    queryFn: async () => {
      // Fetch issues filtered by project
      return apiFetch<Issue[]>(`/issues?projectId=${projectId}`)
    },
    enabled: !!projectId,
  })
}

// Fetch project members
export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.members(projectId ?? ''),
    queryFn: () => apiFetch<ProjectMember[]>(`/projects/${projectId}/members`),
    enabled: !!projectId,
  })
}

// Create a new project
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      apiFetch<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      // Invalidate projects list to refetch
      queryClient.invalidateQueries({
        queryKey: projectKeys.lists(),
      })
    },
  })
}

// Update a project with optimistic updates
export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      input,
    }: {
      projectId: string
      input: UpdateProjectInput
    }) =>
      apiFetch<Project>(`/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onMutate: async ({ projectId, input }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: projectKeys.detail(projectId) })
      await queryClient.cancelQueries({ queryKey: projectKeys.lists() })

      // Snapshot previous values
      const previousProject = queryClient.getQueryData<Project>(
        projectKeys.detail(projectId)
      )
      const previousLists = queryClient.getQueriesData<ProjectListItem[]>({
        queryKey: projectKeys.lists(),
      })

      // Helper to merge update input with project
      const mergeUpdate = <T extends Project | ProjectListItem>(project: T): T => {
        const merged = { ...project }

        // Apply nullable fields
        if ('leadId' in input) {
          if (input.leadId === null) {
            ; (merged as Project).lead = undefined
          }
        }

        // Apply other fields
        if (input.name !== undefined) merged.name = input.name
        if (input.identifier !== undefined) merged.identifier = input.identifier
        if (input.status !== undefined) merged.status = input.status
        if (input.progress !== undefined) merged.progress = input.progress

        // Date fields
        if ('description' in merged && input.description !== undefined) {
          ; (merged as Project).description = input.description
        }
        if ('startDate' in merged && input.startDate !== undefined) {
          ; (merged as Project).startDate =
            input.startDate === null ? undefined : input.startDate
        }
        if (input.targetDate !== undefined) {
          merged.targetDate =
            input.targetDate === null ? undefined : input.targetDate
        }

        return merged
      }

      // Optimistically update the project detail
      if (previousProject) {
        queryClient.setQueryData<Project>(
          projectKeys.detail(projectId),
          mergeUpdate(previousProject)
        )
      }

      // Optimistically update project in lists
      previousLists.forEach(([queryKey, projects]) => {
        if (projects) {
          queryClient.setQueryData<ProjectListItem[]>(
            queryKey,
            projects.map((project) =>
              project.id === projectId ? mergeUpdate(project) : project
            )
          )
        }
      })

      return { previousProject, previousLists }
    },
    onError: (_err, { projectId }, context) => {
      // Rollback on error
      if (context?.previousProject) {
        queryClient.setQueryData(
          projectKeys.detail(projectId),
          context.previousProject
        )
      }
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, projects]) => {
          queryClient.setQueryData(queryKey, projects)
        })
      }
    },
    onSettled: (_data, _err, { projectId }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

// Delete a project
export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) =>
      apiFetch<void>(`/projects/${projectId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, projectId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      // Also invalidate issues that might reference this project
      queryClient.invalidateQueries({ queryKey: issueKeys.lists() })
    },
  })
}

// Add a member directly (requires user to exist)
export function useAddMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, email, role }: { projectId: string; email: string; role?: string }) =>
      apiFetch(`/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      }),
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) })
    },
  })
}

// Invite a member (creates invitation)
export function useInviteMember() {
  return useMutation({
    mutationFn: (input: CreateInvitationInput) =>
      apiFetch<Invitation>('/invitations', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    // We don't necessarily update members list until they accept, 
    // but we might want to refetch invitations list if we had one.
    // For now do nothing or optimistically notify.
  })
}

// Remove a member
export function useRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, userId }: { projectId: string; userId: string }) =>
      apiFetch(`/projects/${projectId}/members/${userId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) })
    },
  })
}

// Update member role
export function useUpdateMemberRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, userId, role }: { projectId: string; userId: string; role: string }) =>
      apiFetch(`/projects/${projectId}/members/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      }),
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) })
    },
  })
}
