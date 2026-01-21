import type { IssueFilters } from '@/types/issues'

// Query key factories for TanStack Query
// Following the pattern from TanStack Query docs

export const issueKeys = {
  all: ['issues'] as const,
  lists: () => [...issueKeys.all, 'list'] as const,
  list: (filters?: IssueFilters) => [...issueKeys.lists(), filters] as const,
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
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  issues: (projectId: string) =>
    [...projectKeys.detail(projectId), 'issues'] as const,
  members: (projectId: string) =>
    [...projectKeys.detail(projectId), 'members'] as const,
}

export const labelKeys = {
  all: ['labels'] as const,
  lists: () => [...labelKeys.all, 'list'] as const,
  list: (projectId: string) => [...labelKeys.lists(), projectId] as const,
  details: () => [...labelKeys.all, 'detail'] as const,
  detail: (id: string) => [...labelKeys.details(), id] as const,
}
