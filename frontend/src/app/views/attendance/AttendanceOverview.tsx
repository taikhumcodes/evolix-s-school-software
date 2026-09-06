import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  AlertCircle,
  Calendar,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { AttendanceNav } from './AttendanceNav';
import { useAttendanceOverview } from '../../../lib/api/attendance';

export default function AttendanceOverview() {
  const { t } = useTranslation();
  const { data, isLoading } = useAttendanceOverview();

  const students = data?.students || { present: 0, absent: 0, late: 0, halfDay: 0, excused: 0, leave: 0 };
  const staff = data?.staff || { present: 0, absent: 0, late: 0, leave: 0 };
  const classes = data?.classes || { total: 0, marked: 0, unmarked: 0 };

  return (
    <div className="space-y-6">
      <AttendanceNav />

      {/* Date Banner */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-mehndi-400 text-xs font-semibold uppercase tracking-wider">
            <Calendar className="w-4 h-4" />
            <span>{t('attendanceModule.overview.todayStatus', "Today's Operational Register")}</span>
          </div>
          <h2 className="text-2xl font-bold mt-1 tracking-tight">
            {data?.date || new Date().toISOString().split('T')[0]}
          </h2>
          <p className="text-zinc-300 text-xs mt-1">
            {t('attendanceModule.overview.registerSummary', 'Live synchronization across student classrooms and staff GPS check-in.')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/attendance/students"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold shadow-md shadow-mehndi-600/30 transition-all"
          >
            <span>{t('attendanceModule.overview.takeAttendance', 'Take Daily Attendance')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/attendance/staff"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all"
          >
            <span>{t('attendanceModule.overview.staffCheckIn', 'Staff Check-In')}</span>
          </Link>
        </div>
      </div>

      {/* Student Attendance Cards */}
      <div>
        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-3">
          {t('attendanceModule.overview.studentSection', 'Student Attendance Today')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">{t('attendanceModule.status.present', 'Present')}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-700 mt-2">{isLoading ? '—' : students.present}</p>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">{t('attendanceModule.status.absent', 'Absent')}</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-black text-rose-700 mt-2">{isLoading ? '—' : students.absent}</p>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">{t('attendanceModule.status.late', 'Late')}</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-amber-700 mt-2">{isLoading ? '—' : students.late}</p>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">{t('attendanceModule.status.halfDay', 'Half Day')}</span>
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-2xl font-black text-orange-700 mt-2">{isLoading ? '—' : students.halfDay}</p>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">{t('attendanceModule.status.excused', 'Excused')}</span>
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-blue-700 mt-2">{isLoading ? '—' : students.excused}</p>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">{t('attendanceModule.status.leave', 'On Leave')}</span>
              <Briefcase className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-black text-purple-700 mt-2">{isLoading ? '—' : students.leave}</p>
          </div>
        </div>
      </div>

      {/* Staff & Class Marking Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Staff Attendance Summary */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-zinc-900">{t('attendanceModule.overview.staffToday', 'Staff Attendance')}</h4>
            <Link to="/attendance/staff" className="text-xs font-semibold text-mehndi-600 hover:text-mehndi-700">
              {t('attendanceModule.overview.viewAll', 'View Details →')}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">{t('attendanceModule.status.present', 'Present')}</span>
              <p className="text-xl font-bold text-emerald-900 mt-1">{isLoading ? '—' : staff.present}</p>
            </div>
            <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100">
              <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">{t('attendanceModule.status.absent', 'Absent')}</span>
              <p className="text-xl font-bold text-rose-900 mt-1">{isLoading ? '—' : staff.absent}</p>
            </div>
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
              <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">{t('attendanceModule.status.late', 'Late')}</span>
              <p className="text-xl font-bold text-amber-900 mt-1">{isLoading ? '—' : staff.late}</p>
            </div>
            <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
              <span className="text-[11px] font-semibold text-purple-800 uppercase tracking-wider">{t('attendanceModule.status.leave', 'On Leave')}</span>
              <p className="text-xl font-bold text-purple-900 mt-1">{isLoading ? '—' : staff.leave}</p>
            </div>
          </div>
        </div>

        {/* Classroom Register Progress */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-zinc-900">{t('attendanceModule.overview.classProgress', 'Classroom Registers')}</h4>
            <span className="text-xs font-bold text-zinc-500">{classes.marked} / {classes.total} {t('attendanceModule.overview.classesDone', 'Marked')}</span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-mehndi-600 h-3 rounded-full transition-all duration-500"
              style={{
                width: `${classes.total > 0 ? (classes.marked / classes.total) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs pt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-mehndi-600" />
              <span className="text-zinc-600">{t('attendanceModule.overview.completed', 'Completed')}: {classes.marked}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
              <span className="text-zinc-600">{t('attendanceModule.overview.notMarked', 'Pending')}: {classes.unmarked}</span>
            </div>
          </div>
        </div>

        {/* Pending Actions */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-zinc-900">{t('attendanceModule.overview.actionRequired', 'Pending Actions')}</h4>
          <div className="space-y-2.5">
            <Link
              to="/attendance/student-leave"
              className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium text-zinc-800">{t('attendanceModule.overview.pendingStudentLeave', 'Pending Student Leaves')}</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                {data?.pendingStudentLeaves ?? 0}
              </span>
            </Link>

            <Link
              to="/attendance/holidays"
              className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-zinc-500" />
                <span className="text-xs font-medium text-zinc-800">{t('attendanceModule.overview.calendarClosures', 'Manage Holidays & Calendar')}</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
