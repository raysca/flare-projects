import type { IssueFilters } from '@/types/issues'

// Query key factories for TanStack Query
// Following the pattern from TanStack Query docs

export const workspaceKeys = {
  all: ['workspaces'] as const,
  lists: () => [...workspaceKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) =>
    [...workspaceKeys.lists(), filters] as const,
  details: () => [...workspaceKeys.all, 'detail'] as const,
  detail: (id: string) => [...workspaceKeys.details(), id] as const,
  bySlug: (slug: string) => [...workspaceKeys.all, 'slug', slug] as const,
  teams: (workspaceId: string) =>
    [...workspaceKeys.detail(workspaceId), 'teams'] as const,
  members: (workspaceId: string) =>
    [...workspaceKeys.detail(workspaceId), 'members'] as const,
  labels: (workspaceId: string) =>
    [...workspaceKeys.detail(workspaceId), 'labels'] as const,
  projects: (workspaceId: string) =>
    [...workspaceKeys.detail(workspaceId), 'projects'] as const,
}

export const issueKeys = {
  all: ['issues'] as const,
  lists: () => [...issueKeys.all, 'list'] as const,
  list: (workspaceId: string, filters?: IssueFilters) =>
    [...issueKeys.lists(), workspaceId, filters] as const,
  details: () => [...issueKeys.all, 'detail'] as const,
  detail: (id: string) => [...issueKeys.details(), id] as const,
  comments: (issueId: string) =>
    [...issueKeys.detail(issueId), 'comments'] as const,
}

export const userKeys = {
  all: ['users'] as const,
  me: () => [...userKeys.all, 'me'] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
}

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (workspaceId: string) =>
    [...projectKeys.lists(), workspaceId] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
}

export const teamKeys = {
  all: ['teams'] as const,
  lists: () => [...teamKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...teamKeys.lists(), workspaceId] as const,
  details: () => [...teamKeys.all, 'detail'] as const,
  detail: (id: string) => [...teamKeys.details(), id] as const,
}

export const labelKeys = {
  all: ['labels'] as const,
  lists: () => [...labelKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...labelKeys.lists(), workspaceId] as const,
  details: () => [...labelKeys.all, 'detail'] as const,
  detail: (id: string) => [...labelKeys.details(), id] as const,
}
