import { DurableObject } from "cloudflare:workers";
import { WebSocketMessage, UserPresence } from "./types";

export class WorkspaceDO extends DurableObject {
  constructor(state: DurableObjectState, env: any) {
    super(state, env);
    // Hibernation API automatically handles keeping the DO alive while sockets are connected.
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Determine if this is a WebSocket upgrade request
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // Handle auth/user info query params
      const userId = url.searchParams.get("userId");
      const userName = url.searchParams.get("userName") || "Anonymous";

      if (!userId) {
        return new Response("Missing userId", { status: 400 });
      }

      // Accept the WebSocket
      this.ctx.acceptWebSocket(server);

      // Store user presence in attachment for Hibernation support
      const presence: UserPresence = {
        userId,
        userName,
        connectedAt: Date.now()
      };

      server.serializeAttachment(presence);

      // Broadcast 'user_joined' event
      this.broadcast({
        type: "user_joined",
        payload: presence,
        senderId: userId,
        timestamp: Date.now()
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    // Handle internal broadcast requests from the API
    if (request.method === "POST" && url.pathname === "/broadcast") {
      try {
        const data = await request.json() as WebSocketMessage;
        this.broadcast(data);
        return new Response("OK", { status: 200 });
      } catch (e) {
        return new Response("Invalid request body", { status: 400 });
      }
    }

    return new Response("Expected WebSocket Upgrade", { status: 400 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const data = JSON.parse(message as string) as WebSocketMessage;
      const sender = ws.deserializeAttachment() as UserPresence;

      if (!sender) return;

      // Re-broadcast message
      this.broadcast({
        ...data,
        senderId: sender.userId,
        timestamp: Date.now()
      }, ws);

    } catch (err) {
      console.error("Error parsing message", err);
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    const user = ws.deserializeAttachment() as UserPresence;

    if (user) {
      this.broadcast({
        type: "user_left",
        payload: { userId: user.userId },
        timestamp: Date.now()
      });
    }
  }

  async webSocketError(ws: WebSocket, error: any) {
    console.error("WebSocket error:", error);
  }

  private broadcast(message: WebSocketMessage, excludeWs?: WebSocket) {
    const msgString = JSON.stringify(message);

    // Use getWebSockets to iterate over all connected clients (managed by system due to acceptWebSocket)
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === excludeWs) continue;

      try {
        ws.send(msgString);
      } catch (e) {
        // close handled by platform
      }
    }
  }
}
