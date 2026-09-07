import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  FileSpreadsheet,
  PieChart,
} from 'lucide-react';
import { useDocumentReports } from '../../../lib/api/documents';
import apiClient from '../../../lib/api-client';

export const DocumentReportsView: React.FC = () => {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useDocumentReports();

  const handleExportCsv = async () => {
    try {
      const res = await apiClient.get('/documents/reports/export-csv', {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `document_issuances_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">
            {t('documents.reports.title', 'Document Issuance Reports & Analytics')}
          </h1>
          <p className="text-xs text-zinc-500 mt-1 max-w-xl">
            {t(
              'documents.reports.subtitle',
              'Audit issuance volumes, category breakdowns, reprint ratios, and export compliance registers.'
            )}
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition-all shadow-sm shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{t('documents.reports.exportCsv', 'Export Register (CSV)')}</span>
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs">
          <span className="text-xs font-semibold text-zinc-500">Total Generated</span>
          <div className="mt-2 text-2xl font-black text-zinc-900">
            {isLoading ? '...' : stats?.totalDocuments || 0}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs">
          <span className="text-xs font-semibold text-zinc-500">Finalized / Official</span>
          <div className="mt-2 text-2xl font-black text-emerald-600">
            {isLoading ? '...' : stats?.finalizedDocuments || 0}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs">
          <span className="text-xs font-semibold text-zinc-500">Reprint Transactions</span>
          <div className="mt-2 text-2xl font-black text-indigo-600">
            {isLoading ? '...' : stats?.reprintCountTotal || 0}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs">
          <span className="text-xs font-semibold text-zinc-500">Revocation Rate</span>
          <div className="mt-2 text-2xl font-black text-rose-600">
            {isLoading
              ? '...'
              : `${(
                  ((stats?.cancelledDocuments || 0) / (stats?.totalDocuments || 1)) *
                  100
                ).toFixed(1)}%`}
          </div>
        </div>
      </div>

      {/* Breakdown Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-zinc-800">
            <PieChart className="w-5 h-5 text-mehndi-600" />
            <h2 className="text-sm font-bold">Issuances by Category</h2>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <p className="text-xs text-zinc-400">Loading metrics...</p>
            ) : !stats?.byCategory || Object.keys(stats.byCategory).length === 0 ? (
              <p className="text-xs text-zinc-400">No issuances recorded.</p>
            ) : (
              Object.entries(stats.byCategory).map(([cat, count]) => {
                const pct = Math.round((count / (stats.totalDocuments || 1)) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-700">{cat}</span>
                      <span className="font-mono text-zinc-500">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-mehndi-600 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Document Type Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-zinc-800">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold">Top Document Types</h2>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <p className="text-xs text-zinc-400">Loading metrics...</p>
            ) : !stats?.byType || Object.keys(stats.byType).length === 0 ? (
              <p className="text-xs text-zinc-400">No issuances recorded.</p>
            ) : (
              Object.entries(stats.byType).map(([type, count]) => {
                const pct = Math.round((count / (stats.totalDocuments || 1)) * 100);
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-700">{type}</span>
                      <span className="font-mono text-zinc-500">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentReportsView;
