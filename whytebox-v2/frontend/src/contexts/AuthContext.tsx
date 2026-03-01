/**
 * Authentication Context
 * Manages user authentication state
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          // TODO: Validate token with backend
          // For now, use mock user
          const mockUser: User = {
            id: '1',
            email: 'user@example.com',
            name: 'Demo User',
            role: 'user',
          };
          setUser(mockUser);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      // TODO: Implement actual login API call
      const mockUser: User = {
        id: '1',
        email,
        name: 'Demo User',
        role: 'user',
      };
      
      localStorage.setItem('auth_token', 'mock_token');
      setUser(mockUser);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setUser(null);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    try {
      // TODO: Implement actual registration API call
      const mockUser: User = {
        id: '1',
        email,
        name,
        role: 'user',
      };
      
      localStorage.setItem('auth_token', 'mock_token');
      setUser(mockUser);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Made with Bob
