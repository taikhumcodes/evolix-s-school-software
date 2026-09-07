import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useScheduledJobs, useCancelScheduledJob } from '../../../lib/api/communication';

export const ScheduledJobsView: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading, refetch } = useScheduledJobs(statusFilter || undefined);
  const cancelMutation = useCancelScheduledJob();

  const handleCancel = async (id: string) => {
    if (confirm('Cancel this scheduled automation job?')) {
      await cancelMutation.mutateAsync(id);
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <label className="font-bold text-zinc-500">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-zinc-200 font-medium text-zinc-700 bg-zinc-50/50"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="SKIPPED">Skipped (Double Guard)</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/80 text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-100">
              <tr>
                <th className="px-5 py-3">Job Type</th>
                <th className="px-5 py-3">Source Type</th>
                <th className="px-5 py-3">Scheduled For</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Defers</th>
                <th className="px-5 py-3">Skip / Error Reason</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-zinc-400">Loading scheduled jobs...</td>
                </tr>
              ) : data?.items?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-zinc-400">No scheduled jobs recorded</td>
                </tr>
              ) : (
                data?.items?.map((j) => (
                  <tr key={j.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-zinc-800">{j.jobType}</td>
                    <td className="px-5 py-3.5 font-mono text-zinc-600">{j.sourceType}</td>
                    <td className="px-5 py-3.5 font-medium text-zinc-700">
                      {new Date(j.scheduledFor).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${
                          j.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : j.status === 'PENDING'
                            ? 'bg-blue-100 text-blue-800'
                            : j.status === 'SKIPPED'
                            ? 'bg-amber-100 text-amber-800'
                            : j.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {j.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-zinc-600">{j.deferCount} / 3</td>
                    <td className="px-5 py-3.5 text-zinc-500 max-w-xs truncate">
                      {j.skipReason ? (
                        <span className="text-amber-700 font-semibold">{j.skipReason}</span>
                      ) : j.lastError ? (
                        <span className="text-red-600">{j.lastError}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {j.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancel(j.id)}
                          disabled={cancelMutation.isPending}
                          className="px-2 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-bold"
                        >
                          Cancel
                        </button>
                      )}
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

export default ScheduledJobsView;
