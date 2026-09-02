import React from 'react';
import { TenantSwitcher } from './TenantSwitcher';
import { Bell, LogOut, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';

export const Header: React.FC = () => {
  const { logout } = useAuth();

  return (
    <header className="h-20 border-b border-zinc-200 bg-white px-8 flex items-center justify-between sticky top-0 z-30 shrink-0">
      <div className="flex items-center gap-6">
        <TenantSwitcher />
        <div className="hidden lg:flex items-center gap-2.5 px-4 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-500 w-80 shadow-inner">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            type="text"
            placeholder="Search students, staff, receipts... (Ctrl+K)"
            className="bg-transparent border-none outline-none text-xs text-zinc-900 placeholder-zinc-400 w-full"
            readOnly
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Tenant Isolated</span>
        </div>

        <div className="h-5 w-[1px] bg-zinc-200"></div>

        <button className="relative p-2.5 rounded-xl text-zinc-500 hover:text-zinc-900 bg-white hover:bg-zinc-50 border border-zinc-200 transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-mehndi-500 ring-2 ring-white"></span>
        </button>

        <button
          onClick={logout}
          className="md:hidden p-2.5 rounded-xl text-zinc-500 hover:text-zinc-900 bg-white hover:bg-zinc-50 border border-zinc-200 transition-all"
          title="Logout"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
