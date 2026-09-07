import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Printer,
  FilePlus,
  Layers,
  Stamp,
  Search,
  Download,
  ShieldCheck,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { useDocumentReports, downloadOrReprintPdf } from '../../../lib/api/documents';

export const DocumentsOverview: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: stats, isLoading, refetch } = useDocumentReports();
  const [quickVerifyToken, setQuickVerifyToken] = useState('');

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickVerifyToken.trim()) {
      navigate(`/verify/document/${quickVerifyToken.trim()}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FINALIZED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            {t('documents.status.finalized', 'FINALIZED')}
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3" />
            {t('documents.status.draft', 'DRAFT')}
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" />
            {t('documents.status.cancelled', 'CANCELLED')}
          </span>
        );
      case 'SUPERSEDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <RefreshCw className="w-3 h-3" />
            {t('documents.status.superseded', 'SUPERSEDED')}
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
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">{t('documents.stats.total', 'Total Documents')}</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-zinc-900 tracking-tight">
            {isLoading ? '...' : stats?.totalDocuments || 0}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">{t('documents.stats.totalDesc', 'Generated certificates & files')}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">{t('documents.stats.finalized', 'Finalized')}</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-600 tracking-tight">
            {isLoading ? '...' : stats?.finalizedDocuments || 0}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">{t('documents.stats.finalizedDesc', 'Official & verifiable')}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">{t('documents.stats.drafts', 'Drafts')}</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-amber-600 tracking-tight">
            {isLoading ? '...' : stats?.draftDocuments || 0}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">{t('documents.stats.draftsDesc', 'Pending finalization')}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">{t('documents.stats.reprints', 'Reprints')}</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Printer className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-indigo-600 tracking-tight">
            {isLoading ? '...' : stats?.reprintCountTotal || 0}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">{t('documents.stats.reprintsDesc', 'Idempotent byte reprints')}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">{t('documents.stats.cancelled', 'Revoked / Cancelled')}</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-rose-600 tracking-tight">
            {isLoading ? '...' : stats?.cancelledDocuments || 0}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">{t('documents.stats.cancelledDesc', 'Invalidated certificates')}</p>
        </div>
      </div>

      {/* Quick Actions & Verification Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Issuance Actions */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-zinc-900">
              {t('documents.quickActions.title', 'Quick Document Actions')}
            </h2>
            <button
              onClick={() => refetch()}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('common.refresh', 'Refresh')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <NavLink
              to="/documents/generate?type=BONAFIDE_CERTIFICATE"
              className="p-4 rounded-2xl border border-zinc-200/80 hover:border-mehndi-500 hover:bg-mehndi-50/30 transition-all group"
            >
              <div className="p-2 w-fit rounded-xl bg-mehndi-100 text-mehndi-700 mb-3 group-hover:bg-mehndi-600 group-hover:text-white transition-colors">
                <FilePlus className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-zinc-900 group-hover:text-mehndi-700">
                {t('documents.quickActions.bonafide', 'Issue Bonafide Certificate')}
              </h3>
              <p className="text-[11px] text-zinc-500 mt-1">
                {t('documents.quickActions.bonafideDesc', 'Standard student bonafide with QR verification')}
              </p>
            </NavLink>

            <NavLink
              to="/documents/bulk"
              className="p-4 rounded-2xl border border-zinc-200/80 hover:border-mehndi-500 hover:bg-mehndi-50/30 transition-all group"
            >
              <div className="p-2 w-fit rounded-xl bg-blue-100 text-blue-700 mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-zinc-900 group-hover:text-blue-700">
                {t('documents.quickActions.bulkIdCards', 'Bulk Student ID Cards')}
              </h3>
              <p className="text-[11px] text-zinc-500 mt-1">
                {t('documents.quickActions.bulkIdCardsDesc', 'Batch generate CR80 cards for entire class')}
              </p>
            </NavLink>

            <NavLink
              to="/documents/signatures"
              className="p-4 rounded-2xl border border-zinc-200/80 hover:border-mehndi-500 hover:bg-mehndi-50/30 transition-all group"
            >
              <div className="p-2 w-fit rounded-xl bg-purple-100 text-purple-700 mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Stamp className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-zinc-900 group-hover:text-purple-700">
                {t('documents.quickActions.signatures', 'Signatures & School Seals')}
              </h3>
              <p className="text-[11px] text-zinc-500 mt-1">
                {t('documents.quickActions.signaturesDesc', 'Upload authorized signatures & seals')}
              </p>
            </NavLink>
          </div>
        </div>

        {/* Public QR Verification Lookup */}
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-6 rounded-3xl text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-mehndi-400 mb-2">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xs font-bold tracking-wider uppercase">
                {t('documents.verify.lookupTitle', 'Public Verifier')}
              </span>
            </div>
            <h3 className="text-base font-bold text-white">
              {t('documents.verify.instantVerify', 'Verify Any Issued Certificate')}
            </h3>
            <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
              {t(
                'documents.verify.lookupHelp',
                'Enter the 64-character verification token from the printed QR code or bottom footer to check authenticity.'
              )}
            </p>
          </div>

          <form onSubmit={handleVerifySubmit} className="mt-5 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
              <input
                type="text"
                value={quickVerifyToken}
                onChange={(e) => setQuickVerifyToken(e.target.value)}
                placeholder={t('documents.verify.tokenPlaceholder', 'Paste verification token...')}
                className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-mehndi-400"
              />
            </div>
            <button
              type="submit"
              disabled={!quickVerifyToken.trim()}
              className="w-full py-2.5 rounded-xl bg-mehndi-500 hover:bg-mehndi-400 text-zinc-900 font-bold text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <span>{t('documents.verify.verifyBtn', 'Check Authenticity')}</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Recent Issuances Register */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-2xs overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              {t('documents.recent.title', 'Recent Document Issuances')}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {t('documents.recent.subtitle', 'Latest finalized, draft, or reprinted records across the institution')}
            </p>
          </div>
          <NavLink
            to="/documents/register"
            className="text-xs font-bold text-mehndi-700 hover:text-mehndi-800 flex items-center gap-1"
          >
            <span>{t('documents.recent.viewAll', 'View Complete Register')}</span>
            <ArrowUpRight className="w-4 h-4" />
          </NavLink>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/70 border-b border-zinc-100 text-zinc-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-3.5">{t('documents.table.documentNumber', 'Doc # / Number')}</th>
                <th className="px-6 py-3.5">{t('documents.table.type', 'Type & Category')}</th>
                <th className="px-6 py-3.5">{t('documents.table.recipient', 'Recipient')}</th>
                <th className="px-6 py-3.5">{t('documents.table.status', 'Status')}</th>
                <th className="px-6 py-3.5">{t('documents.table.reprints', 'Reprints')}</th>
                <th className="px-6 py-3.5">{t('documents.table.date', 'Issued Date')}</th>
                <th className="px-6 py-3.5 text-right">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-zinc-400">
                    {t('common.loading', 'Loading issuances...')}
                  </td>
                </tr>
              ) : !stats?.recentIssuances || stats.recentIssuances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-zinc-400">
                    {t('documents.recent.noDocuments', 'No documents issued yet. Click "Issue Certificate" to begin.')}
                  </td>
                </tr>
              ) : (
                stats.recentIssuances.map((doc) => {
                  const recipient =
                    doc.dataSnapshotJson?.student?.fullName ||
                    doc.dataSnapshotJson?.employee?.fullName ||
                    doc.dataSnapshotJson?.gate?.visitorName ||
                    '-';
                  return (
                    <tr key={doc.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-zinc-900 font-mono">
                        {doc.documentNumber || (
                          <span className="text-zinc-400 font-sans italic">
                            {t('documents.table.pendingFinalize', 'DRAFT (No Number)')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-zinc-900">{doc.template?.name || doc.documentType}</div>
                        <div className="text-[10px] text-zinc-500">{doc.category}</div>
                      </td>
                      <td className="px-6 py-3.5 font-medium text-zinc-700">{recipient}</td>
                      <td className="px-6 py-3.5">{getStatusBadge(doc.status)}</td>
                      <td className="px-6 py-3.5 text-zinc-500 font-mono">{doc.reprintCount}</td>
                      <td className="px-6 py-3.5 text-zinc-500">
                        {new Date(doc.finalizedAt || doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {doc.status === 'FINALIZED' && (
                          <button
                            onClick={() => downloadOrReprintPdf(doc.id, `${doc.documentNumber || doc.id}.pdf`)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                            title={t('documents.actions.reprintPdf', 'Reprint / Download exact PDF')}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DocumentsOverview;
