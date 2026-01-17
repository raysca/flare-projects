/**
 * Session management utilities for KV storage
 */

export interface Session {
  userId: string;
  email: string;
  workspaceId?: string;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt: number;
}

const SESSION_PREFIX = "session:";
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Generate a session ID
 */
export function generateSessionId(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Create a new session
 * @param kv - KV namespace
 * @param userId - User ID
 * @param email - User email
 * @param workspaceId - Optional workspace ID
 * @returns Session ID
 */
export async function createSession(
  kv: KVNamespace,
  userId: string,
  email: string,
  workspaceId?: string
): Promise<string> {
  const sessionId = generateSessionId();
  const now = Date.now();

  const session: Session = {
    userId,
    email,
    workspaceId,
    createdAt: now,
    lastAccessedAt: now,
    expiresAt: now + SESSION_DURATION * 1000,
  };

  // Store session in KV with TTL
  await kv.put(
    `${SESSION_PREFIX}${sessionId}`,
    JSON.stringify(session),
    {
      expirationTtl: SESSION_DURATION,
    }
  );

  return sessionId;
}

/**
 * Get session by ID
 * @param kv - KV namespace
 * @param sessionId - Session ID
 * @returns Session data or null if not found/expired
 */
export async function getSession(
  kv: KVNamespace,
  sessionId: string
): Promise<Session | null> {
  const data = await kv.get(`${SESSION_PREFIX}${sessionId}`, "text");

  if (!data) {
    return null;
  }

  try {
    const session: Session = JSON.parse(data);

    // Check if session is expired
    if (session.expiresAt < Date.now()) {
      await deleteSession(kv, sessionId);
      return null;
    }

    return session;
  } catch (error) {
    console.error("Error parsing session:", error);
    return null;
  }
}

/**
 * Update session last accessed time
 * @param kv - KV namespace
 * @param sessionId - Session ID
 */
export async function touchSession(
  kv: KVNamespace,
  sessionId: string
): Promise<void> {
  const session = await getSession(kv, sessionId);

  if (!session) {
    return;
  }

  session.lastAccessedAt = Date.now();

  await kv.put(
    `${SESSION_PREFIX}${sessionId}`,
    JSON.stringify(session),
    {
      expirationTtl: SESSION_DURATION,
    }
  );
}

/**
 * Delete a session
 * @param kv - KV namespace
 * @param sessionId - Session ID
 */
export async function deleteSession(
  kv: KVNamespace,
  sessionId: string
): Promise<void> {
  await kv.delete(`${SESSION_PREFIX}${sessionId}`);
}

/**
 * Delete all sessions for a user
 * @param kv - KV namespace
 * @param userId - User ID
 */
export async function deleteUserSessions(
  kv: KVNamespace,
  userId: string
): Promise<void> {
  // List all sessions with the prefix
  const list = await kv.list({ prefix: SESSION_PREFIX });

  // Filter sessions for this user and delete them
  for (const key of list.keys) {
    const data = await kv.get(key.name, "text");
    if (data) {
      try {
        const session: Session = JSON.parse(data);
        if (session.userId === userId) {
          await kv.delete(key.name);
        }
      } catch (error) {
        console.error("Error parsing session during deletion:", error);
      }
    }
  }
}

/**
 * Extract session ID from Authorization header or cookie
 * @param request - Request object
 * @returns Session ID or null
 */
export function extractSessionId(request: Request): string | null {
  // Try Authorization header first (Bearer token)
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Try cookie
  const cookieHeader = request.headers.get("Cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    const sessionCookie = cookies.find((c) => c.startsWith("sessionId="));
    if (sessionCookie) {
      return sessionCookie.substring(10);
    }
  }

  return null;
}
