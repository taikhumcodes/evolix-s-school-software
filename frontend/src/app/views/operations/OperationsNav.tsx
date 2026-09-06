import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Bus,
  Package,
  Armchair,
  ShieldCheck,
  Trophy,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';

export const OperationsNav: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission, user } = useAuth();
  const isSuperadmin = Boolean(user?.isSuperadmin);

  const navItems = [
    {
      to: '/operations/overview',
      label: t('operations.nav.overview', 'Overview'),
      icon: LayoutDashboard,
      permission: null,
    },
    {
      to: '/operations/transport',
      label: t('operations.nav.transport', 'Transport & Fleet'),
      icon: Bus,
      permission: 'transport.view',
    },
    {
      to: '/operations/inventory',
      label: t('operations.nav.inventory', 'Inventory & Supplies'),
      icon: Package,
      permission: 'inventory.view',
    },
    {
      to: '/operations/assets',
      label: t('operations.nav.assets', 'Asset Register'),
      icon: Armchair,
      permission: 'inventory.assets.view',
    },
    {
      to: '/operations/gate',
      label: t('operations.nav.gate', 'Gate & Visitors'),
      icon: ShieldCheck,
      permission: 'gate.view',
    },
    {
      to: '/operations/events',
      label: t('operations.nav.events', 'Activities & Events'),
      icon: Trophy,
      permission: 'events.view',
    },
    {
      to: '/operations/reports',
      label: t('operations.nav.reports', 'Reports & Exports'),
      icon: FileSpreadsheet,
      permission: null,
    },
  ];

  return (
    <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
      <div className="flex items-center gap-2 overflow-x-auto px-6 py-2 no-scrollbar">
        {navItems.map((item) => {
          if (!isSuperadmin && item.permission && !hasPermission(item.permission)) {
            return null;
          }

          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-mehndi-600 text-white shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};
