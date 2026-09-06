import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export interface TenantInfo {
  schoolId: string;
  tenantSlug: string;
  schoolName: string;
  lifecycleStatus: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  roles: string[];
  entitlements: Record<string, boolean | number | string>;
}

export interface AvailableTenant {
  schoolId: string;
  tenantSlug: string;
  schoolName: string;
  isOwner: boolean;
  lifecycleStatus: string;
  roles: string[];
}

interface TenantContextType {
  currentTenant: TenantInfo | null;
  availableTenants: AvailableTenant[];
  isLoadingTenant: boolean;
  switchTenant: (tenantSlug: string, schoolId?: string) => Promise<void>;
  switchSchool: (schoolId: string, schoolName?: string) => void;
  hasEntitlement: (code: string) => boolean;
}

export const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [currentTenant, setCurrentTenant] = useState<TenantInfo | null>(null);
  const [availableTenants, setAvailableTenants] = useState<AvailableTenant[]>([]);
  const [isLoadingTenant, setIsLoadingTenant] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      const userSchools = user.schools || [];
      const savedSchoolId = localStorage.getItem('selected_school_id');
      const matchedSchool = userSchools.find((s) => s.id === savedSchoolId);
      const activeSchool = matchedSchool || userSchools[0];
      const activeSchoolId = activeSchool?.id || user.school_id || '';

      if (activeSchoolId) {
        localStorage.setItem('selected_school_id', activeSchoolId);
      }

      const initialSlug = localStorage.getItem('tenant_slug') || user.tenant_id || 'default';
      localStorage.setItem('tenant_slug', initialSlug);

      const defaultTenant: TenantInfo = {
        schoolId: activeSchoolId,
        tenantSlug: initialSlug,
        schoolName: activeSchool?.name || `School (${initialSlug})`,
        lifecycleStatus: 'ACTIVE',
        roles: user.roles || ['OWNER'],
        entitlements: {
          'students.enabled': true,
          'attendance.enabled': true,
          'finance.enabled': true,
          'academics.enabled': true,
          'exams.enabled': true,
          'payroll.enabled': true,
          'transport.enabled': true,
          'inventory.enabled': true,
          'custom_domain.enabled': true,
        },
      };

      setCurrentTenant(defaultTenant);

      const tenantsList: AvailableTenant[] = userSchools.map((s) => ({
        schoolId: s.id,
        tenantSlug: initialSlug,
        schoolName: s.name,
        isOwner: true,
        lifecycleStatus: 'ACTIVE',
        roles: user.roles || ['OWNER'],
      }));

      setAvailableTenants(
        tenantsList.length > 0
          ? tenantsList
          : [
              {
                schoolId: defaultTenant.schoolId,
                tenantSlug: defaultTenant.tenantSlug,
                schoolName: defaultTenant.schoolName,
                isOwner: true,
                lifecycleStatus: 'ACTIVE',
                roles: ['OWNER'],
              },
            ]
      );
    } else if (!isAuthLoading) {
      setCurrentTenant(null);
      setAvailableTenants([]);
    }
  }, [isAuthenticated, user, isAuthLoading]);

  const switchTenant = async (tenantSlug: string, schoolId?: string) => {
    setIsLoadingTenant(true);
    try {
      const selected = availableTenants.find((t) =>
        schoolId ? t.schoolId === schoolId : t.tenantSlug === tenantSlug
      );
      if (selected) {
        if (selected.schoolId) {
          localStorage.setItem('selected_school_id', selected.schoolId);
        }
        localStorage.setItem('tenant_slug', selected.tenantSlug);
        window.location.reload();
      }
    } finally {
      setIsLoadingTenant(false);
    }
  };

  const switchSchool = (newSchoolId: string, _schoolName?: string) => {
    localStorage.setItem('selected_school_id', newSchoolId);
    window.location.reload();
  };

  const hasEntitlement = (code: string): boolean => {
    if (!currentTenant) return false;
    const val = currentTenant.entitlements[code];
    return val === true || (typeof val === 'number' && val > 0);
  };

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        availableTenants,
        isLoadingTenant,
        switchTenant,
        switchSchool,
        hasEntitlement,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useOptionalTenant = () => {
  return useContext(TenantContext);
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
