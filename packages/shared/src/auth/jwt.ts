/**
 * JWT utilities using Web Crypto API
 * Compatible with Cloudflare Workers
 */

export interface JWTPayload {
  sub: string; // User ID
  email: string;
  workspaceId?: string;
  iat: number; // Issued at
  exp: number; // Expiration
}

/**
 * Base64URL encode
 */
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Base64URL decode
 */
function base64UrlDecode(data: string): Uint8Array {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  return new Uint8Array([...binary].map((char) => char.charCodeAt(0)));
}

/**
 * Generate JWT token
 * @param payload - Token payload
 * @param secret - Secret key for signing
 * @param expiresIn - Expiration time in seconds (default: 7 days)
 */
export async function generateToken(
  payload: Omit<JWTPayload, "iat" | "exp">,
  secret: string,
  expiresIn: number = 7 * 24 * 60 * 60 // 7 days
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  // Create header
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  // Encode header and payload
  const encodedHeader = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const encodedPayload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(fullPayload))
  );

  const message = `${encodedHeader}.${encodedPayload}`;

  // Sign the message
  const signature = await sign(message, secret);

  return `${message}.${signature}`;
}

/**
 * Verify and decode JWT token
 * @param token - JWT token
 * @param secret - Secret key for verification
 * @returns Decoded payload or null if invalid
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<JWTPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, providedSignature] = parts;
    const message = `${encodedHeader}.${encodedPayload}`;

    // Verify signature
    const expectedSignature = await sign(message, secret);
    if (expectedSignature !== providedSignature) {
      return null;
    }

    // Decode payload
    const payloadJson = new TextDecoder().decode(
      base64UrlDecode(encodedPayload)
    );
    const payload: JWTPayload = JSON.parse(payloadJson);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}

/**
 * Sign a message using HMAC-SHA256
 */
async function sign(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, messageData);

  return base64UrlEncode(new Uint8Array(signature));
}

/**
 * Refresh token (generate new token with updated expiration)
 */
export async function refreshToken(
  currentToken: string,
  secret: string,
  expiresIn?: number
): Promise<string | null> {
  const payload = await verifyToken(currentToken, secret);
  if (!payload) {
    return null;
  }

  // Generate new token with same payload but new expiration
  return generateToken(
    {
      sub: payload.sub,
      email: payload.email,
      workspaceId: payload.workspaceId,
    },
    secret,
    expiresIn
  );
}
