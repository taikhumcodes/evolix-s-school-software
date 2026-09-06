import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { ParentsNav } from './ParentsNav';
import apiClient from '../../../lib/api-client';

export default function GuardianImport() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isCommitLoading, setIsCommitLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
    preview: any[];
  } | null>(null);
  const [importSummary, setImportSummary] = useState<{ createdCount: number } | null>(null);

  const handleDownloadTemplate = () => {
    const csv = [
      'First Name,Last Name,Relationship,Phone,Email,Address,City,Occupation',
      'Rajesh,Sharma,FATHER,9876543210,rajesh.sharma@example.com,B-102 Sunshine Heights,Mumbai,Engineer',
      'Pooja,Patel,MOTHER,9811223344,pooja.patel@example.com,Flat 404 Green Acres,Pune,Doctor',
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guardians_import_template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleFileChange = async (file: File) => {
    setIsPreviewLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post('/api/v1/guardians/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreviewData(res.data);
    } catch (err) {
      console.error('Preview failed:', err);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData || previewData.validRows === 0) return;
    setIsCommitLoading(true);

    try {
      const validRecords = previewData.preview.filter((r) => r.errors.length === 0);
      const res = await apiClient.post('/api/v1/guardians/import/commit', {
        records: validRecords,
      });
      setImportSummary(res.data);
    } catch (err) {
      console.error('Import commit failed:', err);
    } finally {
      setIsCommitLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      <ParentsNav />

      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              {t('parentsModule.import.title', 'Bulk Import Guardians via CSV')}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {t('parentsModule.import.desc', 'Upload a spreadsheet of parent/guardian records with automatic phone deduplication preview.')}
            </p>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" />
            <span>{t('parentsModule.import.downloadTemplate', 'Download CSV Template')}</span>
          </button>
        </div>

        {/* Dropzone */}
        {!previewData && !importSummary && (
          <div className="border-2 border-dashed border-zinc-200 hover:border-mehndi-500 rounded-2xl p-8 text-center transition-colors">
            <Upload className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-xs font-semibold text-zinc-700">
              Drag and drop your CSV file here, or browse
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">Accepts standard .csv files</p>
            <label className="mt-4 inline-block px-4 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold cursor-pointer transition-all">
              <span>{isPreviewLoading ? 'Analyzing Rows...' : 'Choose CSV File'}</span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                disabled={isPreviewLoading}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
                }}
              />
            </label>
          </div>
        )}

        {/* Import Summary Result */}
        {importSummary && (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="text-base font-bold text-emerald-950">Bulk Import Completed</h3>
            <p className="text-xs text-emerald-800">
              Successfully imported <strong>{importSummary.createdCount}</strong> new guardian records into the school database.
            </p>
            <div className="pt-3">
              <button
                onClick={() => navigate('/guardians')}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm"
              >
                Go to Guardians Directory
              </button>
            </div>
          </div>
        )}

        {/* Preview Screen */}
        {previewData && !importSummary && (
          <div className="space-y-4">
            {/* Metric Banner */}
            <div className="grid grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Total Rows</span>
                <span className="text-lg font-black text-zinc-900">{previewData.totalRows}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-emerald-700 block text-[10px] uppercase font-bold">Valid</span>
                <span className="text-lg font-black text-emerald-800">{previewData.validRows}</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-rose-700 block text-[10px] uppercase font-bold">Errors</span>
                <span className="text-lg font-black text-rose-800">{previewData.errorRows}</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-amber-700 block text-[10px] uppercase font-bold">Duplicate Warnings</span>
                <span className="text-lg font-black text-amber-800">{previewData.warningRows}</span>
              </div>
            </div>

            {/* Preview Table */}
            <div className="border border-zinc-200 rounded-xl overflow-x-auto text-xs max-h-96">
              <table className="w-full text-left divide-y divide-zinc-200">
                <thead className="bg-zinc-50 text-zinc-500 font-bold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Row</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Relationship</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Validation & Warnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {previewData.preview.map((row) => (
                    <tr key={row.rowNumber} className="hover:bg-zinc-50">
                      <td className="py-2 px-3 font-mono text-zinc-400">#{row.rowNumber}</td>
                      <td className="py-2 px-3 font-bold text-zinc-800">
                        {row.firstName} {row.lastName}
                      </td>
                      <td className="py-2 px-3 text-zinc-600">{row.relationship}</td>
                      <td className="py-2 px-3 font-mono text-zinc-700">{row.phone}</td>
                      <td className="py-2 px-3 text-zinc-500">{row.email || '—'}</td>
                      <td className="py-2 px-3">
                        {row.errors.length > 0 ? (
                          <span className="text-rose-600 font-semibold">{row.errors.join(', ')}</span>
                        ) : row.warnings.length > 0 ? (
                          <span className="text-amber-700 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>{row.warnings.join('; ')}</span>
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            <span>Ready</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Commit Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setPreviewData(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Choose Another File
              </button>

              <button
                type="button"
                disabled={previewData.validRows === 0 || isCommitLoading}
                onClick={handleCommit}
                className="px-5 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2"
              >
                {isCommitLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                <span>
                  {isCommitLoading
                    ? 'Importing...'
                    : `Confirm & Import ${previewData.validRows} Records`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
