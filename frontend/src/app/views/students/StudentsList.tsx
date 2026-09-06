import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  X,
  FileSpreadsheet,
  Printer,
  UserPlus,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { StudentsNav } from './StudentsNav';
import { useStudents } from '../../../lib/api/students';
import { useClasses } from '../../../lib/api/master-data';
import { useAcademicYears } from '../../../lib/api/academic-years';
import { useTenant } from '../../../core/tenancy/TenantContext';
import { useAuth } from '../../../core/auth/AuthContext';
import apiClient from '../../../lib/api-client';

export default function StudentsList() {
  const { t } = useTranslation();
  const { currentTenant } = useTenant();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('students.manage');
  const canExport = hasPermission('student.export');

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedGender, setSelectedGender] = useState('ALL');
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const schoolId = currentTenant?.schoolId || localStorage.getItem('selected_school_id') || undefined;

  // Master Data queries
  const { data: classes } = useClasses(schoolId);
  const { data: academicYears } = useAcademicYears(schoolId || '');

  // Sections for selected class
  const selectedClass = useMemo(() => {
    return classes?.find((c) => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  // Main Students Query
  const { data, isLoading } = useStudents({
    academicYearId: selectedAcademicYearId || undefined,
    classId: selectedClassId || undefined,
    sectionId: selectedSectionId || undefined,
    status: selectedStatus === 'ALL' ? undefined : selectedStatus,
    gender: selectedGender === 'ALL' ? undefined : selectedGender,
    search: search.trim() || undefined,
    page,
    limit,
  });

  // Export CSV handler
  const [isExporting, setIsExporting] = useState(false);
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const res = await apiClient.get('/students/export', {
        params: {
          academic_year_id: selectedAcademicYearId || undefined,
          class_id: selectedClassId || undefined,
          section_id: selectedSectionId || undefined,
          status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        },
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `students_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; border: string }> = {
      ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
      INACTIVE: { bg: 'bg-zinc-100', text: 'text-zinc-700', border: 'border-zinc-200' },
      WITHDRAWN: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
      TRANSFERRED: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
      ALUMNI: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    };
    const style = map[status] || { bg: 'bg-zinc-50', text: 'text-zinc-700', border: 'border-zinc-200' };
    return (
      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${style.bg} ${style.text} ${style.border}`}>
        {t(`studentsModule.status.${status}`, status)}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      <StudentsNav />

      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-zinc-900 tracking-tight">
            {t('studentsModule.student.title', 'Students Directory')}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {t('studentsModule.student.subtitle', 'Active and historical student profiles')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canExport && (
            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-all disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isExporting ? 'Exporting...' : t('studentsModule.nav.export', 'Export CSV')}</span>
            </button>
          )}

          <Link
            to="/students/print"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-500" />
            <span>{t('studentsModule.nav.print', 'Print List')}</span>
          </Link>

          {canManage && (
            <Link
              to="/students/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-sm transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t('studentsModule.nav.addStudent', 'Add Student')}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter and Deep Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-sm space-y-3">
        {/* Search */}
        <div className="relative w-full">
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
              'Deep search student name, Student ID, Admission No, roll number, guardian phone...'
            )}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
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

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          {/* Class */}
          <div>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedSectionId('');
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800 focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
            >
              <option value="">{t('studentsModule.student.class', 'All Classes')}</option>
              {classes?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <select
              disabled={!selectedClassId}
              value={selectedSectionId}
              onChange={(e) => {
                setSelectedSectionId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800 disabled:opacity-40 focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
            >
              <option value="">{t('studentsModule.student.section', 'All Sections')}</option>
              {selectedClass?.sections?.map((sec) => (
                <option key={sec.sectionId} value={sec.sectionId}>
                  {sec.section?.name || 'Section'}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800 focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">{t('studentsModule.status.ACTIVE', 'Active')}</option>
              <option value="INACTIVE">{t('studentsModule.status.INACTIVE', 'Inactive')}</option>
              <option value="WITHDRAWN">{t('studentsModule.status.WITHDRAWN', 'Withdrawn')}</option>
              <option value="TRANSFERRED">{t('studentsModule.status.TRANSFERRED', 'Transferred')}</option>
              <option value="ALUMNI">{t('studentsModule.status.ALUMNI', 'Alumni')}</option>
            </select>
          </div>

          {/* Gender */}
          <div>
            <select
              value={selectedGender}
              onChange={(e) => {
                setSelectedGender(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800 focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
            >
              <option value="ALL">All Genders</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <select
              value={selectedAcademicYearId}
              onChange={(e) => {
                setSelectedAcademicYearId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800 focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
            >
              <option value="">All Academic Years</option>
              {academicYears?.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.is_current ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">
                  {t('studentsModule.student.name', 'Student')}
                </th>
                <th className="py-3 px-4">
                  {t('studentsModule.student.admissionNumber', 'Admission No')}
                </th>
                <th className="py-3 px-4">
                  {t('studentsModule.student.class', 'Class / Sec')}
                </th>
                <th className="py-3 px-4">
                  {t('studentsModule.student.rollNumber', 'Roll No')}
                </th>
                <th className="py-3 px-4">
                  {t('studentsModule.guardian.isPrimary', 'Primary Guardian')}
                </th>
                <th className="py-3 px-4">
                  {t('studentsModule.admission.status', 'Status')}
                </th>
                <th className="py-3 px-4 text-right">
                  {t('studentsModule.admission.actions', 'Action')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    Loading student directory...
                  </td>
                </tr>
              ) : data?.items && data.items.length > 0 ? (
                data.items.map((stu) => (
                  <tr key={stu.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center font-bold text-zinc-700 text-xs shrink-0 overflow-hidden">
                          {stu.photoStorageKey ? (
                            <img
                              src={`/api/v1/storage/${stu.photoStorageKey}`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            `${stu.firstName[0]}${stu.lastName[0]}`
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-900">
                            {stu.firstName} {stu.lastName}
                          </div>
                          <div className="text-[11px] font-mono text-zinc-500">
                            {stu.studentId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-700">
                      <div>{stu.admissionNumber}</div>
                      <div className="text-[10px] text-zinc-400">
                        {new Date(stu.admissionDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-zinc-800">
                      {stu.currentClass?.name || '—'}
                      {stu.currentSection?.name ? ` • ${stu.currentSection.name}` : ''}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-800">
                      {stu.currentRollNumber || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {stu.primaryGuardian ? (
                        <div>
                          <div className="font-medium text-zinc-900">
                            {stu.primaryGuardian.name}
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono">
                            {stu.primaryGuardian.phone}
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-400">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(stu.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`/students/${stu.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-zinc-200 hover:border-zinc-300 hover:bg-white text-zinc-700 font-medium text-xs transition-all"
                      >
                        <span>{t('studentsModule.admission.viewStudent', 'Profile')}</span>
                        <ArrowRight className="w-3 h-3 text-zinc-400" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    {t('studentsModule.overview.noRecent', 'No students found matching criteria.')}
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
              {Math.min(page * limit, data.pagination.total)} of {data.pagination.total} students
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
    </div>
  );
}
