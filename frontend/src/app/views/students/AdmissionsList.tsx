import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  X,
  ArrowRight,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { StudentsNav } from './StudentsNav';
import { useAdmissions, useConvertAdmission, AdmissionApplication } from '../../../lib/api/admissions';
import { useClasses } from '../../../lib/api/master-data';
import { useAcademicYears } from '../../../lib/api/academic-years';
import { useNextRollNumber } from '../../../lib/api/students';
import { useTenant } from '../../../core/tenancy/TenantContext';
import { useAuth } from '../../../core/auth/AuthContext';

const STATUS_TABS = [
  'ALL',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'CONVERTED',
  'REJECTED',
] as const;

export default function AdmissionsList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('admissions.manage');

  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const limit = 15;

  const schoolId = currentTenant?.schoolId || localStorage.getItem('selected_school_id') || undefined;

  // Master Data queries
  const { data: classes } = useClasses(schoolId);
  const { data: academicYears } = useAcademicYears(schoolId || '');

  // Admissions Query
  const { data, isLoading, refetch } = useAdmissions({
    status: activeTab === 'ALL' ? undefined : activeTab,
    appliedClassId: selectedClassId || undefined,
    academicYearId: selectedAcademicYearId || undefined,
    search: search.trim() || undefined,
    page,
    limit,
  });

  // Conversion Modal State
  const [convertingApp, setConvertingApp] = useState<AdmissionApplication | null>(null);
  const [convertSectionId, setConvertSectionId] = useState<string>('');
  const [convertRollNumber, setConvertRollNumber] = useState<string>('');
  const [convertAdmissionDate, setConvertAdmissionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [conversionError, setConversionError] = useState<string>('');

  const convertMutation = useConvertAdmission();

  // Selected class for conversion
  const conversionClass = useMemo(() => {
    if (!convertingApp || !classes) return null;
    return classes.find((c) => c.id === convertingApp.appliedClassId);
  }, [convertingApp, classes]);

  // Next roll number auto-suggest
  const { data: suggestedRoll } = useNextRollNumber({
    academicYearId: convertingApp?.academicYearId,
    classId: convertingApp?.appliedClassId,
    sectionId: convertSectionId || undefined,
  });

  // Auto-fill suggested roll number
  useEffect(() => {
    if (suggestedRoll?.rollNumber && !convertRollNumber) {
      setConvertRollNumber(suggestedRoll.rollNumber);
    }
  }, [suggestedRoll, convertRollNumber]);

  const handleOpenConvert = (app: AdmissionApplication) => {
    setConvertingApp(app);
    setConvertSectionId('');
    setConvertRollNumber('');
    setConversionError('');
    setConvertAdmissionDate(new Date().toISOString().split('T')[0]);
  };

  const handleExecuteConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingApp) return;

    setConversionError('');
    try {
      const res = await convertMutation.mutateAsync({
        id: convertingApp.id,
        conversionData: {
          classId: convertingApp.appliedClassId,
          sectionId: convertSectionId || null,
          rollNumber: convertRollNumber || null,
          admissionDate: convertAdmissionDate,
        },
      });
      setConvertingApp(null);
      refetch();
      if (res.studentId) {
        navigate(`/students/${res.id}`);
      }
    } catch (err: any) {
      setConversionError(err?.response?.data?.message || err.message || 'Conversion failed');
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; border: string }> = {
      SUBMITTED: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
      UNDER_REVIEW: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
      REJECTED: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
      CONVERTED: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    };
    const style = map[status] || { bg: 'bg-zinc-50', text: 'text-zinc-700', border: 'border-zinc-200' };
    return (
      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${style.bg} ${style.text} ${style.border}`}>
        {t(`studentsModule.status.${status}`, status)}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <StudentsNav />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
            {t('studentsModule.admission.title', 'Admission Applications')}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {t('studentsModule.admission.subtitle', 'Manage and process school entry applications')}
          </p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-zinc-200 pb-2">
        {STATUS_TABS.map((status) => {
          const isActive = activeTab === status;
          return (
            <button
              key={status}
              onClick={() => {
                setActiveTab(status);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
              }`}
            >
              {status === 'ALL'
                ? t('common.filters.all', 'All Applications')
                : t(`studentsModule.status.${status}`, status)}
            </button>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t(
              'common.actions.search',
              'Search applicant name, application number, phone, email...'
            )}
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500 transition-all"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Class Filter */}
        <div className="w-full md:w-48">
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
          >
            <option value="">{t('studentsModule.student.class', 'All Classes')}</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Academic Year Filter */}
        <div className="w-full md:w-48">
          <select
            value={selectedAcademicYearId}
            onChange={(e) => {
              setSelectedAcademicYearId(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
          >
            <option value="">{t('studentsModule.student.academicYear', 'All Academic Years')}</option>
            {academicYears?.map((ay) => (
              <option key={ay.id} value={ay.id}>
                {ay.name} {ay.is_current ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">
                  {t('studentsModule.admission.applicationNumber', 'App Number')}
                </th>
                <th className="py-3 px-4">
                  {t('studentsModule.admission.applicant', 'Applicant')}
                </th>
                <th className="py-3 px-4">
                  {t('studentsModule.admission.appliedClass', 'Class')}
                </th>
                <th className="py-3 px-4">
                  {t('studentsModule.admission.guardian', 'Guardian')}
                </th>
                <th className="py-3 px-4">
                  {t('studentsModule.admission.applicationDate', 'Applied On')}
                </th>
                <th className="py-3 px-4">
                  {t('studentsModule.admission.status', 'Status')}
                </th>
                <th className="py-3 px-4 text-right">
                  {t('studentsModule.admission.actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    Loading applications...
                  </td>
                </tr>
              ) : data?.items && data.items.length > 0 ? (
                data.items.map((app) => (
                  <tr key={app.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 whitespace-nowrap">
                      {app.applicationNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-900">
                        {app.firstName} {app.lastName}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {app.gender} • {new Date(app.dateOfBirth).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-zinc-800">
                      {app.appliedClass?.name || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-zinc-900">{app.guardianName}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">
                        {app.guardianPhone}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-600 whitespace-nowrap">
                      {new Date(app.applicationDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(app.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {app.status === 'APPROVED' && canManage && (
                          <button
                            onClick={() => handleOpenConvert(app)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-mehndi-600 hover:bg-mehndi-700 text-white font-semibold text-[11px] shadow-sm transition-colors"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{t('studentsModule.admission.convert', 'Convert')}</span>
                          </button>
                        )}
                        {app.status === 'CONVERTED' && app.convertedStudent && (
                          <Link
                            to={`/students/${app.convertedStudent.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-[11px] transition-colors"
                          >
                            <span>{t('studentsModule.admission.viewStudent', 'View Student')}</span>
                            <ExternalLink className="w-3 h-3 text-zinc-500" />
                          </Link>
                        )}
                        <Link
                          to={`/students/admissions/${app.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-200 hover:border-zinc-300 hover:bg-white text-zinc-700 font-medium text-[11px] transition-all"
                        >
                          <span>{t('studentsModule.admission.review', 'Review')}</span>
                          <ArrowRight className="w-3 h-3 text-zinc-400" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    {t('studentsModule.overview.noRecent', 'No applications found matching criteria.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="p-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <div>
              Showing {((page - 1) * limit) + 1} to{' '}
              {Math.min(page * limit, data.pagination.total)} of {data.pagination.total} records
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-md border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-semibold text-zinc-800">
                {page} / {data.pagination.totalPages}
              </span>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                className="p-1.5 rounded-md border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Convert to Student Modal */}
      {convertingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-zinc-200 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {t('studentsModule.admission.convertConfirm', 'Create Student & Complete Admission')}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  App: {convertingApp.applicationNumber} • {convertingApp.firstName} {convertingApp.lastName}
                </p>
              </div>
              <button
                onClick={() => setConvertingApp(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteConversion} className="p-6 space-y-4">
              <div className="bg-mehndi-50/50 border border-mehndi-200/80 rounded-xl p-3.5 text-xs text-mehndi-900 leading-relaxed">
                {t(
                  'studentsModule.admission.convertDescription',
                  'This will atomically generate the Student ID and Admission Number, create enrollment, and link guardians.'
                )}
              </div>

              {conversionError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{conversionError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {t('studentsModule.student.class', 'Assigned Class')}
                  </label>
                  <input
                    type="text"
                    disabled
                    value={convertingApp.appliedClass?.name || 'Class'}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {t('studentsModule.student.section', 'Section (Optional)')}
                  </label>
                  <select
                    value={convertSectionId}
                    onChange={(e) => setConvertSectionId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
                  >
                    <option value="">No Section</option>
                    {conversionClass?.sections?.map((sec) => (
                      <option key={sec.sectionId} value={sec.sectionId}>
                        {sec.section?.name || 'Section'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {t('studentsModule.student.rollNumber', 'Roll Number')}
                  </label>
                  <input
                    type="text"
                    value={convertRollNumber}
                    onChange={(e) => setConvertRollNumber(e.target.value)}
                    placeholder="Auto-suggested"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {t('studentsModule.lifecycle.date', 'Admission Date')}
                  </label>
                  <input
                    type="date"
                    required
                    value={convertAdmissionDate}
                    onChange={(e) => setConvertAdmissionDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setConvertingApp(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors"
                >
                  {t('studentsModule.actions.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={convertMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold shadow-sm shadow-mehndi-600/20 transition-all disabled:opacity-50"
                >
                  {convertMutation.isPending ? 'Converting...' : t('studentsModule.actions.confirm', 'Complete Conversion')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
