import { ShieldCheck, Users, Key } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function SecurityOverview() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Security & Access Overview</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Configure tenant-wide security policies and monitor access.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NavLink
          to="/admin/security/policy"
          className="block p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm hover:shadow-md hover:border-mehndi-300 transition-all group"
        >
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
            <Key className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900 mb-1">Password Policy</h2>
          <p className="text-sm text-zinc-500">
            Configure password complexity, expiration, and lockout rules for all users.
          </p>
        </NavLink>

        <NavLink
          to="/admin/security/ip-restrictions"
          className="block p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm hover:shadow-md hover:border-mehndi-300 transition-all group"
        >
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900 mb-1">IP Restrictions</h2>
          <p className="text-sm text-zinc-500">
            Manage network allowlists and denylists for accessing the platform.
          </p>
        </NavLink>

        <NavLink
          to="/admin/security/events"
          className="block p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm hover:shadow-md hover:border-mehndi-300 transition-all group"
        >
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-100 transition-colors">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900 mb-1">Security Events</h2>
          <p className="text-sm text-zinc-500">
            View the immutable audit log of all security-related activities.
          </p>
        </NavLink>
      </div>
    </div>
  );
}
