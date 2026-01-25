import type { ServerWebSocket } from 'bun';

/**
 * WebSocket message structure for real-time communication
 */
export interface WebSocketMessage {
  type: MessageType;
  payload?: unknown;
  senderId?: string;
  timestamp?: number;
}

/**
 * User presence information for tracking connected users
 */
export interface UserPresence {
  userId: string;
  userName: string;
  avatarUrl?: string;
  connectedAt: number;
}

/**
 * Data attached to each WebSocket connection
 */
export interface WebSocketData {
  id: string;
  userId: string;
  userName: string;
  avatarUrl?: string;
  channel: string;
  connectedAt: number;
}

/**
 * All supported message types for real-time communication
 */
export type MessageType =
  // Presence messages
  | 'user_joined'
  | 'user_left'
  | 'current_users'
  | 'ping'
  | 'pong'
  | 'error'
  // Subscription management (dynamic channel subscription)
  | 'subscribe'
  | 'unsubscribe'
  | 'subscribed'
  | 'unsubscribed'
  // Issue messages
  | 'issue_created'
  | 'issue_updated'
  | 'issue_deleted'
  // Comment messages
  | 'comment_created'
  | 'comment_updated'
  | 'comment_deleted'
  | 'comment_reaction_added'
  | 'comment_reaction_removed'
  // Typing indicators
  | 'typing_start'
  | 'typing_stop'
  // Custom/generic
  | 'broadcast';

/**
 * Channel types for organizing WebSocket connections
 */
export type ChannelType = 'workspace' | 'project' | 'issue';

/**
 * Helper to create a channel name
 */
export function createChannelName(type: ChannelType, id: string): string {
  return `${type}:${id}`;
}

/**
 * Parse a channel name into type and id
 */
export function parseChannelName(channel: string): { type: ChannelType; id: string } | null {
  const [type, id] = channel.split(':');
  if (!type || !id || !['workspace', 'project', 'issue'].includes(type)) {
    return null;
  }
  return { type: type as ChannelType, id };
}
