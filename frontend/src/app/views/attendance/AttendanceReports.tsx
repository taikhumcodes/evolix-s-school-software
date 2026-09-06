import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
} from 'lucide-react';
import { AttendanceNav } from './AttendanceNav';
import {
  useDailyReport,
  useMonthlyReport,
  downloadAttendanceCsv,
} from '../../../lib/api/attendance';
import { useAuth } from '../../../core/auth/AuthContext';
import { useClasses } from '../../../lib/api/master-data';

export default function AttendanceReports() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const schoolId = user?.school_id || '';

  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');

  // Daily Filters
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Monthly Filters
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Class / Section Filters
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const { data: classes } = useClasses(schoolId);
  const selectedClass = classes?.find((c: any) => c.id === selectedClassId);
  const sections = selectedClass?.sections?.map((cs: any) => cs.section || cs) || [];

  // Daily Query
  const { data: dailyData, isLoading: isDailyLoading } = useDailyReport({
    date: selectedDate,
    classId: selectedClassId || undefined,
    sectionId: selectedSectionId || undefined,
  });

  // Monthly Query
  const { data: monthlyData, isLoading: isMonthlyLoading } = useMonthlyReport({
    month: selectedMonth,
    year: selectedYear,
    classId: selectedClassId || undefined,
    sectionId: selectedSectionId || undefined,
  });

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      if (reportType === 'daily') {
        await downloadAttendanceCsv({
          type: 'daily',
          date: selectedDate,
          classId: selectedClassId || undefined,
          sectionId: selectedSectionId || undefined,
        });
      } else {
        await downloadAttendanceCsv({
          type: 'monthly',
          month: selectedMonth,
          year: selectedYear,
          classId: selectedClassId || undefined,
          sectionId: selectedSectionId || undefined,
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered lists
  const filteredDaily = (dailyData || []).filter((r: any) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      r.studentName.toLowerCase().includes(q) ||
      r.admissionNumber.toLowerCase().includes(q) ||
      r.studentCode.toLowerCase().includes(q)
    );
  });

  const filteredMonthly = (monthlyData || []).filter((r: any) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      r.studentName.toLowerCase().includes(q) ||
      r.admissionNumber.toLowerCase().includes(q) ||
      r.studentCode.toLowerCase().includes(q)
    );
  });

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> {t('attendanceModule.statuses.PRESENT', 'Present')}
          </span>
        );
      case 'ABSENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
            <XCircle className="w-3 h-3" /> {t('attendanceModule.statuses.ABSENT', 'Absent')}
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
            <Clock className="w-3 h-3" /> {t('attendanceModule.statuses.LATE', 'Late')}
          </span>
        );
      case 'HALF_DAY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400">
            {t('attendanceModule.statuses.HALF_DAY', 'Half Day')}
          </span>
        );
      case 'LEAVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400">
            {t('attendanceModule.statuses.LEAVE', 'Approved Leave')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  const months = [
    { value: 1, label: t('months.january', 'January') },
    { value: 2, label: t('months.february', 'February') },
    { value: 3, label: t('months.march', 'March') },
    { value: 4, label: t('months.april', 'April') },
    { value: 5, label: t('months.may', 'May') },
    { value: 6, label: t('months.june', 'June') },
    { value: 7, label: t('months.july', 'July') },
    { value: 8, label: t('months.august', 'August') },
    { value: 9, label: t('months.september', 'September') },
    { value: 10, label: t('months.october', 'October') },
    { value: 11, label: t('months.november', 'November') },
    { value: 12, label: t('months.december', 'December') },
  ];

  return (
    <div className="space-y-6 pb-12 print:p-0 print:space-y-4">
      {/* Module Navigation (hidden in print) */}
      <div className="print:hidden">
        <AttendanceNav />
      </div>

      {/* Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            {t('attendanceModule.reports.title', 'Attendance Reports & Analytics')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t(
              'attendanceModule.reports.subtitle',
              'Generate consolidated daily rosters, monthly student summaries, and export attendance audits.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-sm font-medium transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            {t('attendanceModule.reports.print', 'Print Report')}
          </button>
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting
              ? t('attendanceModule.reports.exporting', 'Exporting...')
              : t('attendanceModule.reports.exportCsv', 'Export CSV')}
          </button>
        </div>
      </div>

      {/* Filter Card (hidden in print) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4 print:hidden">
        {/* Report Type Selector */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <button
            onClick={() => setReportType('daily')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              reportType === 'daily'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t('attendanceModule.reports.dailyRoster', 'Daily Attendance Roster')}
          </button>
          <button
            onClick={() => setReportType('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              reportType === 'monthly'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t('attendanceModule.reports.monthlySummary', 'Monthly Student Summary')}
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {reportType === 'daily' ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                {t('attendanceModule.reports.date', 'Date')}
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  {t('attendanceModule.reports.month', 'Month')}
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  {t('attendanceModule.reports.year', 'Year')}
                </label>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              {t('attendanceModule.reports.class', 'Class')}
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedSectionId('');
              }}
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t('attendanceModule.reports.allClasses', 'All Classes')}</option>
              {classes?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              {t('attendanceModule.reports.section', 'Section')}
            </label>
            <select
              value={selectedSectionId}
              disabled={!selectedClassId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value="">{t('attendanceModule.reports.allSections', 'All Sections')}</option>
              {sections?.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Search Input */}
        <div className="relative pt-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-5" />
          <input
            type="text"
            placeholder={t(
              'attendanceModule.reports.searchPlaceholder',
              'Search by student name, admission number, or student code...'
            )}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block border-b border-slate-300 pb-4 mb-4">
        <h2 className="text-xl font-bold text-black">
          {reportType === 'daily'
            ? `Daily Attendance Roster — ${selectedDate}`
            : `Monthly Student Summary — ${months.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`}
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          {selectedClassId
            ? `Class: ${classes?.find((c: any) => c.id === selectedClassId)?.name || 'Selected'}`
            : 'All Classes'}{' '}
          • Printed on {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Report Table View */}
      {reportType === 'daily' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden print:border-none print:shadow-none">
          {isDailyLoading ? (
            <div className="p-12 text-center text-slate-500">
              {t('common.loading', 'Generating report...')}
            </div>
          ) : filteredDaily.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {t('attendanceModule.reports.noDailyRecords', 'No attendance records found for this date and filter')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-semibold">
                    <th className="py-3 px-4">{t('attendanceModule.reports.student', 'Student')}</th>
                    <th className="py-3 px-4">{t('attendanceModule.reports.admissionNo', 'Adm #')}</th>
                    <th className="py-3 px-4">{t('attendanceModule.reports.classSection', 'Class - Sec')}</th>
                    <th className="py-3 px-4">{t('attendanceModule.reports.status', 'Status')}</th>
                    <th className="py-3 px-4">{t('attendanceModule.reports.remarks', 'Remarks')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDaily.map((r: any) => (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {r.studentName}
                        <span className="block text-xs font-normal text-slate-400">
                          {r.studentCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {r.admissionNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {r.className} {r.sectionName !== '—' && `- ${r.sectionName}`}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(r.status)}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">
                        {r.remarks || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden print:border-none print:shadow-none">
          {isMonthlyLoading ? (
            <div className="p-12 text-center text-slate-500">
              {t('common.loading', 'Generating monthly report...')}
            </div>
          ) : filteredMonthly.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {t('attendanceModule.reports.noMonthlyRecords', 'No student enrollment records found')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-semibold">
                    <th className="py-3 px-4">{t('attendanceModule.reports.student', 'Student')}</th>
                    <th className="py-3 px-4">{t('attendanceModule.reports.classSection', 'Class - Sec')}</th>
                    <th className="py-3 px-4 text-center">{t('attendanceModule.reports.workingDays', 'Working Days')}</th>
                    <th className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400">
                      {t('attendanceModule.reports.present', 'Present')}
                    </th>
                    <th className="py-3 px-4 text-center text-rose-600 dark:text-rose-400">
                      {t('attendanceModule.reports.absent', 'Absent')}
                    </th>
                    <th className="py-3 px-4 text-center text-amber-600 dark:text-amber-400">
                      {t('attendanceModule.reports.late', 'Late')}
                    </th>
                    <th className="py-3 px-4 text-center text-indigo-600 dark:text-indigo-400">
                      {t('attendanceModule.reports.leave', 'Leave')}
                    </th>
                    <th className="py-3 px-4 text-right">{t('attendanceModule.reports.percentage', 'Attendance %')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMonthly.map((m: any) => {
                    const pct = Number(m.percentage) || 0;
                    const isLow = pct < 75;
                    return (
                      <tr
                        key={m.studentId}
                        className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {m.studentName}
                          <span className="block text-xs font-normal text-slate-400">
                            {m.admissionNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {m.className} {m.sectionName !== '—' && `- ${m.sectionName}`}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-700 dark:text-slate-300 font-medium">
                          {m.workingDays}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                          {m.present}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-rose-600 dark:text-rose-400">
                          {m.absent}
                        </td>
                        <td className="py-3 px-4 text-center text-amber-600 dark:text-amber-400">
                          {m.late}
                        </td>
                        <td className="py-3 px-4 text-center text-indigo-600 dark:text-indigo-400">
                          {m.leave}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <span
                              className={`font-bold ${
                                isLow
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {pct}%
                            </span>
                            {isLow && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400">
                                {t('attendanceModule.reports.lowAttendance', 'Low')}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
