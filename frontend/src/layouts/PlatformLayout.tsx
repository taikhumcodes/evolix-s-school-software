import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { ServerCog, ArrowLeft } from 'lucide-react';

export const PlatformLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#fcfdfa] text-zinc-900 font-sans flex flex-col">
      {/* Platform Topbar */}
      <header className="h-16 border-b border-zinc-200 bg-white px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <NavLink
            to="/students"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to School App
          </NavLink>
          <div className="h-4 w-[1px] bg-zinc-200"></div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-mehndi-100 border border-mehndi-200 flex items-center justify-center text-mehndi-600">
              <ServerCog className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm tracking-wide text-mehndi-700">
              EVOLIX PLATFORM CONTROL PLANE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-mehndi-50 text-mehndi-700 border border-mehndi-200 font-semibold">
            Super Admin Mode
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
};
