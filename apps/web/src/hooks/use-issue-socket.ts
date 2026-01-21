import { useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "./use-socket";
import { issueKeys } from "../lib/query-keys";
import { Issue, Comment } from "../types/issues";
import {
    WebSocketMessage,
    IssueUpdatedEvent,
    CommentCreatedEvent
} from "../types/websocket";

export function useIssueSocket(issueId: string | undefined) {
    const queryClient = useQueryClient();
    const issueIdRef = useRef(issueId);
    issueIdRef.current = issueId;

    const handleMessage = useCallback((message: WebSocketMessage) => {
        const currentIssueId = issueIdRef.current;
        if (!currentIssueId) return;

        console.log("Issue WebSocket message:", message.type);

        switch (message.type) {
            case "issue_updated": {
                const event = message as IssueUpdatedEvent;
                const updatedIssue = event.payload as Issue;

                // Update specific issue detail
                queryClient.setQueryData<Issue>(
                    issueKeys.detail(currentIssueId),
                    (oldIssue) => {
                        if (!oldIssue) return updatedIssue;
                        return { ...oldIssue, ...updatedIssue };
                    }
                );
                break;
            }
            case "comment_created": {
                const event = message as CommentCreatedEvent;
                const newComment = event.payload as Comment;

                // Update comments list
                queryClient.setQueryData<Comment[]>(
                    issueKeys.comments(currentIssueId),
                    (oldComments = []) => {
                        if (oldComments.some(c => c.id === newComment.id)) return oldComments;
                        return [newComment, ...oldComments];
                    }
                );
                break;
            }
            default:
                break;
        }
    }, [queryClient]);

    const socket = useSocket(issueId ? `/issues/${issueId}/ws` : "", {
        enabled: !!issueId,
        onMessage: handleMessage
    });

    return socket;
}
