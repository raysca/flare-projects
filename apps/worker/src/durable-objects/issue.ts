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

      this.broadcast({
        type: "user_viewing_issue",
        payload: presence,
        senderId: userId,
        timestamp: Date.now()
      });

      return new Response(null, { status: 101, webSocket: client });
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
