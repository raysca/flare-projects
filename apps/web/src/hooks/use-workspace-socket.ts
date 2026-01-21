import { useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "./use-socket";
import { projectKeys } from "../lib/query-keys";
import { Issue } from "../types/issues";
import {
    WebSocketMessage,
    IssueCreatedEvent,
    IssueUpdatedEvent,
    IssueDeletedEvent,
    UserJoinedEvent,
    UserLeftEvent
} from "../types/websocket";
import { usePresenceStore } from "../stores/presence-store";

export function useWorkspaceSocket(projectId: string | undefined) {
    const queryClient = useQueryClient();
    const projectIdRef = useRef(projectId);
    projectIdRef.current = projectId; // Keep ref updated for callbacks

    const handleMessage = useCallback((message: WebSocketMessage) => {
        const currentProjectId = projectIdRef.current;
        if (!currentProjectId) return;

        console.log("WebSocket message received:", message.type, message.payload);

        switch (message.type) {
            case "issue_created": {
                const event = message as IssueCreatedEvent;
                const newIssue = event.payload as Issue;

                queryClient.setQueryData<Issue[]>(
                    projectKeys.issues(currentProjectId),
                    (oldIssues = []) => {
                        // Avoid duplicates
                        if (oldIssues.some(i => i.id === newIssue.id)) return oldIssues;
                        return [newIssue, ...oldIssues];
                    }
                );
                break;
            }
            case "issue_updated": {
                const event = message as IssueUpdatedEvent;
                const updatedIssue = event.payload as Issue;

                queryClient.setQueryData<Issue[]>(
                    projectKeys.issues(currentProjectId),
                    (oldIssues = []) => {
                        return oldIssues.map(issue =>
                            issue.id === updatedIssue.id ? updatedIssue : issue
                        );
                    }
                );
                break;
            }
            case "issue_deleted": {
                const event = message as IssueDeletedEvent;
                const { id } = event.payload;

                queryClient.setQueryData<Issue[]>(
                    projectKeys.issues(currentProjectId),
                    (oldIssues = []) => {
                        return oldIssues.filter(issue => issue.id !== id);
                    }
                );
                break;
            }
            case "user_joined": {
                const event = message as UserJoinedEvent;
                // Add minimal delay to ensure store is ready? No, synchronous.
                usePresenceStore.getState().setUserOnline(currentProjectId, event.payload);
                break;
            }
            case "user_left": {
                const event = message as UserLeftEvent;
                usePresenceStore.getState().setUserOffline(currentProjectId, event.payload.userId);
                break;
            }
            default:
                break;
        }
    }, [queryClient]);

    const socket = useSocket(projectId ? `/projects/${projectId}/ws` : "", {
        enabled: !!projectId,
        onMessage: handleMessage
    });

    return socket;
}
