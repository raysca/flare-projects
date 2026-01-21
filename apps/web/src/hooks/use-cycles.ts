import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { cycleKeys } from "@/lib/query-keys";
import type { Cycle } from "@/types/issues";

export interface CreateCycleInput {
    projectId: string;
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
}

export interface UpdateCycleInput {
    name?: string;
    description?: string;
    status?: "upcoming" | "active" | "completed";
    startDate?: string;
    endDate?: string;
    progress?: number;
}

export function useProjectCycles(projectId: string | undefined) {
    return useQuery({
        queryKey: cycleKeys.list(projectId ?? ""),
        queryFn: () => apiFetch<Cycle[]>(`/cycles?projectId=${projectId}`),
        enabled: !!projectId,
    });
}

export function useCreateCycle() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CreateCycleInput) =>
            apiFetch<Cycle>("/cycles", {
                method: "POST",
                body: JSON.stringify(input),
            }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: cycleKeys.list(data.projectId ?? ""),
            });
        },
    });
}
