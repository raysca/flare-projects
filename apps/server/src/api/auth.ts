import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { setCookie, deleteCookie } from 'hono/cookie';
import { z } from 'zod';
import { hashPassword, verifyPassword, generateToken } from '@linearflow/shared';
import { users } from '@linearflow/database';
import { eq } from 'drizzle-orm';
import type { Env } from '../lib/app';
import { authMiddleware } from '../middleware/auth';
import {
  createSession,
  deleteSession,
  deleteUserSessions,
  getUserSessions,
} from '../services/session';

const auth = new Hono<Env>();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// Validation schemas
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /auth/signup
 * Create a new user account
 */
auth.post('/signup', zValidator('json', signupSchema), async (c) => {
  const { email, password, name } = c.req.valid('json');
  const db = c.get('db');

  // Check if user already exists
  const [existingUser] = await db.select().from(users).where(eq(users.email, email));

  if (existingUser) {
    return c.json({ error: 'User already exists' }, 400);
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Generate user ID
  const userId = crypto.randomUUID();

  // Create user
  await db.insert(users).values({
    id: userId,
    email,
    passwordHash,
    name,
    isActive: true,
    emailVerified: false,
  });

  // Generate JWT token
  const token = await generateToken(
    {
      sub: userId,
      email,
    },
    JWT_SECRET
  );

  // Create session
  const userAgent = c.req.header('User-Agent');
  const sessionId = await createSession(userId, email, { userAgent });

  // Set session cookie
  setCookie(c, 'sessionId', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });

  return c.json(
    {
      user: {
        id: userId,
        email,
        name,
      },
      token,
      sessionId,
    },
    201
  );
});

/**
 * POST /auth/login
 * Authenticate user and create session
 */
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const db = c.get('db');

  // Find user by email
  const [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // Check if user is active
  if (!user.isActive) {
    return c.json({ error: 'Account is inactive' }, 403);
  }

  // Update last login
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  // Generate JWT token
  const token = await generateToken(
    {
      sub: user.id,
      email: user.email,
    },
    JWT_SECRET
  );

  // Create session
  const userAgent = c.req.header('User-Agent');
  const sessionId = await createSession(user.id, user.email, { userAgent });

  // Set session cookie
  setCookie(c, 'sessionId', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    token,
    sessionId,
  });
});

/**
 * POST /auth/logout
 * Delete current session
 */
auth.post('/logout', authMiddleware, async (c) => {
  const sessionId = c.get('sessionId');

  if (sessionId) {
    await deleteSession(sessionId);
  }

  // Clear session cookie
  deleteCookie(c, 'sessionId', { path: '/' });

  return c.json({ message: 'Logged out successfully' });
});

/**
 * POST /auth/logout-all
 * Logout from all devices
 */
auth.post('/logout-all', authMiddleware, async (c) => {
  const user = c.get('user')!;

  await deleteUserSessions(user.id);

  // Clear session cookie
  deleteCookie(c, 'sessionId', { path: '/' });

  return c.json({ message: 'Logged out from all devices' });
});

/**
 * GET /auth/sessions
 * Get all active sessions for current user
 */
auth.get('/sessions', authMiddleware, async (c) => {
  const user = c.get('user')!;
  const currentSessionId = c.get('sessionId');

  const sessions = await getUserSessions(user.id);

  return c.json(
    sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastAccessedAt: s.lastAccessedAt,
      expiresAt: s.expiresAt,
      isCurrent: s.id === currentSessionId,
    }))
  );
});

/**
 * DELETE /auth/sessions/:sessionId
 * Delete a specific session
 */
auth.delete('/sessions/:sessionId', authMiddleware, async (c) => {
  const user = c.get('user')!;
  const sessionId = c.req.param('sessionId');
  const currentSessionId = c.get('sessionId');

  // Get session to verify ownership
  const sessions = await getUserSessions(user.id);
  const session = sessions.find((s) => s.id === sessionId);

  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  await deleteSession(sessionId);

  // If deleting current session, clear cookie
  if (sessionId === currentSessionId) {
    deleteCookie(c, 'sessionId', { path: '/' });
  }

  return c.json({ message: 'Session deleted' });
});

/**
 * GET /auth/me
 * Get current authenticated user
 */
auth.get('/me', authMiddleware, async (c) => {
  const authUser = c.get('user')!;
  const db = c.get('db');

  const [user] = await db.select().from(users).where(eq(users.id, authUser.id));

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    isActive: user.isActive,
  });
});

export default auth;
