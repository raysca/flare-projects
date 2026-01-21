import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { labelKeys } from '@/lib/query-keys'
import type { Label } from '@/types/issues'

export interface CreateLabelInput {
  name: string
  color: string
  description?: string
  projectId: string
}

export function useProjectLabels(projectId: string | undefined) {
  return useQuery({
    queryKey: labelKeys.list(projectId ?? ''),
    queryFn: () => apiFetch<Label[]>(`/projects/${projectId}/labels`),
    enabled: !!projectId,
  })
}
