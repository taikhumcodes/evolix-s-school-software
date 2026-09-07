import React, { useState } from 'react';
import {
  Filter,
  RefreshCw,
  XCircle,
  Eye,
  X,
} from 'lucide-react';
import {
  useCommunicationMessages,
  useMessageDetail,
  useRetryMessage,
  useCancelMessage,
  useRecordManualSend,
} from '../../../lib/api/communication';

export const MessagesView: React.FC = () => {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useCommunicationMessages({
    category: categoryFilter || undefined,
    channel: channelFilter || undefined,
    status: statusFilter || undefined,
  });

  const { data: messageDetail, isLoading: detailLoading } = useMessageDetail(selectedMessageId || '');

  const retryMutation = useRetryMessage();
  const cancelMutation = useCancelMessage();
  const manualConfirmMutation = useRecordManualSend();

  const handleManualConfirm = async (id: string) => {
    await manualConfirmMutation.mutateAsync(id);
    refetch();
  };

  const handleRetry = async (id: string) => {
    await retryMutation.mutateAsync(id);
    refetch();
  };

  const handleCancel = async (id: string) => {
    await cancelMutation.mutateAsync(id);
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-medium bg-zinc-50/50 text-zinc-700"
          >
            <option value="">All Categories</option>
            <option value="ATTENDANCE">Attendance</option>
            <option value="FEES">Fees</option>
            <option value="ACADEMIC">Academic</option>
            <option value="EXAM">Exam</option>
            <option value="RESULT">Result</option>
            <option value="HR">HR</option>
            <option value="PAYROLL">Payroll</option>
            <option value="TRANSPORT">Transport</option>
            <option value="EVENT">Event</option>
            <option value="GENERAL">General</option>
          </select>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-medium bg-zinc-50/50 text-zinc-700"
          >
            <option value="">All Channels</option>
            <option value="IN_APP">In-App</option>
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-medium bg-zinc-50/50 text-zinc-700"
          >
            <option value="">All Statuses</option>
            <option value="QUEUED">Queued</option>
            <option value="PROCESSING">Processing</option>
            <option value="SENT">Sent</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
            <option value="MANUAL_ACTION_REQUIRED">Manual Action Required</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Messages Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/80 text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-100">
              <tr>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Channel</th>
                <th className="px-5 py-3">Recipient</th>
                <th className="px-5 py-3">Destination (Masked)</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Delivery Mode</th>
                <th className="px-5 py-3">Queued At</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-zinc-400">Loading messages...</td>
                </tr>
              ) : data?.items?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-zinc-400">No messages match the selected filters</td>
                </tr>
              ) : (
                data?.items?.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-zinc-800">{m.category}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-[10px]">
                        {m.channel}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 font-medium">{m.recipientType}</td>
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
                    <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedMessageId(m.id)}
                        className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {m.status === 'MANUAL_ACTION_REQUIRED' && (
                        <button
                          onClick={() => handleManualConfirm(m.id)}
                          disabled={manualConfirmMutation.isPending}
                          className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors"
                          title="Confirm you sent this manually (e.g. WhatsApp)"
                        >
                          Confirm Sent
                        </button>
                      )}

                      {(m.status === 'FAILED' || m.status === 'PROVIDER_NOT_CONFIGURED') && (
                        <button
                          onClick={() => handleRetry(m.id)}
                          disabled={retryMutation.isPending}
                          className="p-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Retry Delivery"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {m.status === 'QUEUED' && (
                        <button
                          onClick={() => handleCancel(m.id)}
                          disabled={cancelMutation.isPending}
                          className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          title="Cancel Message"
                        >
                          <XCircle className="w-3.5 h-3.5" />
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

      {/* Message Details Modal */}
      {selectedMessageId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-base font-black text-zinc-900">Message Audit Inspector</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Authoritative delivery and rendered snapshot</p>
              </div>
              <button
                onClick={() => setSelectedMessageId(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center text-zinc-400 text-xs">Loading message details...</div>
            ) : messageDetail ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50/70 p-3.5 rounded-2xl border border-zinc-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Status</span>
                    <p className="font-bold text-zinc-800 mt-0.5">{messageDetail.status}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Channel</span>
                    <p className="font-bold text-zinc-800 mt-0.5">{messageDetail.channel}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Delivery Mode</span>
                    <p className="font-bold text-zinc-800 mt-0.5">{messageDetail.deliveryMode || 'AUTOMATIC'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Evidence</span>
                    <p className="font-bold text-zinc-800 mt-0.5">{messageDetail.sendEvidenceType || 'NONE'}</p>
                  </div>
                </div>

                {messageDetail.subjectRendered && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Subject</span>
                    <p className="font-bold text-zinc-900 mt-0.5">{messageDetail.subjectRendered}</p>
                  </div>
                )}

                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Rendered Content (Immutable)</span>
                  <div className="mt-1 p-4 rounded-2xl bg-zinc-900 text-zinc-100 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                    {messageDetail.bodyRendered}
                  </div>
                </div>

                {messageDetail.deliveryAttempts && messageDetail.deliveryAttempts.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Delivery Attempts History (Rule 14)</span>
                    <div className="mt-1 space-y-2">
                      {messageDetail.deliveryAttempts.map((att) => (
                        <div key={att.id} className="p-3 rounded-xl border border-zinc-100 bg-zinc-50 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-zinc-800">Attempt #{att.attemptNumber}</span>
                            <span className="ml-2 font-mono text-[11px] text-zinc-500">via {att.provider}</span>
                            {att.errorMessage && (
                              <p className="text-red-600 text-[11px] mt-0.5">{att.errorMessage}</p>
                            )}
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700">
                            {att.resultStatus}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedMessageId(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesView;
