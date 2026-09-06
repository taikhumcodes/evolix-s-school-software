import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  CalendarDays,
  UserCheck,
  CalendarRange,
  BookOpenCheck,
  Award,
  PenLine,
  GraduationCap,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';

export const AcademicsNav: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();

  const navItems = [
    {
      to: '/academics/overview',
      label: t('academics.nav.overview', 'Overview'),
      icon: LayoutDashboard,
      permission: 'academic.view',
    },
    {
      to: '/academics/terms',
      label: t('academics.nav.terms', 'Academic Terms'),
      icon: CalendarDays,
      permission: 'academic.view',
    },
    {
      to: '/academics/assignments',
      label: t('academics.nav.assignments', 'Teacher Assignments'),
      icon: UserCheck,
      permission: 'academic.view',
    },
    {
      to: '/academics/timetable',
      label: t('academics.nav.timetable', 'Timetable'),
      icon: CalendarRange,
      permission: 'timetable.view',
    },
    {
      to: '/academics/homework',
      label: t('academics.nav.homework', 'Homework'),
      icon: BookOpenCheck,
      permission: 'homework.view',
    },
    {
      to: '/academics/exams',
      label: t('academics.nav.exams', 'Exams'),
      icon: Award,
      permission: 'exams.view',
    },
    {
      to: '/academics/marks',
      label: t('academics.nav.marks', 'Marks Entry'),
      icon: PenLine,
      permission: 'marks.enter',
    },
    {
      to: '/academics/results',
      label: t('academics.nav.results', 'Results & Cards'),
      icon: GraduationCap,
      permission: 'results.view',
    },
    {
      to: '/academics/promotions',
      label: t('academics.nav.promotions', 'Promotions'),
      icon: TrendingUp,
      permission: 'promotion.manage',
    },
  ];

  return (
    <div className="bg-white border-b border-zinc-200 pb-0 -mx-6 -mt-6 md:-mx-8 md:-mt-8 px-6 md:px-8 pt-6 mb-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              {t('academics.title', 'Academic & Examination Management')}
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Module 06
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {t(
              'academics.subtitle',
              'Manage terms, timetable schedules, homework, examinations, marks register, report cards, and promotions'
            )}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-t border-zinc-100 overflow-x-auto no-scrollbar pt-1">
        {navItems
          .filter((item) => !item.permission || hasPermission(item.permission))
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? 'border-emerald-600 text-emerald-700 font-bold bg-emerald-50/50 rounded-t-lg'
                      : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:border-zinc-300'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
      </div>
    </div>
  );
};
