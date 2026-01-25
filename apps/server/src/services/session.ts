import { db } from '../db/client';
import { sessions } from '@linearflow/database';
import { eq, lt } from 'drizzle-orm';

// Session duration: 7 days in milliseconds
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

/**
 * Generate a cryptographically secure session ID
 */
export function generateSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Create a new session for a user
 */
export async function createSession(
  userId: string,
  email: string,
  options?: {
    userAgent?: string;
    ipAddress?: string;
  }
): Promise<string> {
  const id = generateSessionId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION);

  await db.insert(sessions).values({
    id,
    userId,
    email,
    userAgent: options?.userAgent,
    ipAddress: options?.ipAddress,
    createdAt: now,
    lastAccessedAt: now,
    expiresAt,
  });

  return id;
}

/**
 * Get a session by ID, returns null if expired or not found
 */
export async function getSession(sessionId: string) {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));

  if (!session) {
    return null;
  }

  // Check if session has expired
  if (session.expiresAt < new Date()) {
    await deleteSession(sessionId);
    return null;
  }

  return session;
}

/**
 * Update the last accessed time for a session
 */
export async function touchSession(sessionId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ lastAccessedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

/**
 * Extend a session's expiration time
 */
export async function extendSession(sessionId: string): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION);

  await db
    .update(sessions)
    .set({
      lastAccessedAt: now,
      expiresAt,
    })
    .where(eq(sessions.id, sessionId));
}

/**
 * Delete a specific session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/**
 * Delete all expired sessions (cleanup job)
 */
export async function deleteExpiredSessions(): Promise<number> {
  const result = await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  // Note: SQLite doesn't return affected rows count directly in Drizzle
  return 0;
}

/**
 * Delete all sessions for a user (logout from all devices)
 */
export async function deleteUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string) {
  const userSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId));

  // Filter out expired sessions
  const now = new Date();
  return userSessions.filter((s) => s.expiresAt >= now);
}
