import { useRef, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "./use-socket";
import { issueKeys } from "../lib/query-keys";
import { Issue, Comment } from "../types/issues";
import {
    WebSocketMessage,
    IssueUpdatedEvent,
    CommentCreatedEvent,
    UserJoinedEvent,
    UserLeftEvent,
    TypingEvent,
    CurrentUsersEvent
} from "../types/websocket";
import { usePresenceStore } from "../stores/presence-store";

export function useIssueSocket(issueId: string | undefined) {
    const queryClient = useQueryClient();
    const issueIdRef = useRef(issueId);
    issueIdRef.current = issueId;

    const handleMessage = useCallback((message: WebSocketMessage) => {
        const currentIssueId = issueIdRef.current;
        if (!currentIssueId) return;

        console.log("Issue WebSocket message:", message.type);

        switch (message.type) {
            case "current_users": {
                const event = message as CurrentUsersEvent;
                const users = event.payload;
                users.forEach(user => {
                    usePresenceStore.getState().setUserOnline(currentIssueId, user);
                });
                break;
            }
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
            case "user_viewing_issue": {
                const event = message as UserJoinedEvent;
                usePresenceStore.getState().setUserOnline(currentIssueId, event.payload);
                break;
            }
            case "user_left_issue": {
                const event = message as UserLeftEvent;
                usePresenceStore.getState().setUserOffline(currentIssueId, event.payload.userId);
                break;
            }
            case "user_typing": {
                const event = message as TypingEvent;
                usePresenceStore.getState().setTyping(currentIssueId, event.payload.userId, event.payload.isTyping);
                break;
            }
            default:
                break;
        }
    }, [queryClient]);

    const socketOptions = useMemo(() => ({
        enabled: !!issueId,
        onMessage: handleMessage
    }), [!!issueId, handleMessage]);

    const socket = useSocket(issueId ? `/issues/${issueId}/ws` : "", socketOptions);

    const sendTyping = useCallback((isTyping: boolean) => {
        if (!socket.isConnected) return;

        socket.sendMessage({
            type: "user_typing",
            payload: { isTyping }
        });
    }, [socket]);

    return useMemo(() => ({ ...socket, sendTyping }), [socket.isConnected, socket.sendMessage, sendTyping]);
}
