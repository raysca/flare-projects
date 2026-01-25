import type { Server } from 'bun';
import type { WebSocketMessage, MessageType, WebSocketData } from './types';

// Server instance reference for broadcasting from API routes
let serverInstance: Server<WebSocketData> | null = null;

/**
 * Set the server instance for broadcasting
 * Called from index.ts after server starts
 */
export function setServer(server: Server<WebSocketData>): void {
  serverInstance = server;
}

/**
 * Get the count of subscribers for a topic
 * Uses Bun's native subscriberCount method
 */
export function getSubscriberCount(topic: string): number {
  if (!serverInstance) return 0;
  return serverInstance.subscriberCount(topic);
}

/**
 * Check if a topic has any subscribers
 * Uses Bun's native subscriberCount for efficiency
 */
export function hasSubscribers(topic: string): boolean {
  return getSubscriberCount(topic) > 0;
}

/**
 * Broadcast a message to all subscribers of a channel
 * Uses Bun's native server.publish() for efficient message delivery
 */
function publishToChannel(channel: string, type: MessageType, payload: unknown, senderId?: string): void {
  if (!serverInstance) {
    console.warn('[Broadcast] Server not initialized');
    return;
  }

  // Use Bun's subscriberCount to skip empty channels (more efficient than manual tracking)
  if (serverInstance.subscriberCount(channel) === 0) {
    return; // No one listening, skip
  }

  const message: WebSocketMessage = {
    type,
    payload,
    senderId,
    timestamp: Date.now(),
  };

  serverInstance.publish(channel, JSON.stringify(message));
}

/**
 * Broadcast a message to all subscribers of a workspace channel
 */
export function broadcastToWorkspace(
  workspaceId: string,
  type: MessageType,
  payload: unknown,
  senderId?: string
): void {
  publishToChannel(`workspace:${workspaceId}`, type, payload, senderId);
}

/**
 * Broadcast a message to all subscribers of a project channel
 */
export function broadcastToProject(
  projectId: string,
  type: MessageType,
  payload: unknown,
  senderId?: string
): void {
  publishToChannel(`project:${projectId}`, type, payload, senderId);
}

/**
 * Broadcast a message to all subscribers of an issue channel
 */
export function broadcastToIssue(
  issueId: string,
  type: MessageType,
  payload: unknown,
  senderId?: string
): void {
  publishToChannel(`issue:${issueId}`, type, payload, senderId);
}

/**
 * Broadcast an issue update to both the issue channel and its project channel
 */
export function broadcastIssueUpdate(
  issueId: string,
  projectId: string,
  type: MessageType,
  payload: unknown,
  senderId?: string
): void {
  broadcastToIssue(issueId, type, payload, senderId);
  broadcastToProject(projectId, type, payload, senderId);
}

/**
 * Broadcast helpers for specific event types
 */
export const broadcast = {
  issueCreated(projectId: string, issue: unknown, senderId?: string): void {
    broadcastToProject(projectId, 'issue_created', issue, senderId);
  },

  issueUpdated(issueId: string, projectId: string, issue: unknown, senderId?: string): void {
    broadcastIssueUpdate(issueId, projectId, 'issue_updated', issue, senderId);
  },

  issueDeleted(issueId: string, projectId: string, deletedIssue: { id: string }, senderId?: string): void {
    broadcastIssueUpdate(issueId, projectId, 'issue_deleted', deletedIssue, senderId);
  },

  commentCreated(issueId: string, comment: unknown, senderId?: string): void {
    broadcastToIssue(issueId, 'comment_created', comment, senderId);
  },

  commentUpdated(issueId: string, comment: unknown, senderId?: string): void {
    broadcastToIssue(issueId, 'comment_updated', comment, senderId);
  },

  commentDeleted(issueId: string, commentId: string, senderId?: string): void {
    broadcastToIssue(issueId, 'comment_deleted', { id: commentId }, senderId);
  },

  reactionAdded(
    issueId: string,
    reaction: { commentId: string; reactionId: string; userId: string; emoji: string },
    senderId?: string
  ): void {
    broadcastToIssue(issueId, 'comment_reaction_added', reaction, senderId);
  },

  reactionRemoved(
    issueId: string,
    reaction: { commentId: string; reactionId: string; userId: string; emoji: string },
    senderId?: string
  ): void {
    broadcastToIssue(issueId, 'comment_reaction_removed', reaction, senderId);
  },

  typingStart(issueId: string, user: { userId: string; userName: string }): void {
    broadcastToIssue(issueId, 'typing_start', user, user.userId);
  },

  typingStop(issueId: string, user: { userId: string; userName: string }): void {
    broadcastToIssue(issueId, 'typing_stop', user, user.userId);
  },
};
