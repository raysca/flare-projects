import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { workspaceKeys } from '@/lib/query-keys'
import type { Workspace, Team, User, Label, Project } from '@/types/issues'

// Fetch all workspaces for the current user
export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.lists(),
    queryFn: () => apiFetch<Workspace[]>('/workspaces'),
  })
}

// Fetch workspace by slug
export function useWorkspaceBySlug(slug: string) {
  const { data: workspaces, ...rest } = useWorkspaces()

  const workspace = workspaces?.find((w) => w.slug === slug)

  return {
    ...rest,
    data: workspace,
    workspaces,
  }
}

// Fetch teams for a workspace
export function useWorkspaceTeams(workspaceId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.teams(workspaceId ?? ''),
    queryFn: () => apiFetch<Team[]>(`/workspaces/${workspaceId}/teams`),
    enabled: !!workspaceId,
  })
}

// Workspace member type (extends User with role)
interface WorkspaceMember extends User {
  role: 'owner' | 'admin' | 'member'
}

// Fetch members for a workspace
export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId ?? ''),
    queryFn: () =>
      apiFetch<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),
    enabled: !!workspaceId,
  })
}

// Fetch labels for a workspace
export function useWorkspaceLabels(workspaceId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.labels(workspaceId ?? ''),
    queryFn: () => apiFetch<Label[]>(`/workspaces/${workspaceId}/labels`),
    enabled: !!workspaceId,
  })
}

// Fetch projects for a workspace
export function useWorkspaceProjects(workspaceId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.projects(workspaceId ?? ''),
    queryFn: () => apiFetch<Project[]>(`/projects?workspaceId=${workspaceId}`),
    enabled: !!workspaceId,
  })
}
