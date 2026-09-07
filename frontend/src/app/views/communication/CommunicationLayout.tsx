import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  FileText,
  Workflow,
  Clock,
  Bell,
  CheckSquare,
  BarChart3,
  Sliders,
  PlayCircle,
} from 'lucide-react';
import { useProcessPending } from '../../../lib/api/communication';

export const CommunicationLayout: React.FC = () => {
  const processPendingMutation = useProcessPending();

  const navTabs = [
    { name: 'Overview', path: '/communication', icon: MessageSquare, end: true },
    { name: 'Messages', path: '/communication/messages', icon: Send },
    { name: 'Templates', path: '/communication/templates', icon: FileText },
    { name: 'Automation Rules', path: '/communication/rules', icon: Workflow },
    { name: 'Scheduled Jobs', path: '/communication/jobs', icon: Clock },
    { name: 'Notifications', path: '/communication/notifications', icon: Bell },
    { name: 'Internal Tasks', path: '/communication/tasks', icon: CheckSquare },
    { name: 'Reports & Logs', path: '/communication/reports', icon: BarChart3 },
    { name: 'Settings & Providers', path: '/communication/settings', icon: Sliders },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-mehndi-50 text-mehndi-700">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">
              Communication & Automation
            </h1>
            <span className="text-[11px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-mehndi-100 text-mehndi-800 uppercase">
              M10
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1 max-w-2xl leading-relaxed">
            Multi-channel notifications, transactional domain automation, parent/staff messaging, and background scheduling.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => processPendingMutation.mutate()}
            disabled={processPendingMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition-all shadow-sm hover:shadow active:scale-98 disabled:opacity-50"
            title="Execute pending automation events, jobs and outbox deliveries immediately"
          >
            <PlayCircle className={`w-4 h-4 ${processPendingMutation.isPending ? 'animate-spin' : ''}`} />
            <span>{processPendingMutation.isPending ? 'Processing Work...' : 'Process Pending'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-zinc-200 scrollbar-none">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-mehndi-600 text-white shadow-xs shadow-mehndi-600/30'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.name}</span>
            </NavLink>
          );
        })}
      </div>

      {/* View Content */}
      <div className="pt-2">
        <Outlet />
      </div>
    </div>
  );
};

export default CommunicationLayout;
