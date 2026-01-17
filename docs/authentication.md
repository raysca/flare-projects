# Authentication System

LinearFlow uses a dual authentication system with JWT tokens and KV-based sessions.

## Overview

The authentication system provides:
- **Password hashing** using PBKDF2 via Web Crypto API
- **JWT tokens** for stateless authentication
- **Session management** using Cloudflare KV
- **Secure middleware** for protecting routes

## Architecture

### Password Security

Passwords are hashed using PBKDF2 with:
- 100,000 iterations
- SHA-256 hash algorithm
- 16-byte random salt
- 32-byte derived key

The stored format is: `salt$hash` (both hex-encoded)

### JWT Tokens

JWT tokens are signed using HMAC-SHA256 and contain:
- `sub`: User ID
- `email`: User email
- `workspaceId`: Optional workspace context
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp (default: 7 days)

### Session Management

Sessions are stored in KV with:
- Unique session ID (64 hex characters)
- User metadata (ID, email, workspace)
- Automatic TTL of 7 days
- Touch mechanism to extend expiration

## API Endpoints

### POST /api/v1/auth/signup

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt-token",
  "sessionId": "session-id"
}
```

### POST /api/v1/auth/login

Authenticate existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "avatarUrl": "https://..."
  },
  "token": "jwt-token",
  "sessionId": "session-id"
}
```

### POST /api/v1/auth/logout

Logout current session (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### GET /api/v1/auth/me

Get current authenticated user (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "avatarUrl": "https://...",
  "emailVerified": true,
  "isActive": true
}
```

## Authentication Methods

Clients can authenticate using either:

### 1. JWT Token (Recommended)

```http
Authorization: Bearer <jwt-token>
```

### 2. Session Cookie

```http
Cookie: sessionId=<session-id>
```

## Using Auth Middleware

### Required Authentication

Protect routes that require authentication:

```typescript
import { authMiddleware } from "./middleware/auth";

app.get("/protected", authMiddleware, async (c) => {
  const user = c.get("user");
  return c.json({ userId: user.id });
});
```

### Optional Authentication

For routes where authentication is optional:

```typescript
import { optionalAuthMiddleware } from "./middleware/auth";

app.get("/public", optionalAuthMiddleware, async (c) => {
  const user = c.get("user"); // May be undefined
  return c.json({ authenticated: !!user });
});
```

## Security Best Practices

1. **JWT Secret**: Always use a strong, randomly generated secret in production
   ```bash
   # Set via Wrangler
   wrangler secret put JWT_SECRET
   ```

2. **HTTPS Only**: Always use HTTPS in production to prevent token theft

3. **Token Expiration**: Tokens expire after 7 days by default

4. **Session Invalidation**: Sessions are stored in KV and automatically expire

5. **Password Requirements**: Minimum 8 characters enforced via validation

## Development Setup

1. Copy the example env file:
   ```bash
   cp apps/worker/.dev.vars.example apps/worker/.dev.vars
   ```

2. Update with your JWT secret:
   ```
   JWT_SECRET=your-development-secret
   ```

3. Start the worker:
   ```bash
   cd apps/worker
   bun dev
   ```

## Production Setup

1. Set JWT secret as a Wrangler secret:
   ```bash
   wrangler secret put JWT_SECRET
   ```

2. Ensure KV namespace is created:
   ```bash
   wrangler kv:namespace create KV
   ```

3. Update `wrangler.toml` with the KV namespace ID

4. Deploy:
   ```bash
   wrangler deploy
   ```

## Testing Authentication

```bash
# Signup
curl -X POST http://localhost:8787/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:8787/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get current user
curl http://localhost:8787/api/v1/auth/me \
  -H "Authorization: Bearer <token>"

# Logout
curl -X POST http://localhost:8787/api/v1/auth/logout \
  -H "Authorization: Bearer <token>"
```

## Future Enhancements

- Email verification flow
- Password reset functionality
- OAuth providers (GitHub, Google)
- Multi-factor authentication (MFA)
- Rate limiting for login attempts
- Account lockout after failed attempts
