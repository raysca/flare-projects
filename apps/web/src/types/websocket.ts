export interface WebSocketMessage {
    type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload?: any;
    senderId?: string;
    timestamp?: number;
}

export interface UserPresence {
    userId: string;
    userName: string;
    avatarUrl?: string;
    connectedAt: number;
}

// Specific Event Payloads

export interface IssueCreatedEvent extends WebSocketMessage {
    type: "issue_created";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any; // Ideally mapped to Issue type
}

export interface IssueUpdatedEvent extends WebSocketMessage {
    type: "issue_updated";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any;
}

export interface IssueDeletedEvent extends WebSocketMessage {
    type: "issue_deleted";
    payload: { id: string };
}

export interface CommentCreatedEvent extends WebSocketMessage {
    type: "comment_created";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any; // Comment type
}

export interface UserJoinedEvent extends WebSocketMessage {
    type: "user_joined" | "user_viewing_issue";
    payload: UserPresence;
}

export interface UserLeftEvent extends WebSocketMessage {
    type: "user_left" | "user_left_issue";
    payload: { userId: string };
}
