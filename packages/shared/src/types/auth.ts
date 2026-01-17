/**
 * Authentication and authorization types
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
  };
  token: string;
  sessionId: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  workspaceId?: string;
}

export type UserRole = "admin" | "member" | "guest";

export interface WorkspaceContext {
  workspaceId: string;
  role: UserRole;
}
