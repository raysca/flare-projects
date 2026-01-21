import { DurableObject } from "cloudflare:workers";
import { WebSocketMessage, UserPresence } from "./types";

export class IssueDO extends DurableObject {
  constructor(state: DurableObjectState, env: any) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      const userId = url.searchParams.get("userId");
      const userName = url.searchParams.get("userName") || "Anonymous";

      if (!userId) {
        return new Response("Missing userId", { status: 400 });
      }

      this.ctx.acceptWebSocket(server);

      const presence: UserPresence = {
        userId,
        userName,
        connectedAt: Date.now()
      };

      server.serializeAttachment(presence);

      // Send list of currently active users to the new user
      const activeUsers: UserPresence[] = [];
      const sockets = this.ctx.getWebSockets();
      if (sockets) { // Durable Object state.getWebSockets() returns array
        for (const ws of sockets) {
          try {
            // Attachments are only available on 'server' socket after accept,
            // but for EXISTING sockets in this.ctx.getWebSockets(), they should have attachments.
            // Wait, deserializeAttachment returns null if not set.
            // We set it on accept.
            const user = ws.deserializeAttachment() as UserPresence;
            if (user) {
              activeUsers.push(user);
            }
          } catch (e) {
            // ignore
          }
        }
      }

      // Send initial state to the connecting client
      server.send(JSON.stringify({
        type: "current_users",
        payload: activeUsers,
        timestamp: Date.now()
      }));


      this.broadcast({
        type: "user_viewing_issue",
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

    // Allow HTTP requests for updating issue state if needed, 
    // but primary interaction is often via standard API -> DB, then DB -> DO broadcast or API -> DO -> Broadcast
    // For now, simple WebSocket upgrade support.
    return new Response("Expected WebSocket Upgrade", { status: 400 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const data = JSON.parse(message as string) as WebSocketMessage;
      const sender = ws.deserializeAttachment() as UserPresence;

      if (!sender) return;

      // Handle issue-specific messages (e.g. "typing", "field_update")
      // For now, simple broadcast
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
        type: "user_left_issue",
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
