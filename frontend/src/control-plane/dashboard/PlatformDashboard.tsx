import React from 'react';
import { Building2, CreditCard, Activity, Users, Database } from 'lucide-react';

export const PlatformDashboard: React.FC = () => {
  const stats = [
    {
      label: 'Active Tenant Schools',
      value: '1',
      change: '+100%',
      icon: Building2,
      color: 'text-mehndi-600',
      bg: 'bg-mehndi-100',
    },
    {
      label: 'Monthly Recurring Revenue',
      value: '₹4,99,900',
      change: '+18.4%',
      icon: CreditCard,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
    },
    {
      label: 'Active Student Identities',
      value: '1,240',
      change: '+12%',
      icon: Users,
      color: 'text-teal-600',
      bg: 'bg-teal-100',
    },
    {
      label: 'Platform System Health',
      value: '99.98%',
      change: 'Optimal',
      icon: Activity,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
  ];

  const tenants = [
    {
      name: 'Saifiyah High Secondary School',
      slug: 'saifiyah',
      plan: 'Legacy Full Access',
      status: 'ACTIVE',
      students: 1240,
      region: 'ap-south-1',
      shard: 'shard_primary_01',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
          Platform Operations Console
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Real-time oversight of multi-tenant registry, commercial subscriptions, and shard
          clusters.
        </p>
      </div>

      {/* Asymmetric Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Hero Metric */}
        <div className="lg:col-span-2 glass-panel p-6 flex flex-col justify-between bg-gradient-to-br from-white/60 to-mehndi-50/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-zinc-500">
              {stats[0].label}
            </span>
            <div
              className={`p-3 rounded-2xl ${stats[0].bg} ${stats[0].color} border border-zinc-200`}
            >
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-8 flex items-end justify-between">
            <span className="text-5xl font-black text-zinc-900 tracking-tight">
              {stats[0].value}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white text-zinc-600 border border-zinc-200 shadow-sm">
              {stats[0].change}
            </span>
          </div>
        </div>

        {/* Secondary Metrics */}
        {stats.slice(1).map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-panel p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider leading-snug w-2/3">
                  {stat.label}
                </span>
                <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} border border-zinc-200`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-6 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-extrabold text-zinc-900">{stat.value}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200 whitespace-nowrap">
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tenant Registry Table */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Provisioned Tenant Schools</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Isolated MySQL schemas with authoritative Laravel scoping
            </p>
          </div>
          <button className="px-4 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-xs font-semibold text-white shadow-md shadow-mehndi-600/20 transition-all">
            + Provision New School
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-200 bg-zinc-50/40">
              <tr>
                <th className="px-4 py-3 font-semibold">Tenant School</th>
                <th className="px-4 py-3 font-semibold">Slug Identifier</th>
                <th className="px-4 py-3 font-semibold">Plan Catalog</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Students</th>
                <th className="px-4 py-3 font-semibold">Database Shard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {tenants.map((t, idx) => (
                <tr
                  key={t.slug}
                  className="hover:bg-zinc-50 transition-colors animate-fade-in"
                  style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}
                >
                  <td className="px-4 py-3.5 font-semibold text-zinc-900">{t.name}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-mehndi-600">{t.slug}</td>
                  <td className="px-4 py-3.5 text-xs text-zinc-600">
                    <span className="px-2.5 py-1 rounded-md bg-mehndi-50 text-mehndi-700 border border-mehndi-200 font-medium">
                      {t.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-zinc-600 font-mono text-xs">{t.students}</td>
                  <td className="px-4 py-3.5 text-zinc-500 font-mono text-xs flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-zinc-400" />
                    {t.shard}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
