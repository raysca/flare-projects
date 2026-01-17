import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  createSession,
  deleteSession,
  extractSessionId,
} from "@linearflow/shared";
import { createDrizzleClient, users } from "@linearflow/database";
import { eq } from "drizzle-orm";
import type { Env } from "../index";
import { authMiddleware, type AuthContext } from "../middleware/auth";

const auth = new Hono<Env>();

// Validation schemas
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

/**
 * POST /auth/signup
 * Create a new user account
 */
auth.post("/signup", zValidator("json", signupSchema), async (c) => {
  const { email, password, name } = c.req.valid("json");
  const db = createDrizzleClient(c.env.DB);

  // Check if user already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (existingUser) {
    return c.json({ error: "User already exists" }, 400);
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
  const jwtSecret = c.env.JWT_SECRET || "development-secret-key";
  const token = await generateToken(
    {
      sub: userId,
      email,
    },
    jwtSecret
  );

  // Create session
  const sessionId = await createSession(c.env.KV, userId, email);

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
auth.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  const db = createDrizzleClient(c.env.DB);

  // Find user by email
  const user = await db.select().from(users).where(eq(users.email, email)).get();

  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  // Check if user is active
  if (!user.isActive) {
    return c.json({ error: "Account is inactive" }, 403);
  }

  // Update last login
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  // Generate JWT token
  const jwtSecret = c.env.JWT_SECRET || "development-secret-key";
  const token = await generateToken(
    {
      sub: user.id,
      email: user.email,
    },
    jwtSecret
  );

  // Create session
  const sessionId = await createSession(c.env.KV, user.id, user.email);

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
auth.post("/logout", authMiddleware, async (c) => {
  const sessionId = extractSessionId(c.req.raw);

  if (sessionId) {
    await deleteSession(c.env.KV, sessionId);
  }

  return c.json({ message: "Logged out successfully" });
});

/**
 * GET /auth/me
 * Get current authenticated user
 */
auth.get("/me", authMiddleware, async (c) => {
  const authUser = c.var.user;
  const db = createDrizzleClient(c.env.DB);

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .get();

  if (!user) {
    return c.json({ error: "User not found" }, 404);
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
