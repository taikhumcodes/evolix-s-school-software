import React, { useState } from 'react';
import { useTenant } from '../../core/tenancy/TenantContext';
import { Building2, ChevronDown, Check, Plus } from 'lucide-react';

export const TenantSwitcher: React.FC = () => {
  const { currentTenant, availableTenants, switchTenant } = useTenant();
  const [isOpen, setIsOpen] = useState(false);

  if (!currentTenant) return null;

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3.5 px-4 py-2.5 rounded-2xl bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 transition-all duration-200 text-sm font-medium text-zinc-700 hover:text-zinc-900 shadow-md active:scale-[0.99] cursor-pointer"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-mehndi-100 to-mehndi-50 border border-mehndi-200 flex items-center justify-center text-mehndi-600 shrink-0">
          <Building2 className="w-4 h-4" />
        </div>
        <div className="text-left">
          <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 leading-none mb-1">
            Active School
          </div>
          <div className="font-bold text-zinc-900 text-sm truncate max-w-[200px] leading-none">
            {currentTenant.schoolName}
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-zinc-500 ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2.5 w-80 origin-top-left rounded-2xl bg-white border border-zinc-200 shadow-2xl z-50 p-2.5 text-zinc-800 animate-fade-in">
            <div className="px-3 py-2 text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
              <span>Select School Context</span>
              <span className="text-[10px] font-mono text-mehndi-500">Multi-Tenant</span>
            </div>

            <div className="space-y-1.5 my-2">
              {availableTenants.map((tenant) => {
                const isSelected = tenant.tenantSlug === currentTenant.tenantSlug;
                return (
                  <button
                    key={tenant.tenantSlug}
                    onClick={() => {
                      switchTenant(tenant.tenantSlug);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-sm transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-mehndi-100 to-white text-mehndi-800 border border-mehndi-200 shadow-sm font-semibold'
                        : 'hover:bg-zinc-50 text-zinc-600 border border-transparent'
                    }`}
                  >
                    <div className="truncate flex-1">
                      <div className="font-semibold text-zinc-900 truncate">
                        {tenant.schoolName}
                      </div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-mehndi-600">/{tenant.tenantSlug}</span>
                        <span>•</span>
                        <span>{tenant.roles.join(', ')}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-mehndi-100 border border-mehndi-200 flex items-center justify-center text-mehndi-600 shrink-0 ml-2">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-zinc-200 mt-2">
              <button
                onClick={() => {
                  alert('Tenant registration wizard flow initiated.');
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-mehndi-700 bg-mehndi-50 hover:bg-mehndi-100 border border-mehndi-200 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Register New School
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
