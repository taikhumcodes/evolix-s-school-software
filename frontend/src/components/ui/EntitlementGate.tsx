import React from 'react';
import { useTenant } from '../../core/tenancy/TenantContext';
import { Lock } from 'lucide-react';

interface EntitlementGateProps {
  entitlement: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const EntitlementGate: React.FC<EntitlementGateProps> = ({
  entitlement,
  fallback,
  children,
}) => {
  const { hasEntitlement } = useTenant();

  if (hasEntitlement(entitlement)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="p-8 rounded-2xl bg-white border border-zinc-200 text-center max-w-md mx-auto my-8">
      <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-zinc-900 mb-2">Upgrade Required</h3>
      <p className="text-sm text-zinc-500 mb-6">
        This capability (<span className="font-mono text-xs text-mehndi-600">{entitlement}</span>)
        is not active in your current school plan.
      </p>
      <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-mehndi-500 to-mehndi-600 hover:from-mehndi-600 hover:to-mehndi-700 text-white text-sm font-semibold shadow-lg shadow-mehndi-500/25 transition-all">
        View Subscription Plans
      </button>
    </div>
  );
};
