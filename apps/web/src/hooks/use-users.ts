import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { userKeys } from '@/lib/query-keys'
import type { User } from '@/types/issues'

// Fetch all users
export function useUsers() {
    return useQuery({
        queryKey: userKeys.all,
        queryFn: () => apiFetch<User[]>('/users'),
    })
}

// Fetch current user
export function useMe() {
    return useQuery({
        queryKey: userKeys.me(),
        queryFn: () => apiFetch<User>('/users/me'),
    })
}

// Fetch single user
export function useUser(userId: string) {
    return useQuery({
        queryKey: userKeys.detail(userId),
        queryFn: () => apiFetch<User>(`/users/${userId}`),
        enabled: !!userId,
    })
}
