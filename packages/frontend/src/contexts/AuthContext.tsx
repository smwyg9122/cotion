import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import type { User, UserCreateInput, UserLoginInput } from '@cotion/shared';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: UserLoginInput) => Promise<void>;
  signup: (input: UserCreateInput) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const response = await api.get('/auth/me');
        setUser(response.data.data);
      }
    } catch (error) {
      localStorage.removeItem('accessToken');
    } finally {
      setIsLoading(false);
    }
  }

  async function login(input: UserLoginInput) {
    const response = await api.post('/auth/login', input);
    const { user, accessToken } = response.data.data;
    localStorage.setItem('accessToken', accessToken);
    setUser(user);
  }

  async function signup(input: UserCreateInput) {
    const response = await api.post('/auth/signup', input);
    const { user, accessToken } = response.data.data;
    localStorage.setItem('accessToken', accessToken);
    setUser(user);
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
