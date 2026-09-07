import React from 'react';
import {
  Send,
  Workflow,
  Clock,
  Radio,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useCommunicationMessages,
  useAutomationRules,
  useScheduledJobs,
  useProviderStatuses,
  useMyNotifications,
} from '../../../lib/api/communication';

export const CommunicationOverview: React.FC = () => {
  const navigate = useNavigate();

  const { data: messagesData, isLoading: messagesLoading } = useCommunicationMessages({ limit: 8 });
  const { data: rulesData } = useAutomationRules();
  const { data: jobsData } = useScheduledJobs('PENDING', 5);
  const { data: providersData } = useProviderStatuses();
  const { data: notificationsData } = useMyNotifications();

  const totalMessages = messagesData?.total || 0;
  const activeRulesCount = rulesData?.filter((r) => r.isActive).length || 0;
  const pendingJobsCount = jobsData?.total || 0;
  const unreadNotifCount = notificationsData?.unreadCount || 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Messages</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-zinc-900 mt-2">{totalMessages}</p>
          <p className="text-[11px] text-zinc-400 mt-1">Queued & sent across all channels</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Active Rules</span>
            <div className="p-2 rounded-xl bg-mehndi-50 text-mehndi-700">
              <Workflow className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-zinc-900 mt-2">{activeRulesCount}</p>
          <p className="text-[11px] text-zinc-400 mt-1">Automated workflows running</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Pending Jobs</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-zinc-900 mt-2">{pendingJobsCount}</p>
          <p className="text-[11px] text-zinc-400 mt-1">Scheduled reminders & defers</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Unread In-App</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-zinc-900 mt-2">{unreadNotifCount}</p>
          <p className="text-[11px] text-zinc-400 mt-1">Notifications waiting for you</p>
        </div>
      </div>

      {/* Provider Connectivity Grid */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-mehndi-600" />
            <h2 className="font-bold text-sm text-zinc-900">Provider Connectivity Status</h2>
          </div>
          <button
            onClick={() => navigate('/communication/settings')}
            className="text-xs font-bold text-mehndi-600 hover:text-mehndi-700 flex items-center gap-1"
          >
            Configure Providers <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {providersData?.map((p) => (
            <div key={p.channel} className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-zinc-900">{p.channel}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.available
                        ? 'bg-emerald-100 text-emerald-800'
                        : p.configured
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-zinc-200 text-zinc-600'
                    }`}
                  >
                    {p.available ? 'AVAILABLE' : p.configured ? 'CONFIGURED' : 'NOT CONFIGURED'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-2 line-clamp-2">{p.statusText}</p>
              </div>
              <span className="text-[9px] text-zinc-400 mt-3">{p.provider}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Messages Activity Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm text-zinc-900">Recent Communication Activity</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Real-time delivery log with masked destinations</p>
          </div>
          <button
            onClick={() => navigate('/communication/messages')}
            className="text-xs font-bold text-mehndi-600 hover:text-mehndi-700"
          >
            View All Messages →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/80 text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-100">
              <tr>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Channel</th>
                <th className="px-5 py-3">Destination (Masked)</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Delivery Mode</th>
                <th className="px-5 py-3">Queued At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {messagesLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-zinc-400">Loading messages...</td>
                </tr>
              ) : messagesData?.items?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-zinc-400">No messages recorded yet</td>
                </tr>
              ) : (
                messagesData?.items?.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-zinc-800">{m.category}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-[10px]">
                        {m.channel}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-zinc-600">{m.destinationMasked || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${
                          m.status === 'SENT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.status === 'QUEUED'
                            ? 'bg-blue-100 text-blue-800'
                            : m.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : m.status === 'MANUAL_ACTION_REQUIRED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500 font-medium text-[11px]">
                      {m.deliveryMode || 'AUTOMATIC'}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400">
                      {new Date(m.queuedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CommunicationOverview;
