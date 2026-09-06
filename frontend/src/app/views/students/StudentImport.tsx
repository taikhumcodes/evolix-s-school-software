import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Check,
  X,
} from 'lucide-react';
import { StudentsNav } from './StudentsNav';
import { usePreviewImport, useCommitImport } from '../../../lib/api/students';
import { useAcademicYears } from '../../../lib/api/academic-years';
import { useTenant } from '../../../core/tenancy/TenantContext';
import apiClient from '../../../lib/api-client';

export default function StudentImport() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentTenant } = useTenant();

  const { data: academicYears } = useAcademicYears(currentTenant?.schoolId || '');
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');

  useEffect(() => {
    if (academicYears && !selectedAcademicYearId) {
      const current = academicYears.find((ay) => ay.is_current) || academicYears[0];
      if (current) {
        setSelectedAcademicYearId(current.id);
      }
    }
  }, [academicYears, selectedAcademicYearId]);

  // CSV content / File State
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [csvText, setCsvText] = useState<string>('');
  const [previewData, setPreviewData] = useState<{
    summary: { total: number; valid: number; errors: number };
    preview: Array<{
      rowIndex: number;
      isValid: boolean;
      errors: string[];
      data: any;
    }>;
  } | null>(null);

  const [importError, setImportError] = useState('');
  const [importSuccessMessage, setImportSuccessMessage] = useState('');

  // Mutations
  const previewMutation = usePreviewImport();
  const commitMutation = useCommitImport();

  // Handle Download CSV Template
  const handleDownloadTemplate = async () => {
    try {
      const res = await apiClient.get('/students/import/template', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student_import_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download template:', err);
    }
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setSelectedFileName(selectedFile.name);
      setPreviewData(null);
      setImportError('');
      setImportSuccessMessage('');
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvText(text);
      };
      reader.readAsText(selectedFile);
    }
  };

  // Preview Validation
  const handleValidatePreview = async () => {
    if (!csvText.trim()) {
      setImportError('Please select or paste CSV data to preview.');
      return;
    }

    setImportError('');
    try {
      const res = await previewMutation.mutateAsync(csvText);
      setPreviewData(res);
    } catch (err: any) {
      setImportError(err?.response?.data?.message || err.message || 'Validation failed');
    }
  };

  // Commit Import
  const handleCommit = async () => {
    if (!previewData || !selectedAcademicYearId) {
      setImportError('Please select an Academic Year and validate CSV data first.');
      return;
    }

    const validRows = previewData.preview
      .filter((r) => r.isValid)
      .map((r) => r.data);

    if (validRows.length === 0) {
      setImportError('No valid rows available to import.');
      return;
    }

    setImportError('');
    try {
      const res = await commitMutation.mutateAsync({
        academicYearId: selectedAcademicYearId,
        rows: validRows,
      });

      setImportSuccessMessage(
        `${t('studentsModule.import.success', 'Students successfully imported')}: ${res.importedCount} records created.`
      );
      setPreviewData(null);
      setSelectedFileName('');
      setCsvText('');

      setTimeout(() => {
        navigate('/students/list');
      }, 2500);
    } catch (err: any) {
      setImportError(err?.response?.data?.message || err.message || 'Import commit failed');
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      <StudentsNav />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/students/list"
            className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-zinc-900 tracking-tight">
              {t('studentsModule.import.title', 'Bulk Student Import')}
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {t(
                'studentsModule.import.desc',
                'Upload student records using a standard CSV spreadsheet format.'
              )}
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors"
        >
          <Download className="w-4 h-4 text-zinc-500" />
          <span>{t('studentsModule.import.downloadTemplate', 'Download CSV Template')}</span>
        </button>
      </div>

      {importError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <span>{importError}</span>
        </div>
      )}

      {importSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Import Completed!</div>
            <div className="mt-0.5">{importSuccessMessage}</div>
          </div>
        </div>
      )}

      {/* Import Configuration Card */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              Target Academic Year *
            </label>
            <select
              value={selectedAcademicYearId}
              onChange={(e) => setSelectedAcademicYearId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800 focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
            >
              <option value="">Select Academic Year</option>
              {academicYears?.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.is_current ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              {t('studentsModule.import.uploadFile', 'Select CSV File')} *
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
              />
              {selectedFileName && (
                <div className="mt-1 text-[11px] text-emerald-700 font-semibold">
                  Selected: {selectedFileName}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Or Paste CSV */}
        <div>
          <label className="block text-xs font-bold text-zinc-700 mb-1">
            Or Paste CSV Content Directly
          </label>
          <textarea
            rows={4}
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              setPreviewData(null);
            }}
            placeholder="first_name,last_name,gender,date_of_birth,class_name,guardian_name,guardian_phone..."
            className="w-full p-3 rounded-xl border border-zinc-200 font-mono text-[11px] text-zinc-800 focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={previewMutation.isPending || !csvText.trim()}
            onClick={handleValidatePreview}
            className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{previewMutation.isPending ? 'Validating...' : 'Validate & Preview CSV'}</span>
          </button>
        </div>
      </div>

      {/* Preview Table & Summary */}
      {previewData && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden space-y-4">
          <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                {t('studentsModule.import.preview', 'Import Preview')}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Review parsed student records and validation statuses before importing.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700">
                {t('studentsModule.import.totalRows', 'Total')}: {previewData.summary.total}
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                {t('studentsModule.import.validRows', 'Valid')}: {previewData.summary.valid}
              </span>
              {previewData.summary.errors > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                  {t('studentsModule.import.errorCount', 'Errors')}: {previewData.summary.errors}
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-bold sticky top-0">
                <tr>
                  <th className="py-2.5 px-4 w-12">#</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Student Name</th>
                  <th className="py-2.5 px-4">DOB / Gender</th>
                  <th className="py-2.5 px-4">Class</th>
                  <th className="py-2.5 px-4">Guardian</th>
                  <th className="py-2.5 px-4">Notes / Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-sans">
                {previewData.preview.map((row) => (
                  <tr
                    key={row.rowIndex}
                    className={`hover:bg-zinc-50/80 ${
                      !row.isValid ? 'bg-rose-50/40' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono text-zinc-400">
                      {row.rowIndex}
                    </td>
                    <td className="py-2.5 px-4">
                      {row.isValid ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                          <Check className="w-3.5 h-3.5" /> Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-[11px]">
                          <X className="w-3.5 h-3.5" /> Error
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-zinc-900">
                      {row.data.firstName} {row.data.lastName}
                    </td>
                    <td className="py-2.5 px-4 text-zinc-600">
                      {row.data.dateOfBirth} • {row.data.gender}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-zinc-800">
                      {row.data.className} {row.data.sectionName ? `(${row.data.sectionName})` : ''}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="text-zinc-900 font-medium">{row.data.guardianName}</div>
                      <div className="text-[11px] font-mono text-zinc-500">
                        {row.data.guardianPhone}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-rose-700 text-[11px]">
                      {row.errors.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-zinc-100 flex items-center justify-between">
            <div className="text-xs text-zinc-500">
              {previewData.summary.valid > 0
                ? `${previewData.summary.valid} valid records ready to commit.`
                : t('studentsModule.import.fixErrors', 'Please correct the highlighted errors.')}
            </div>

            <button
              type="button"
              disabled={commitMutation.isPending || previewData.summary.valid === 0}
              onClick={handleCommit}
              className="px-6 py-2.5 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold shadow-sm shadow-mehndi-600/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {commitMutation.isPending
                  ? 'Importing...'
                  : t('studentsModule.import.commit', 'Commit & Import Valid Records')}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
