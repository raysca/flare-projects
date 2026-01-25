/**
 * API utilities for making authenticated requests
 */

const API_BASE = '/api/v1';

// Token storage
const TOKEN_KEY = 'auth_token';
const SESSION_KEY = 'session_id';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function getSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionId(sessionId: string): void {
  localStorage.setItem(SESSION_KEY, sessionId);
}

/**
 * API Error class for handling error responses
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Parse error message from various API error formats
 */
function parseErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;

    // Standard error format
    if (typeof err.message === 'string') {
      return err.message;
    }

    // Zod validation errors
    if (err.name === 'ZodError' && typeof err.message === 'string') {
      try {
        const issues = JSON.parse(err.message);
        if (Array.isArray(issues) && issues.length > 0) {
          return issues.map((i: { message: string }) => i.message).join(', ');
        }
      } catch {
        return err.message;
      }
    }

    // Zod issues array
    if (Array.isArray(err.issues)) {
      return err.issues.map((i: { message: string }) => i.message).join(', ');
    }
  }

  return 'An unexpected error occurred';
}

/**
 * Make an API request with authentication
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  // Try to parse JSON response
  let data: unknown;
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  // Handle error responses
  if (!response.ok) {
    const errorData = data as { error?: unknown; message?: string };
    const message = errorData.error
      ? parseErrorMessage(errorData.error)
      : errorData.message || `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}
