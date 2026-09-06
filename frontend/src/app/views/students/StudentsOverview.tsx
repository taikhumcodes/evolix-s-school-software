import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  UserCheck,
  FileClock,
  CheckCircle2,
  UserMinus,
  PlusCircle,
  UserPlus,
  Upload,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { StudentsNav } from './StudentsNav';
import { useStudentsOverview, useStudents } from '../../../lib/api/students';
import { useAdmissions } from '../../../lib/api/admissions';
import { useTenant } from '../../../core/tenancy/TenantContext';

export default function StudentsOverview() {
  const { t } = useTranslation();
  const { currentTenant } = useTenant();
  const { data: overview, isLoading: isOverviewLoading } = useStudentsOverview();
  const { data: recentAdmissions, isLoading: isAdmissionsLoading } = useAdmissions({ limit: 5 });
  const { data: recentStudents, isLoading: isStudentsLoading } = useStudents({ limit: 5 });

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; border: string }> = {
      SUBMITTED: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
      UNDER_REVIEW: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
      REJECTED: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
      CONVERTED: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
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
    <div className="space-y-6 pb-12">
      <StudentsNav />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Active Students */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {t('studentsModule.overview.activeStudents', 'Active Students')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-zinc-900 tracking-tight">
              {isOverviewLoading ? '—' : overview?.totalActiveStudents ?? 0}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            {overview?.academicYearName || currentTenant?.schoolName}
          </p>
        </div>

        {/* Admissions This Year */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {t('studentsModule.overview.admissionsThisYear', 'New Admissions')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-mehndi-50 text-mehndi-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-zinc-900 tracking-tight">
              {isOverviewLoading ? '—' : overview?.admissionsThisYear ?? 0}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Current Academic Cycle</p>
        </div>

        {/* Pending Admissions */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {t('studentsModule.overview.pendingAdmissions', 'Pending Review')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileClock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-amber-600 tracking-tight">
              {isOverviewLoading ? '—' : overview?.pendingAdmissions ?? 0}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Awaiting decision</p>
        </div>

        {/* Approved Admissions */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {t('studentsModule.overview.approvedAdmissions', 'Approved (Ready)')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-blue-600 tracking-tight">
              {isOverviewLoading ? '—' : overview?.approvedAdmissions ?? 0}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Ready for conversion</p>
        </div>

        {/* Withdrawn */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {t('studentsModule.overview.withdrawnStudents', 'Withdrawn')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <UserMinus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-zinc-900 tracking-tight">
              {isOverviewLoading ? '—' : overview?.withdrawnStudents ?? 0}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Archived / TC issued</p>
        </div>
      </div>

      {/* Quick Action Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/students/admissions/new"
          className="group p-5 bg-gradient-to-br from-white to-mehndi-50/30 rounded-2xl border border-zinc-200/80 hover:border-mehndi-300 hover:shadow-md transition-all flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-mehndi-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm shadow-mehndi-600/20">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 group-hover:text-mehndi-700 transition-colors">
                {t('studentsModule.nav.newAdmission', 'New Admission Application')}
              </h3>
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-mehndi-600 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Submit formal application with duplicate detection & guardian auto-suggest.
            </p>
          </div>
        </Link>

        <Link
          to="/students/new"
          className="group p-5 bg-gradient-to-br from-white to-zinc-50/50 rounded-2xl border border-zinc-200/80 hover:border-zinc-400 hover:shadow-md transition-all flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
            <UserPlus className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 group-hover:text-zinc-950 transition-colors">
                {t('studentsModule.nav.addStudent', 'Direct Add Student')}
              </h3>
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Immediate registration bypassing application workflow.
            </p>
          </div>
        </Link>

        <Link
          to="/students/import"
          className="group p-5 bg-gradient-to-br from-white to-blue-50/30 rounded-2xl border border-zinc-200/80 hover:border-blue-300 hover:shadow-md transition-all flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm shadow-blue-600/20">
            <Upload className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 group-hover:text-blue-700 transition-colors">
                {t('studentsModule.nav.import', 'Bulk CSV Import')}
              </h3>
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Download template, preview validation errors, and bulk enroll students.
            </p>
          </div>
        </Link>
      </div>

      {/* Two-Column Operational Activity Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileClock className="w-4 h-4 text-zinc-600" />
              <h2 className="text-sm font-bold text-zinc-900">
                {t('studentsModule.overview.recentApplications', 'Recent Applications')}
              </h2>
            </div>
            <Link
              to="/students/admissions"
              className="text-xs font-semibold text-mehndi-700 hover:text-mehndi-800 flex items-center gap-1"
            >
              <span>{t('studentsModule.nav.admissions', 'View All')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-zinc-100 flex-1">
            {isAdmissionsLoading ? (
              <div className="p-8 text-center text-xs text-zinc-400">Loading applications...</div>
            ) : recentAdmissions?.items && recentAdmissions.items.length > 0 ? (
              recentAdmissions.items.slice(0, 5).map((app) => (
                <div key={app.id} className="p-4 hover:bg-zinc-50/80 transition-colors flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-800">
                        {app.applicationNumber}
                      </span>
                      {getStatusBadge(app.status)}
                    </div>
                    <div className="text-xs font-semibold text-zinc-900 mt-1 truncate">
                      {app.firstName} {app.lastName}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-2">
                      <span>{app.appliedClass?.name || 'Class N/A'}</span>
                      <span>•</span>
                      <span>{app.guardianName} ({app.guardianPhone})</span>
                    </div>
                  </div>
                  <Link
                    to={`/students/admissions/${app.id}`}
                    className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-200 hover:border-zinc-300 hover:bg-white text-zinc-700 flex items-center gap-1 transition-all"
                  >
                    <span>{t('studentsModule.admission.review', 'Review')}</span>
                    <ExternalLink className="w-3 h-3 text-zinc-400" />
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-zinc-400">
                {t('studentsModule.overview.noRecent', 'No recent records found.')}
              </div>
            )}
          </div>
        </div>

        {/* Recent Registered Students */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-600" />
              <h2 className="text-sm font-bold text-zinc-900">
                {t('studentsModule.overview.recentStudents', 'Recently Registered Students')}
              </h2>
            </div>
            <Link
              to="/students/list"
              className="text-xs font-semibold text-mehndi-700 hover:text-mehndi-800 flex items-center gap-1"
            >
              <span>{t('studentsModule.nav.students', 'View All')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-zinc-100 flex-1">
            {isStudentsLoading ? (
              <div className="p-8 text-center text-xs text-zinc-400">Loading students...</div>
            ) : recentStudents?.items && recentStudents.items.length > 0 ? (
              recentStudents.items.slice(0, 5).map((stu) => (
                <div key={stu.id} className="p-4 hover:bg-zinc-50/80 transition-colors flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center font-bold text-zinc-700 text-xs shrink-0 overflow-hidden">
                      {stu.photoStorageKey ? (
                        <img src={`/api/v1/storage/${stu.photoStorageKey}`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        `${stu.firstName[0]}${stu.lastName[0]}`
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-zinc-800">
                          {stu.studentId}
                        </span>
                        {getStatusBadge(stu.status)}
                      </div>
                      <div className="text-xs font-semibold text-zinc-900 mt-0.5 truncate">
                        {stu.firstName} {stu.lastName}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {stu.currentClass?.name || 'Class N/A'}
                        {stu.currentSection?.name ? ` - ${stu.currentSection.name}` : ''}
                        {stu.currentRollNumber ? ` • Roll ${stu.currentRollNumber}` : ''}
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/students/${stu.id}`}
                    className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-200 hover:border-zinc-300 hover:bg-white text-zinc-700 flex items-center gap-1 transition-all"
                  >
                    <span>{t('studentsModule.admission.viewStudent', 'Profile')}</span>
                    <ExternalLink className="w-3 h-3 text-zinc-400" />
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-zinc-400">
                {t('studentsModule.overview.noRecent', 'No recent records found.')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
