import { Context, Next } from "hono";
import { verifyToken, JWTPayload } from "@linearflow/shared";
import { extractSessionId, getSession } from "@linearflow/shared";
import type { Env } from "../index";

/**
 * Extend Hono context with authenticated user
 */
export type Variables = {
  user: {
    id: string;
    email: string;
    workspaceId?: string;
  };
};

/**
 * Auth middleware - verifies JWT token or session
 * Adds user to context if authenticated
 */
export async function authMiddleware(
  c: Context<Env & { Variables: Variables }>,
  next: Next
) {
  let token = "";

  const authHeader = c.req.header("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else {
    // Fallback to query param for WebSockets
    const queryToken = c.req.query("token");
    if (queryToken) {
      token = queryToken;
    }
  }

  if (!token) {
    // Check for session ID as fallback
    const sessionId = extractSessionId(c.req.raw);
    if (sessionId) {
      const session = await getSession(c.env.KV, sessionId);

      if (session) {
        c.set("user", {
          id: session.userId,
          email: session.email,
          workspaceId: session.workspaceId,
        });
        return next();
      }
    }

    return c.json({ error: "Unauthorized" }, 401);
  }

  // Verify JWT
  const jwtSecret = c.env.JWT_SECRET || "development-secret-key";
  const payload = await verifyToken(token, jwtSecret);

  if (payload) {
    c.set("user", {
      id: payload.sub,
      email: payload.email,
      workspaceId: payload.workspaceId,
    });
    return next();
  }

  return c.json({ error: "Invalid or expired token" }, 401);
}

/**
 * Optional auth middleware - adds user to context if authenticated, but doesn't require it
 */
export async function optionalAuthMiddleware(
  c: Context<Env & { Variables: Partial<Variables> }>,
  next: Next
) {
  const authHeader = c.req.header("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const jwtSecret = c.env.JWT_SECRET || "development-secret-key";

    const payload = await verifyToken(token, jwtSecret);

    if (payload) {
      c.set("user", {
        id: payload.sub,
        email: payload.email,
        workspaceId: payload.workspaceId,
      });
    }
  }

  return next();
}

/**
 * Get authenticated user from context
 */
export function getAuthUser(
  c: Context<Env & { Variables: Variables }>
): Variables["user"] {
  const user = c.get("user");
  if (!user) {
    throw new Error("User not authenticated");
  }
  return user;
}
