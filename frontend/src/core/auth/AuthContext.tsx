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
  isSuperadmin?: boolean;
  tenant_id: string;
  school_id?: string;
  schools?: { id: string; name: string; code?: string }[];
  roles?: string[];
  permissions?: string[];
  is_2fa_enabled?: boolean;
  must_change_password?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasPermission: (permissionCode: string) => boolean;
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
      const userSchools = data.schools || [];
      const savedSchoolId = localStorage.getItem('selected_school_id');
      const matched = userSchools.find((s: any) => s.id === savedSchoolId);
      const activeSchool = matched || userSchools[0];
      const selectedSchoolId = activeSchool?.id || data.selected_school_id || data.school_id || '';

      if (selectedSchoolId) {
        localStorage.setItem('selected_school_id', selectedSchoolId);
      }

      return {
        ...data,
        name: data.first_name
          ? `${data.first_name} ${data.last_name || ''}`.trim()
          : data.email.split('@')[0],
        isPlatformAdmin: Boolean(data.isSuperadmin),
        isSuperadmin: Boolean(data.isSuperadmin),
        school_id: selectedSchoolId,
        selected_school_id: selectedSchoolId,
        schools: userSchools,
        roles: data.roles || [],
        permissions: (data.permissions || []).map((p: string) => p.toLowerCase()),
        is_2fa_enabled: Boolean(data.is_2fa_enabled),
        must_change_password: Boolean(data.must_change_password),
      };
    },
    enabled: !!token,
    retry: false,
  });

  const hasPermission = (permissionCode: string): boolean => {
    if (!user) return false;
    if (user.isSuperadmin || user.roles?.some((r) => r.toLowerCase() === 'superadmin')) {
      return true;
    }
    return Boolean(user.permissions?.includes(permissionCode.toLowerCase()));
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('tenant_slug');
    localStorage.removeItem('selected_school_id');
    queryClient.clear();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isAuthenticated: !!user,
        isLoading,
        hasPermission,
        logout,
      }}
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
