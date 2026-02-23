import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axiosInstance from '../lib/axiosInstance';

export type UserRole = 'admin' | 'employee' | 'hr'; // Adding HR just in case backend has it

export interface User {
  _id: string;      // typically mongo uses _id instead of id
  fullName: string; // authController has fullName
  email: string;
  role: UserRole;
  status?: string;
  department?: string;
  isOnboarded?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('hf_access_token');
      if (token) {
        try {
          const res = await axiosInstance.get('/auth/me');
          setUser(res.data.data.user);
        } catch (error) {
          localStorage.removeItem('hf_access_token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await axiosInstance.post('/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('hf_access_token', res.data.data.accessToken);
        if (res.data.data.refreshToken) {
          localStorage.setItem('hf_refresh_token', res.data.data.refreshToken);
        }
        setUser(res.data.data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login failed", error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('hf_access_token');
    localStorage.removeItem('hf_refresh_token');
    setUser(null);
  };

  const completeOnboarding = () => {
    if (user) setUser({ ...user, status: 'active' });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, completeOnboarding }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
