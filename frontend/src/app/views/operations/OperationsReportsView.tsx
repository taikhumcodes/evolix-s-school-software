import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileSpreadsheet,
  Download,
  Bus,
  Package,
  Armchair,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import { useOperationsReports } from '../../../lib/api/operations';

export const OperationsReportsView: React.FC = () => {
  const { t } = useTranslation();
  const [activeReport, setActiveReport] = useState<'transport' | 'inventory' | 'assets' | 'visitors' | 'events'>('transport');

  const { data: rows = [], isLoading } = useOperationsReports(activeReport);

  const handleDownloadCsv = () => {
    const apiBase = '/api/v1';
    window.open(`${apiBase}/operations/reports/${activeReport}?format=csv`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-mehndi-700" />
            {t('operations.reports.title', 'Authoritative Operations Reports')}
          </h1>
          <p className="text-xs text-zinc-500">
            {t(
              'operations.reports.subtitle',
              'Server-authoritative summaries, audit logs, and compliance CSV exports for all operational domains.'
            )}
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="px-4 py-2 rounded-xl bg-mehndi-600 text-white text-xs font-semibold hover:bg-mehndi-700 flex items-center gap-2 shadow-sm transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export {activeReport.toUpperCase()} CSV</span>
        </button>
      </div>

      {/* Subtabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveReport('transport')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeReport === 'transport'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200'
          }`}
        >
          <Bus className="w-3.5 h-3.5" />
          <span>Transport Routes & Capacity</span>
        </button>

        <button
          onClick={() => setActiveReport('inventory')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeReport === 'inventory'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Inventory Stock Balances</span>
        </button>

        <button
          onClick={() => setActiveReport('assets')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeReport === 'assets'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200'
          }`}
        >
          <Armchair className="w-3.5 h-3.5" />
          <span>Asset Custody Register</span>
        </button>

        <button
          onClick={() => setActiveReport('visitors')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeReport === 'visitors'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Visitor Campus Passes</span>
        </button>

        <button
          onClick={() => setActiveReport('events')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeReport === 'events'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>School Events Participation</span>
        </button>
      </div>

      {/* Report Data Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-zinc-500">Generating server-authoritative report...</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 space-y-2">
            <FileSpreadsheet className="w-8 h-8 mx-auto text-zinc-300" />
            <p className="text-sm font-medium">No report records found for this domain</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 uppercase text-[10px] font-bold">
                <tr>
                  {Object.keys(rows[0]).map((col) => (
                    <th key={col} className="py-3 px-4 whitespace-nowrap">
                      {col.replace(/([A-Z])/g, ' $1').trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-zinc-50/60 transition-colors">
                    {Object.keys(row).map((col) => (
                      <td key={col} className="py-2.5 px-4 text-zinc-700 whitespace-nowrap">
                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OperationsReportsView;
