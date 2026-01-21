import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface User {
  id: string
  name: string
  avatarUrl?: string
  email: string
}

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: string) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  me: () => [...userKeys.all, 'me'] as const,
}

export function useUsers() {
  return useQuery({
    queryKey: userKeys.lists(),
    queryFn: () => apiFetch<User[]>('/users'),
  })
}

export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: userKeys.detail(userId ?? ''),
    queryFn: () => apiFetch<User>(`/users/${userId}`),
    enabled: !!userId,
  })
}

export function useMe() {
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: () => apiFetch<User>('/users/me'),
  })
}
