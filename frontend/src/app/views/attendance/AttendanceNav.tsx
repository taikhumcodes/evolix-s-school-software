import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  CalendarCheck,
  Clock,
  MapPin,
  FileText,
  Calendar,
  BarChart3,
} from 'lucide-react';

export const AttendanceNav: React.FC = () => {
  const { t } = useTranslation();

  const navItems = [
    {
      to: '/attendance/overview',
      label: t('attendanceModule.nav.overview', 'Overview'),
      icon: LayoutDashboard,
    },
    {
      to: '/attendance/students',
      label: t('attendanceModule.nav.studentAttendance', 'Student Attendance'),
      icon: CalendarCheck,
    },
    {
      to: '/attendance/student-leave',
      label: t('attendanceModule.nav.studentLeave', 'Student Leave'),
      icon: Clock,
    },
    {
      to: '/attendance/staff',
      label: t('attendanceModule.nav.staffAttendance', 'Staff Attendance'),
      icon: MapPin,
    },
    {
      to: '/attendance/staff-leave',
      label: t('attendanceModule.nav.staffLeave', 'Staff Leave'),
      icon: FileText,
    },
    {
      to: '/attendance/holidays',
      label: t('attendanceModule.nav.holidays', 'Holidays'),
      icon: Calendar,
    },
    {
      to: '/attendance/reports',
      label: t('attendanceModule.nav.reports', 'Reports'),
      icon: BarChart3,
    },
  ];

  return (
    <div className="bg-white border-b border-zinc-200 pb-0 -mx-6 -mt-6 md:-mx-8 md:-mt-8 px-6 md:px-8 pt-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              {t('attendanceModule.title', 'Attendance & Leave Management')}
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-mehndi-50 text-mehndi-700 border border-mehndi-200">
              Module 05
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {t(
              'attendanceModule.subtitle',
              'Real-time student registers, staff geofencing, school calendar, and leave approvals'
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-t border-zinc-100 overflow-x-auto no-scrollbar pt-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-mehndi-600 text-mehndi-700 font-bold bg-mehndi-50/40 rounded-t-lg'
                    : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:border-zinc-300'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};
