import type { UserPresence } from './types';

/**
 * Simple presence tracker for WebSocket channels.
 * Bun's native pub/sub handles message delivery, but we need to track
 * who's connected to each channel for presence features.
 */
class PresenceTracker {
  // Map of channel -> Map of visitorId -> UserPresence
  private channels = new Map<string, Map<string, UserPresence>>();

  /**
   * Add a user to a channel's presence list
   */
  join(channel: string, visitorId: string, presence: UserPresence): void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Map());
    }
    this.channels.get(channel)!.set(visitorId, presence);
  }

  /**
   * Remove a user from a channel's presence list
   */
  leave(channel: string, visitorId: string): UserPresence | undefined {
    const channelPresences = this.channels.get(channel);
    if (!channelPresences) return undefined;

    const presence = channelPresences.get(visitorId);
    channelPresences.delete(visitorId);

    // Clean up empty channels
    if (channelPresences.size === 0) {
      this.channels.delete(channel);
    }

    return presence;
  }

  /**
   * Get all presences in a channel
   */
  getPresences(channel: string): UserPresence[] {
    const channelPresences = this.channels.get(channel);
    if (!channelPresences) return [];
    return Array.from(channelPresences.values());
  }

  /**
   * Get count of users in a channel
   */
  getCount(channel: string): number {
    return this.channels.get(channel)?.size || 0;
  }

  /**
   * Check if a channel has any users
   */
  hasUsers(channel: string): boolean {
    return this.getCount(channel) > 0;
  }
}

// Singleton instance
export const presence = new PresenceTracker();
