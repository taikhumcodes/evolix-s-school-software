import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  isPlatformAdmin: boolean;
  tenant_id: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const token = localStorage.getItem('access_token');

  const { data: user, isLoading } = useQuery<UserProfile>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await apiClient.get('/auth/me');
      const data = response.data;
      return {
        ...data,
        name: data.first_name ? `${data.first_name} ${data.last_name}` : data.email.split('@')[0],
        isPlatformAdmin: false, // Replace with actual role check if needed
      };
    },
    enabled: !!token,
    retry: false,
  });

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('tenant_slug');
    queryClient.clear();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{ user: user || null, isAuthenticated: !!user, isLoading, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
