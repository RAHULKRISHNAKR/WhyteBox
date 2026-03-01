import { useState, useEffect, useCallback } from 'react';
import { secureStore, secureRetrieve, secureClear, isValidJwtFormat } from '@/utils/security';

/**
 * Secure Authentication Hook
 * OWASP A07:2021 - Identification and Authentication Failures
 * 
 * Implements secure authentication with:
 * - Secure token storage
 * - Token validation
 * - Automatic token refresh
 * - Session timeout
 */

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UseSecureAuthReturn extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const TOKEN_EXPIRY_KEY = 'token_expiry';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function useSecureAuth(): UseSecureAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = () => {
      const token = secureRetrieve(TOKEN_KEY);
      const userStr = secureRetrieve(USER_KEY);
      const expiry = secureRetrieve(TOKEN_EXPIRY_KEY);

      if (token && userStr && expiry) {
        // Validate token format
        if (!isValidJwtFormat(token)) {
          secureClear();
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        // Check if token is expired
        const expiryTime = parseInt(expiry, 10);
        if (Date.now() > expiryTime) {
          secureClear();
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        try {
          const user = JSON.parse(userStr);
          setState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch {
          secureClear();
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();
  }, []);

  // Auto logout on session timeout
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const timeoutId = setTimeout(() => {
      logout();
    }, SESSION_TIMEOUT);

    return () => clearTimeout(timeoutId);
  }, [state.isAuthenticated]);

  // Login function
  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Call authentication API
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Authentication failed');
      }

      const data = await response.json();
      const { token, user } = data;

      // Validate token format
      if (!isValidJwtFormat(token)) {
        throw new Error('Invalid token format');
      }

      // Store token and user securely
      const expiryTime = Date.now() + SESSION_TIMEOUT;
      secureStore(TOKEN_KEY, token);
      secureStore(USER_KEY, JSON.stringify(user));
      secureStore(TOKEN_EXPIRY_KEY, expiryTime.toString());

      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      }));
      throw error;
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    // Clear secure storage
    secureClear();

    // Call logout API
    fetch('/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(console.error);

    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, []);

  // Refresh token function
  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      const { token } = data;

      // Validate token format
      if (!isValidJwtFormat(token)) {
        throw new Error('Invalid token format');
      }

      // Update token
      const expiryTime = Date.now() + SESSION_TIMEOUT;
      secureStore(TOKEN_KEY, token);
      secureStore(TOKEN_EXPIRY_KEY, expiryTime.toString());

      setState((prev) => ({
        ...prev,
        token,
      }));
    } catch (error) {
      logout();
      throw error;
    }
  }, [logout]);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    login,
    logout,
    refreshToken,
    clearError,
  };
}

/**
 * Hook for protected routes
 * Redirects to login if not authenticated
 */
export function useRequireAuth(): AuthState {
  const auth = useSecureAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      // Redirect to login
      window.location.href = '/login';
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  return auth;
}

// Made with Bob
