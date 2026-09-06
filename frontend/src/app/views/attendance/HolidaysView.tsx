import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Info,
} from 'lucide-react';
import { AttendanceNav } from './AttendanceNav';
import {
  useHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
  SchoolHoliday,
} from '../../../lib/api/attendance';
import { useAuth } from '../../../core/auth/AuthContext';
import { useAcademicYears } from '../../../lib/api/academic-years';

export default function HolidaysView() {
  const { t } = useTranslation();
  const { user, hasPermission } = useAuth();
  const schoolId = user?.school_id || '';
  const canManage = hasPermission('holidays.manage');

  const { data: academicYears } = useAcademicYears(schoolId);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<SchoolHoliday | null>(null);
  const [modalError, setModalError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [holidayType, setHolidayType] = useState<
    'PUBLIC_HOLIDAY' | 'SCHOOL_HOLIDAY' | 'VACATION' | 'EMERGENCY_CLOSURE' | 'OTHER'
  >('PUBLIC_HOLIDAY');
  const [description, setDescription] = useState('');
  const [isWorkingOverride, setIsWorkingOverride] = useState(false);

  // Auto-select current academic year
  useEffect(() => {
    if (academicYears && academicYears.length > 0 && !selectedAcademicYearId) {
      const current = academicYears.find((y: any) => y.isCurrent) || academicYears[0];
      setSelectedAcademicYearId(current.id);
    }
  }, [academicYears, selectedAcademicYearId]);

  const {
    data: holidays,
    isLoading,
    refetch,
  } = useHolidays(selectedAcademicYearId || undefined);

  const createMutation = useCreateHoliday();
  const updateMutation = useUpdateHoliday();
  const deleteMutation = useDeleteHoliday();

  const handleOpenCreate = () => {
    setEditingHoliday(null);
    setName('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setHolidayType('PUBLIC_HOLIDAY');
    setDescription('');
    setIsWorkingOverride(false);
    setModalError('');
    setShowModal(true);
  };

  const handleOpenEdit = (holiday: SchoolHoliday) => {
    setEditingHoliday(holiday);
    setName(holiday.name);
    setStartDate(holiday.startDate);
    setEndDate(holiday.endDate || '');
    setHolidayType(holiday.type);
    setDescription(holiday.description || '');
    setIsWorkingOverride(holiday.isWorkingOverride);
    setModalError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setModalError(t('attendanceModule.holidays.nameRequired', 'Holiday name is required'));
      return;
    }
    if (!startDate) {
      setModalError(t('attendanceModule.holidays.startDateRequired', 'Start date is required'));
      return;
    }
    if (!selectedAcademicYearId) {
      setModalError(t('attendanceModule.selectAcademicYear', 'Please select an academic year'));
      return;
    }

    try {
      if (editingHoliday) {
        await updateMutation.mutateAsync({
          id: editingHoliday.id,
          data: {
            name: name.trim(),
            startDate,
            endDate: endDate || null,
            type: holidayType,
            description: description.trim() || null,
            isWorkingOverride,
          },
        });
      } else {
        await createMutation.mutateAsync({
          academicYearId: selectedAcademicYearId,
          name: name.trim(),
          startDate,
          endDate: endDate || null,
          type: holidayType,
          description: description.trim() || null,
          isWorkingOverride,
        });
      }
      setShowModal(false);
      refetch();
    } catch (err: any) {
      setModalError(err.response?.data?.message || err.message || 'Failed to save holiday');
    }
  };

  const handleDelete = async (id: string, holidayName: string) => {
    if (
      !window.confirm(
        t(
          'attendanceModule.holidays.confirmDelete',
          'Are you sure you want to delete this holiday: {{name}}?',
          { name: holidayName }
        )
      )
    ) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete holiday');
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'PUBLIC_HOLIDAY':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
      case 'SCHOOL_HOLIDAY':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      case 'VACATION':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
      case 'EMERGENCY_CLOSURE':
        return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Module Navigation */}
      <AttendanceNav />

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            {t('attendanceModule.holidays.title', 'School Holidays & Working Overrides')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t(
              'attendanceModule.holidays.subtitle',
              'Configure official holidays, breaks, and special working-day overrides affecting attendance calculation.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {academicYears && academicYears.length > 0 && (
            <select
              value={selectedAcademicYearId}
              onChange={(e) => setSelectedAcademicYearId(e.target.value)}
              className="text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {academicYears.map((ay: any) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.isCurrent ? `(${t('common.current', 'Current')})` : ''}
                </option>
              ))}
            </select>
          )}

          {canManage && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {t('attendanceModule.holidays.addHoliday', 'Add Holiday')}
            </button>
          )}
        </div>
      </div>

      {/* Overview Notice Box */}
      <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-900 dark:text-indigo-200 space-y-1">
          <p className="font-semibold">
            {t('attendanceModule.holidays.workingDayNoticeTitle', 'Attendance Percentage Denominator')}
          </p>
          <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
            {t(
              'attendanceModule.holidays.workingDayNoticeBody',
              'Days marked as holidays are excluded from total working days unless marked as a "Working Day Override". The attendance percentage accurately uses valid school working days only.'
            )}
          </p>
        </div>
      </div>

      {/* Holidays List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            {t('common.loading', 'Loading holidays...')}
          </div>
        ) : !holidays || holidays.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t('attendanceModule.holidays.noHolidays', 'No holidays configured')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t(
                'attendanceModule.holidays.noHolidaysDesc',
                'No holidays have been scheduled for this academic year yet.'
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-semibold">
                  <th className="py-3 px-4">{t('attendanceModule.holidays.name', 'Holiday Name')}</th>
                  <th className="py-3 px-4">{t('attendanceModule.holidays.type', 'Type')}</th>
                  <th className="py-3 px-4">{t('attendanceModule.holidays.dates', 'Date(s)')}</th>
                  <th className="py-3 px-4">
                    {t('attendanceModule.holidays.statusOverride', 'Working Day Override')}
                  </th>
                  <th className="py-3 px-4">
                    {t('attendanceModule.holidays.description', 'Description')}
                  </th>
                  {canManage && (
                    <th className="py-3 px-4 text-right">
                      {t('common.actions', 'Actions')}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {holidays.map((h) => {
                  const isRange = h.endDate && h.endDate !== h.startDate;
                  return (
                    <tr
                      key={h.id}
                      className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {h.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-md ${getTypeBadge(
                            h.type
                          )}`}
                        >
                          {t(`attendanceModule.holidays.types.${h.type}`, h.type)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {h.startDate}
                        {isRange && ` → ${h.endDate}`}
                      </td>
                      <td className="py-3.5 px-4">
                        {h.isWorkingOverride ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t('attendanceModule.holidays.overrideActive', 'Working Day')}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {t('attendanceModule.holidays.nonWorkingDay', 'Off / Non-working')}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {h.description || '—'}
                      </td>
                      {canManage && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(h)}
                              title={t('common.edit', 'Edit')}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(h.id, h.name)}
                              title={t('common.delete', 'Delete')}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Holiday Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingHoliday
                  ? t('attendanceModule.holidays.editHoliday', 'Edit Holiday')
                  : t('attendanceModule.holidays.addHoliday', 'Add Holiday')}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  {t('attendanceModule.holidays.name', 'Holiday Name')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('attendanceModule.holidays.namePlaceholder', 'e.g. Diwali Break, Independence Day')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    {t('attendanceModule.holidays.startDate', 'Start Date')} *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    {t('attendanceModule.holidays.endDate', 'End Date (Optional)')}
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  {t('attendanceModule.holidays.type', 'Type')}
                </label>
                <select
                  value={holidayType}
                  onChange={(e) => setHolidayType(e.target.value as any)}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="PUBLIC_HOLIDAY">
                    {t('attendanceModule.holidays.types.PUBLIC_HOLIDAY', 'Public Holiday')}
                  </option>
                  <option value="SCHOOL_HOLIDAY">
                    {t('attendanceModule.holidays.types.SCHOOL_HOLIDAY', 'School Holiday')}
                  </option>
                  <option value="VACATION">
                    {t('attendanceModule.holidays.types.VACATION', 'Vacation / Term Break')}
                  </option>
                  <option value="EMERGENCY_CLOSURE">
                    {t('attendanceModule.holidays.types.EMERGENCY_CLOSURE', 'Emergency Closure / Weather')}
                  </option>
                  <option value="OTHER">
                    {t('attendanceModule.holidays.types.OTHER', 'Other')}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  {t('attendanceModule.holidays.description', 'Description / Notes')}
                </label>
                <textarea
                  rows={2}
                  placeholder={t('attendanceModule.holidays.descPlaceholder', 'Optional additional context or notification note...')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Working Override Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isWorkingOverride}
                    onChange={(e) => setIsWorkingOverride(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white block">
                      {t('attendanceModule.holidays.enableOverride', 'Special Working Day Override')}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                      {t(
                        'attendanceModule.holidays.overrideExplanation',
                        'Treat this date as a working day for attendance calculation (e.g. compensatory working Saturday or special event).'
                      )}
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? t('common.saving', 'Saving...')
                    : editingHoliday
                    ? t('common.saveChanges', 'Save Changes')
                    : t('common.create', 'Create Holiday')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
