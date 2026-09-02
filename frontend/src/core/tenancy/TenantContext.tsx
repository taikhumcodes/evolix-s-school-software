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
  switchTenant: (tenantSlug: string) => Promise<void>;
  hasEntitlement: (code: string) => boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [currentTenant, setCurrentTenant] = useState<TenantInfo | null>(null);
  const [availableTenants, setAvailableTenants] = useState<AvailableTenant[]>([]);
  const [isLoadingTenant, setIsLoadingTenant] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      // For now, derive basic tenant info from the user object.
      // In a real app, this might fetch from a `/users/me/tenants` endpoint.
      const initialSlug = localStorage.getItem('tenant_slug') || user.tenant_id || 'default';

      const defaultTenant: TenantInfo = {
        schoolId: user.tenant_id,
        tenantSlug: initialSlug,
        schoolName: `School (${initialSlug})`,
        lifecycleStatus: 'ACTIVE',
        roles: ['OWNER'],
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
      setAvailableTenants([
        {
          schoolId: defaultTenant.schoolId,
          tenantSlug: defaultTenant.tenantSlug,
          schoolName: defaultTenant.schoolName,
          isOwner: true,
          lifecycleStatus: 'ACTIVE',
          roles: ['OWNER'],
        },
      ]);

      // Persist the active tenant slug
      localStorage.setItem('tenant_slug', initialSlug);
    } else {
      setCurrentTenant(null);
      setAvailableTenants([]);
    }
  }, [isAuthenticated, user]);

  const switchTenant = async (tenantSlug: string) => {
    setIsLoadingTenant(true);
    try {
      const selected = availableTenants.find((t) => t.tenantSlug === tenantSlug);
      if (selected) {
        setCurrentTenant({
          schoolId: selected.schoolId,
          tenantSlug: selected.tenantSlug,
          schoolName: selected.schoolName,
          lifecycleStatus: selected.lifecycleStatus as any,
          roles: selected.roles,
          entitlements: {
            'students.enabled': true,
            'attendance.enabled': true,
            'finance.enabled': true,
            'academics.enabled': true,
            'exams.enabled': true,
            'payroll.enabled': true,
            'transport.enabled': true,
            'inventory.enabled': true,
          },
        });
        localStorage.setItem('tenant_slug', tenantSlug);
        // Reload page to reset all queries with new tenant context
        window.location.reload();
      }
    } finally {
      setIsLoadingTenant(false);
    }
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
        hasEntitlement,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
