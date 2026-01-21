import { useEffect, useRef, useState, useCallback } from "react";
import { API_URL, getAuthToken } from "../lib/api";
import { WebSocketMessage } from "../types/websocket";

interface UseSocketOptions {
    enabled?: boolean;
    onConnect?: () => void;
    onDisconnect?: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onMessage?: (message: WebSocketMessage) => void;
}

export function useSocket(
    path: string, // e.g., "/projects/123/ws"
    options: UseSocketOptions = {}
) {
    const { enabled = true, onConnect, onDisconnect, onMessage } = options;
    const socketRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const connect = useCallback(() => {
        if (!enabled) return;

        // cleanup existing socket
        if (socketRef.current) {
            // if already connecting or open, do nothing? or force reconnect?
            if (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING) {
                return;
            }
        }

        const token = getAuthToken();
        if (!token) {
            console.warn("WebSocket: No auth token found");
            return;
        }

        // Convert HTTP URL to WebSocket URL
        const httpUrl = API_URL.replace(/\/$/, ""); // remove trailing slash
        let wsUrl = httpUrl.replace(/^http/, "ws");

        // Append path and auth token
        wsUrl = `${wsUrl}${path}?token=${token}`;

        console.log("WebSocket connecting to:", wsUrl);
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log("WebSocket connected");
            setIsConnected(true);
            if (onConnect) onConnect();
            // Clear reconnect timeout if any
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };

        ws.onclose = (event) => {
            console.log("WebSocket disconnected", event.code, event.reason);
            setIsConnected(false);
            socketRef.current = null;
            if (onDisconnect) onDisconnect();

            // Auto-reconnect if not manually disabled and enabled is still true
            if (enabled && event.code !== 1000) { // 1000 is normal closure
                reconnectTimeoutRef.current = setTimeout(connect, 3000); // 3s delay
            }
        };

        ws.onerror = (error) => {
            console.error("WebSocket error", error);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as WebSocketMessage;
                if (onMessage) onMessage(data);
            } catch (err) {
                console.error("Failed to parse WebSocket message", err);
            }
        };

        socketRef.current = ws;
    }, [enabled, path, onConnect, onDisconnect, onMessage]);

    useEffect(() => {
        if (enabled) {
            connect();
        } else {
            if (socketRef.current) {
                socketRef.current.close();
            }
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.close(1000, "Component unmounted");
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [enabled, connect]);

    const sendMessage = useCallback((message: WebSocketMessage) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(message));
        } else {
            console.warn("WebSocket not connected, cannot send message");
        }
    }, []);

    return {
        isConnected,
        sendMessage,
    };
}
