
export interface WebSocketMessage {
    type: string;
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

export type MessageHandler = (ws: WebSocket, message: WebSocketMessage) => Promise<void> | void;
