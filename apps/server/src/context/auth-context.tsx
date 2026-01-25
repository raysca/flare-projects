import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  apiFetch,
  setAuthToken,
  clearAuthToken,
  getAuthToken,
  setSessionId,
} from '@/lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User, sessionId: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await apiFetch<User>('/users/me');
        setUser(userData);
      } catch (error) {
        // Token is invalid or expired
        clearAuthToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (token: string, userData: User, sessionId: string) => {
    setAuthToken(token);
    setSessionId(sessionId);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (error) {
      // Ignore errors during logout
      console.error('Logout error:', error);
    } finally {
      clearAuthToken();
      setUser(null);
      // Navigate to login
      window.location.hash = '#/login';
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await apiFetch<User>('/users/me');
      setUser(userData);
    } catch (error) {
      clearAuthToken();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
