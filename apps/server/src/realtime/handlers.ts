import type { ServerWebSocket } from 'bun';
import { presence } from './presence';
import type { WebSocketData, WebSocketMessage, UserPresence } from './types';

/**
 * WebSocket event handlers for Bun.serve()
 * Uses Bun's native pub/sub for message broadcasting
 */
export const websocketHandlers = {
  /**
   * Called when a WebSocket connection is opened
   */
  open(ws: ServerWebSocket<WebSocketData>) {
    const { id, channel, userId, userName, avatarUrl, connectedAt } = ws.data;

    // Subscribe to the channel using Bun's native pub/sub
    ws.subscribe(channel);

    // Track presence
    const userPresence: UserPresence = {
      userId,
      userName,
      avatarUrl,
      connectedAt,
    };
    presence.join(channel, id, userPresence);

    // Send current users to the new connection
    const currentUsers = presence.getPresences(channel);
    ws.send(
      JSON.stringify({
        type: 'current_users',
        payload: currentUsers,
        timestamp: Date.now(),
      })
    );

    // Notify others of the new user (using Bun's publish)
    ws.publish(
      channel,
      JSON.stringify({
        type: 'user_joined',
        payload: userPresence,
        timestamp: Date.now(),
      })
    );

    console.log(`[WebSocket] ${userName} joined ${channel} (${presence.getCount(channel)} users)`);
  },

  /**
   * Called when a message is received from a WebSocket client
   * Note: Ping/pong is handled automatically by Bun with sendPings: true
   */
  message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
    try {
      const data: WebSocketMessage = JSON.parse(message.toString());
      const { channel, userId, userName } = ws.data;

      // Handle application-level ping (legacy client support)
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        return;
      }

      // Handle dynamic channel subscription using Bun's native subscribe
      if (data.type === 'subscribe' && data.payload && typeof data.payload === 'object') {
        const { channel: newChannel } = data.payload as { channel: string };
        if (newChannel && !ws.isSubscribed(newChannel)) {
          ws.subscribe(newChannel);
          ws.send(
            JSON.stringify({
              type: 'subscribed',
              payload: { channel: newChannel, subscriptions: ws.subscriptions },
              timestamp: Date.now(),
            })
          );
          console.log(`[WebSocket] ${userName} subscribed to ${newChannel}`);
        }
        return;
      }

      // Handle dynamic channel unsubscription using Bun's native unsubscribe
      if (data.type === 'unsubscribe' && data.payload && typeof data.payload === 'object') {
        const { channel: oldChannel } = data.payload as { channel: string };
        if (oldChannel && ws.isSubscribed(oldChannel)) {
          ws.unsubscribe(oldChannel);
          ws.send(
            JSON.stringify({
              type: 'unsubscribed',
              payload: { channel: oldChannel, subscriptions: ws.subscriptions },
              timestamp: Date.now(),
            })
          );
          console.log(`[WebSocket] ${userName} unsubscribed from ${oldChannel}`);
        }
        return;
      }

      // Enrich message with sender info and timestamp
      const enrichedMessage: WebSocketMessage = {
        ...data,
        senderId: userId,
        timestamp: Date.now(),
      };

      const messageStr = JSON.stringify(enrichedMessage);

      // Broadcast to all subscribers using Bun's publish (excludes sender by default)
      ws.publish(channel, messageStr);

      // Also send to self for consistency (since publishToSelf is false by default)
      ws.send(messageStr);

      if (process.env.NODE_ENV === 'development') {
        console.log(`[WebSocket] ${userName} sent ${data.type} to ${channel}`);
      }
    } catch (error) {
      console.error('[WebSocket] Message parse error:', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          payload: { message: 'Invalid message format' },
          timestamp: Date.now(),
        })
      );
    }
  },

  /**
   * Called when a WebSocket connection is closed
   */
  close(ws: ServerWebSocket<WebSocketData>, code: number, reason: string) {
    const { id, channel, userId, userName, avatarUrl } = ws.data;

    // Unsubscribe from channel
    ws.unsubscribe(channel);

    // Remove from presence tracker
    presence.leave(channel, id);

    // Notify others of the user leaving
    ws.publish(
      channel,
      JSON.stringify({
        type: 'user_left',
        payload: {
          userId,
          userName,
          avatarUrl,
          connectedAt: 0,
        } as UserPresence,
        timestamp: Date.now(),
      })
    );

    console.log(`[WebSocket] ${userName} left ${channel} (${presence.getCount(channel)} users)`);
  },

  /**
   * Called when a WebSocket connection encounters an error
   */
  error(ws: ServerWebSocket<WebSocketData>, error: Error) {
    console.error(`[WebSocket] Error for ${ws.data.userName}:`, error);
  },

  /**
   * Called when drain event fires (backpressure relief)
   */
  drain(ws: ServerWebSocket<WebSocketData>) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[WebSocket] Drain event for ${ws.data.userName}`);
    }
  },
};
