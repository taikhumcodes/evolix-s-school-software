import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Ban,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  useGeneratedDocuments,
  useFinalizeDocument,
  useCancelDocument,
  downloadOrReprintPdf,
  GeneratedDocument,
} from '../../../lib/api/documents';

export const GeneratedDocumentsView: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  // Cancellation Modal State
  const [cancelModalDoc, setCancelModalDoc] = useState<GeneratedDocument | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // History / Audit Modal State
  const [historyModalDoc, setHistoryModalDoc] = useState<GeneratedDocument | null>(null);

  const { data, isLoading, refetch } = useGeneratedDocuments({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    category: categoryFilter === 'ALL' ? undefined : categoryFilter,
    search: searchTerm.trim() || undefined,
    page,
    limit: 15,
  });

  const finalizeMutation = useFinalizeDocument();
  const cancelMutation = useCancelDocument();

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalDoc || !cancelReason.trim()) return;
    try {
      await cancelMutation.mutateAsync({
        documentId: cancelModalDoc.id,
        reason: cancelReason.trim(),
      });
      setCancelModalDoc(null);
      setCancelReason('');
      refetch();
    } catch (err) {
      console.error('Failed to cancel document', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FINALIZED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            FINALIZED
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3" />
            DRAFT
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" />
            CANCELLED
          </span>
        );
      case 'SUPERSEDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <RefreshCw className="w-3 h-3" />
            SUPERSEDED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder={t('documents.register.searchPlaceholder', 'Search document #, recipient, type...')}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-mehndi-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-700 focus:bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="FINALIZED">FINALIZED Only</option>
            <option value="DRAFT">DRAFT Only</option>
            <option value="SUPERSEDED">SUPERSEDED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-700 focus:bg-white"
          >
            <option value="ALL">All Categories</option>
            <option value="STUDENT">Student</option>
            <option value="ACADEMIC">Academic</option>
            <option value="FINANCE">Finance</option>
            <option value="HR">HR & Payroll</option>
            <option value="OPERATIONS">Operations</option>
          </select>

          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Register Table */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/70 border-b border-zinc-100 text-zinc-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Document #</th>
                <th className="px-6 py-3.5">Template / Type</th>
                <th className="px-6 py-3.5">Recipient</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Reprints</th>
                <th className="px-6 py-3.5">SHA-256 Checksum</th>
                <th className="px-6 py-3.5">Date Issued</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-zinc-400">
                    Loading document register...
                  </td>
                </tr>
              ) : !data?.items || data.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-zinc-400">
                    No documents found matching filters.
                  </td>
                </tr>
              ) : (
                data.items.map((doc) => {
                  const recipient =
                    doc.dataSnapshotJson?.student?.fullName ||
                    doc.dataSnapshotJson?.employee?.fullName ||
                    doc.dataSnapshotJson?.gate?.visitorName ||
                    '-';
                  return (
                    <tr key={doc.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-3.5 font-bold font-mono text-zinc-900">
                        {doc.documentNumber || (
                          <span className="text-zinc-400 font-sans italic font-normal">DRAFT</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-zinc-900">{doc.template?.name || doc.documentType}</div>
                        <div className="text-[10px] text-zinc-500">{doc.category}</div>
                      </td>
                      <td className="px-6 py-3.5 font-medium text-zinc-800">{recipient}</td>
                      <td className="px-6 py-3.5">{getStatusBadge(doc.status)}</td>
                      <td className="px-6 py-3.5 font-mono text-zinc-500">{doc.reprintCount}</td>
                      <td className="px-6 py-3.5 font-mono text-[10px] text-zinc-400" title={doc.checksumSha256 || ''}>
                        {doc.checksumSha256 ? `${doc.checksumSha256.slice(0, 10)}...` : '-'}
                      </td>
                      <td className="px-6 py-3.5 text-zinc-500">
                        {new Date(doc.finalizedAt || doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {doc.status === 'FINALIZED' && (
                            <button
                              onClick={() => downloadOrReprintPdf(doc.id, `${doc.documentNumber || doc.id}.pdf`)}
                              className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                              title="Reprint / Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}

                          {doc.status === 'DRAFT' && (
                            <button
                              onClick={async () => {
                                await finalizeMutation.mutateAsync(doc.id);
                                refetch();
                              }}
                              className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold border border-emerald-200"
                              title="Finalize & Allocate Number"
                            >
                              Finalize
                            </button>
                          )}

                          {doc.status === 'FINALIZED' && (
                            <button
                              onClick={() => setCancelModalDoc(doc)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                              title="Cancel / Revoke Document"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setHistoryModalDoc(doc)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                            title="Audit Trail & Details"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > 0 && (
          <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Showing {data.items.length} of {data.total} documents
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-zinc-200 disabled:opacity-40 hover:bg-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-zinc-800">Page {page}</span>
              <button
                disabled={data.items.length < 15 || page * 15 >= data.total}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-zinc-200 disabled:opacity-40 hover:bg-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cancellation Modal */}
      {cancelModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <Ban className="w-5 h-5" />
              <h2 className="text-base font-bold text-zinc-900">Revoke / Cancel Document</h2>
            </div>
            <p className="text-xs text-zinc-500">
              Are you sure you want to cancel document{' '}
              <span className="font-mono font-bold text-zinc-900">{cancelModalDoc.documentNumber}</span>? This action is
              immutable and logged in the audit trail.
            </p>

            <form onSubmit={handleCancelSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Cancellation Reason (Mandatory)</label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Student transferred, typographical error, certificate revoked..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalDoc(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cancelMutation.isPending || !cancelReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {cancelMutation.isPending ? 'Revoking...' : 'Confirm Revocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit History Modal */}
      {historyModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200">
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <History className="w-5 h-5 text-zinc-500" />
              Document Audit Trail & Metadata
            </h2>
            <div className="mt-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-mono space-y-1">
              <div>
                <span className="text-zinc-400">Doc ID:</span> {historyModalDoc.id}
              </div>
              <div>
                <span className="text-zinc-400">Number:</span> {historyModalDoc.documentNumber || 'DRAFT'}
              </div>
              <div>
                <span className="text-zinc-400">Checksum:</span> {historyModalDoc.checksumSha256 || 'N/A'}
              </div>
            </div>

            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-1">
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Action History</h3>
              {!historyModalDoc.actions || historyModalDoc.actions.length === 0 ? (
                <p className="text-xs text-zinc-400">No recorded audit actions yet.</p>
              ) : (
                historyModalDoc.actions.map((act) => (
                  <div key={act.id} className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 text-xs">
                    <div className="flex items-center justify-between font-semibold text-zinc-800">
                      <span>{act.action}</span>
                      <span className="text-[10px] text-zinc-400 font-normal">
                        {new Date(act.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {act.actor && (
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        By: {act.actor.firstName} {act.actor.lastName}
                      </div>
                    )}
                    {act.metadata?.reason && (
                      <div className="text-[11px] text-zinc-600 italic mt-1">
                        Reason: {act.metadata.reason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-zinc-100 mt-4">
              <button
                onClick={() => setHistoryModalDoc(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold"
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

export default GeneratedDocumentsView;
