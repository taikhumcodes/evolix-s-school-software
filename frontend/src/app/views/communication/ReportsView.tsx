import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Clock,
  FileSpreadsheet,
  Activity,
  Layers,
} from 'lucide-react';
import {
  useAutomationExecutions,
  useCommunicationMessages,
} from '../../../lib/api/communication';
import apiClient from '../../../lib/api-client';

export const ReportsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'executions' | 'deliveries'>('executions');
  const [isExporting, setIsExporting] = useState(false);

  const { data: executionsData, isLoading: executionsLoading } = useAutomationExecutions(100, 0);
  const { data: messagesData, isLoading: messagesLoading } = useCommunicationMessages({ limit: 100 });

  const executions = executionsData?.items || [];
  const executionsTotal = executionsData?.total || 0;

  const messages = messagesData?.items || [];
  const messagesTotal = messagesData?.total || 0;

  // Handle CSV Export (Rule 56: Masked destination only, no plaintext PII)
  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const response = await apiClient.get('/api/v1/communication/messages/export', {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `communication_outbox_audit_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert('Failed to export communication messages: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsExporting(false);
    }
  };

  const getExecutionStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'SKIPPED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'FAILED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-mehndi-50 text-mehndi-700">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Reports & Audit Logs</h2>
            <p className="text-xs text-zinc-500">
              Execution telemetry, rule engine decisions, delivery statistics, and masked exports
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white transition active:scale-98 disabled:opacity-50"
            title="Export full outbox log with masked PII"
          >
            <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : ''}`} />
            <span>{isExporting ? 'Exporting CSV...' : 'Export Messages CSV'}</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
        <button
          onClick={() => setActiveTab('executions')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'executions'
              ? 'bg-zinc-900 text-white shadow-2xs'
              : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Automation Executions ({executionsTotal})</span>
        </button>

        <button
          onClick={() => setActiveTab('deliveries')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'deliveries'
              ? 'bg-zinc-900 text-white shadow-2xs'
              : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Delivery Audit Logs ({messagesTotal})</span>
        </button>
      </div>

      {/* TAB 1: Executions */}
      {activeTab === 'executions' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-2xs">
          {executionsLoading ? (
            <div className="flex flex-col items-center justify-center p-12">
              <Clock className="w-8 h-8 text-zinc-300 animate-spin mb-3" />
              <p className="text-sm font-medium text-zinc-500">Loading execution audit log...</p>
            </div>
          ) : executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Activity className="w-10 h-10 text-zinc-300 mb-3" />
              <h3 className="text-sm font-bold text-zinc-900">No rule executions recorded yet</h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1">
                When domain events occur or tests are triggered, rule evaluations and decisions will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Rule Name / Code</th>
                    <th className="py-3 px-4">Rule Ver</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Executed At</th>
                    <th className="py-3 px-4">Skip / Error Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/70 text-zinc-700">
                  {executions.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-zinc-900">
                        {item.event?.eventType || 'DOMAIN_EVENT'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-zinc-900">
                        {item.rule?.name || item.ruleId}
                        <span className="block text-[10px] font-mono text-zinc-400">
                          {item.rule?.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-500">v{item.ruleVersion}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${getExecutionStatusBadge(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-500 font-mono">
                        {new Date(item.executedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        {item.skipReason && (
                          <span className="text-[11px] text-amber-700 font-medium">
                            Skipped: {item.skipReason}
                          </span>
                        )}
                        {item.errorMessage && (
                          <span className="text-[11px] text-rose-600 font-medium">
                            Error: {item.errorMessage}
                          </span>
                        )}
                        {!item.skipReason && !item.errorMessage && (
                          <span className="text-zinc-400 font-mono text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Deliveries */}
      {activeTab === 'deliveries' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-2xs">
          {messagesLoading ? (
            <div className="flex flex-col items-center justify-center p-12">
              <Clock className="w-8 h-8 text-zinc-300 animate-spin mb-3" />
              <p className="text-sm font-medium text-zinc-500">Loading delivery records...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <FileSpreadsheet className="w-10 h-10 text-zinc-300 mb-3" />
              <h3 className="text-sm font-bold text-zinc-900">No delivery logs found</h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1">
                Outbox logs and delivery verification will appear here as messages are sent.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Destination (Masked)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Provider</th>
                    <th className="py-3 px-4">Attempts</th>
                    <th className="py-3 px-4">Queued / Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/70 text-zinc-700">
                  {messages.map((msg) => (
                    <tr key={msg.id} className="hover:bg-zinc-50/50 transition">
                      <td className="py-3 px-4 font-bold text-zinc-900">{msg.category}</td>
                      <td className="py-3 px-4 font-semibold text-zinc-700">{msg.channel}</td>
                      <td className="py-3 px-4 font-mono text-zinc-600">
                        {msg.destinationMasked || '******'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border bg-zinc-100 text-zinc-800 border-zinc-200">
                          {msg.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-500">
                        {msg.provider || 'default'}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-600">{msg.attemptCount}</td>
                      <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                        {msg.sentAt
                          ? `Sent: ${new Date(msg.sentAt).toLocaleString()}`
                          : `Queued: ${new Date(msg.queuedAt).toLocaleString()}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsView;
