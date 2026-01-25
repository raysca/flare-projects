import type { Server } from 'bun';
import { verifyToken } from '@linearflow/shared';
import { db } from '../db/client';
import { users } from '@linearflow/database';
import { eq } from 'drizzle-orm';
import type { WebSocketData } from './types';

type BunServer = Server<WebSocketData>;

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * Handle WebSocket upgrade requests
 *
 * URL patterns:
 * - /ws/workspace/:workspaceId - Subscribe to workspace-level updates
 * - /ws/project/:projectId - Subscribe to project-level updates
 * - /ws/issue/:issueId - Subscribe to issue-level updates
 *
 * Authentication via query param: ?token=<jwt>
 */
export async function handleWebSocketUpgrade(
  req: Request,
  server: BunServer
): Promise<Response | undefined> {
  const url = new URL(req.url);

  // Only handle /ws/* paths
  if (!url.pathname.startsWith('/ws/')) {
    return undefined;
  }

  // Parse channel from path: /ws/workspace/:id, /ws/project/:id, or /ws/issue/:id
  const pathMatch = url.pathname.match(/^\/ws\/(workspace|project|issue)\/([^/]+)$/);
  if (!pathMatch) {
    return new Response(
      JSON.stringify({
        error: 'Invalid WebSocket path',
        message: 'Use /ws/workspace/:workspaceId, /ws/project/:projectId, or /ws/issue/:issueId',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const [, channelType, channelId] = pathMatch;
  const channel = `${channelType}:${channelId}`;

  // Get token from query param
  const token = url.searchParams.get('token');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Token required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify JWT token
  const payload = await verifyToken(token, JWT_SECRET);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get user details from database for name and avatar
  let userName = payload.email || 'Unknown';
  let avatarUrl: string | undefined;

  try {
    const [user] = await db
      .select({ name: users.name, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, payload.sub));

    if (user) {
      userName = user.name || userName;
      avatarUrl = user.avatarUrl || undefined;
    }
  } catch (error) {
    console.error('[WebSocket] Failed to fetch user details:', error);
    // Continue with email as fallback name
  }

  // Prepare WebSocket data
  const wsData: WebSocketData = {
    id: crypto.randomUUID(),
    userId: payload.sub,
    userName,
    avatarUrl,
    channel,
    connectedAt: Date.now(),
  };

  // Attempt to upgrade the connection
  const upgraded = server.upgrade(req, { data: wsData });

  if (!upgraded) {
    return new Response(JSON.stringify({ error: 'WebSocket upgrade failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Return undefined to indicate successful upgrade
  return undefined;
}
