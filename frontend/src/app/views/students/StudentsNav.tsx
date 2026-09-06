import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, FileText, Users, PlusCircle, UserPlus, Upload } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';

export const StudentsNav: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();

  const canManageAdmissions = hasPermission('admissions.manage');
  const canManageStudents = hasPermission('students.manage');
  const canImport = hasPermission('student.import');

  return (
    <div className="bg-white border-b border-zinc-200 pb-0 -mx-6 -mt-6 md:-mx-8 md:-mt-8 px-6 md:px-8 pt-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              {t('navigation.students', 'Students & Admissions')}
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Module 03
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {t('studentsModule.overview.subtitle', 'Factual operational summary for academic year')}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {canManageAdmissions && (
            <NavLink
              to="/students/admissions/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-semibold shadow-sm shadow-mehndi-600/20 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{t('studentsModule.nav.newAdmission', 'New Admission')}</span>
            </NavLink>
          )}
          {canManageStudents && (
            <NavLink
              to="/students/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t('studentsModule.nav.addStudent', 'Add Student')}</span>
            </NavLink>
          )}
          {canImport && (
            <NavLink
              to="/students/import"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-zinc-500" />
              <span>{t('studentsModule.nav.import', 'Import CSV')}</span>
            </NavLink>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto border-t border-zinc-100 pt-1 -mb-px">
        <NavLink
          to="/students"
          end
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? 'border-mehndi-600 text-mehndi-700 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300'
            }`
          }
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>{t('studentsModule.nav.overview', 'Overview')}</span>
        </NavLink>

        <NavLink
          to="/students/admissions"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? 'border-mehndi-600 text-mehndi-700 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300'
            }`
          }
        >
          <FileText className="w-4 h-4" />
          <span>{t('studentsModule.nav.admissions', 'Admissions')}</span>
        </NavLink>

        <NavLink
          to="/students/list"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? 'border-mehndi-600 text-mehndi-700 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300'
            }`
          }
        >
          <Users className="w-4 h-4" />
          <span>{t('studentsModule.nav.students', 'Students')}</span>
        </NavLink>
      </div>
    </div>
  );
};
