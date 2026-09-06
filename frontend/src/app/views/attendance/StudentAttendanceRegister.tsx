import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  CheckCircle2,
  Search,
  Lock,
  AlertTriangle,
  Save,
  Check,
  Edit2,
  X,
} from 'lucide-react';
import { AttendanceNav } from './AttendanceNav';
import {
  useStudentRegister,
  useSaveStudentRegister,
  useCorrectStudentAttendance,
  AttendanceRegisterStudent,
} from '../../../lib/api/attendance';
import { useClasses } from '../../../lib/api/master-data';
import { useAcademicYears } from '../../../lib/api/academic-years';
import { useTenant } from '../../../core/tenancy/TenantContext';
import { useAuth } from '../../../core/auth/AuthContext';

export default function StudentAttendanceRegister() {
  const { t } = useTranslation();
  const { currentTenant } = useTenant();
  const { hasPermission } = useAuth();
  const schoolId = currentTenant?.schoolId || localStorage.getItem('selected_school_id') || '';

  const canOverride = hasPermission('attendance.override');
  const canMark = hasPermission('attendance.mark') || hasPermission('attendance.manage') || canOverride;

  // Filters
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');

  // Local state for edits
  const [draftRecords, setDraftRecords] = useState<Record<string, { status: string; remarks: string }>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Correction modal state
  const [correctingStudent, setCorrectingStudent] = useState<AttendanceRegisterStudent | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState('PRESENT');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionError, setCorrectionError] = useState('');

  // API Queries
  const { data: academicYears } = useAcademicYears(schoolId);
  const { data: classes } = useClasses(schoolId);

  // Auto-select current academic year
  useEffect(() => {
    if (academicYears && academicYears.length > 0 && !selectedAcademicYearId) {
      const current = academicYears.find((y: any) => y.isCurrent) || academicYears[0];
      setSelectedAcademicYearId(current.id);
    }
  }, [academicYears, selectedAcademicYearId]);

  // Auto-select first class
  useEffect(() => {
    if (classes && classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const selectedClass = classes?.find((c: any) => c.id === selectedClassId);
  const sections = selectedClass?.sections?.map((cs: any) => cs.section || cs) || [];

  const {
    data: register,
    isLoading: registerLoading,
    refetch,
  } = useStudentRegister({
    academicYearId: selectedAcademicYearId,
    classId: selectedClassId,
    sectionId: selectedSectionId || undefined,
    date: selectedDate,
  });

  const saveMutation = useSaveStudentRegister();
  const correctMutation = useCorrectStudentAttendance();

  // Synchronize incoming register items into local draft state
  useEffect(() => {
    if (register?.items) {
      const initial: Record<string, { status: string; remarks: string }> = {};
      register.items.forEach((item) => {
        initial[item.studentId] = {
          status: item.status || '',
          remarks: item.remarks || '',
        };
      });
      setDraftRecords(initial);
      setHasUnsavedChanges(false);
      setErrorMessage('');
    }
  }, [register]);

  // Status changing handler
  const handleStatusChange = (studentId: string, status: string) => {
    setDraftRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { remarks: '' }),
        status,
      },
    }));
    setHasUnsavedChanges(true);
    setSaveSuccess(false);
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setDraftRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: '' }),
        remarks,
      },
    }));
    setHasUnsavedChanges(true);
  };

  // Mark All Present
  const handleMarkAllPresent = () => {
    if (!register?.items) return;
    const updated: Record<string, { status: string; remarks: string }> = {};
    register.items.forEach((item) => {
      // Don't overwrite if student is on approved leave
      const current = draftRecords[item.studentId];
      updated[item.studentId] = {
        status: item.hasApprovedLeave ? 'LEAVE' : 'PRESENT',
        remarks: current?.remarks || '',
      };
    });
    setDraftRecords(updated);
    setHasUnsavedChanges(true);
    setSaveSuccess(false);
  };

  // Save register
  const handleSave = async () => {
    if (!register || !canMark) return;
    setErrorMessage('');

    // Ensure all students have a marked status before saving
    const hasUnmarked = Object.entries(draftRecords).some(([_, val]) => !val.status);
    if (hasUnmarked) {
      setErrorMessage(t('attendanceModule.register.allStudentsMustBeMarked', 'Please mark all students (or click Mark All Present) before saving.'));
      return;
    }

    try {
      const records = Object.entries(draftRecords).map(([studentId, val]) => ({
        studentId,
        status: val.status,
        remarks: val.remarks || null,
      }));

      await saveMutation.mutateAsync({
        academicYearId: selectedAcademicYearId,
        classId: selectedClassId,
        sectionId: selectedSectionId || null,
        date: selectedDate,
        mode: 'DAILY',
        records,
      });

      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      refetch();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        t('attendanceModule.errors.saveFailed', 'Failed to save attendance register');
      setErrorMessage(msg);
    }
  };

  // Handle Correction Submit
  const handleCorrectionSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!correctingStudent || !correctingStudent.attendanceId) return;
    if (!correctionReason.trim()) {
      setCorrectionError(t('attendanceModule.errors.reasonRequired', 'Correction reason is required'));
      return;
    }
    setCorrectionError('');
    try {
      await correctMutation.mutateAsync({
        attendanceId: correctingStudent.attendanceId,
        newStatus: correctionStatus,
        reason: correctionReason.trim(),
      });
      setCorrectingStudent(null);
      setCorrectionReason('');
      refetch();
    } catch (err: any) {
      setCorrectionError(err?.response?.data?.message || 'Correction failed');
    }
  };

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!register?.items) return [];
    if (!searchQuery.trim()) return register.items;
    const q = searchQuery.toLowerCase().trim();
    return register.items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.admissionNumber.toLowerCase().includes(q) ||
        item.studentCode.toLowerCase().includes(q) ||
        (item.rollNumber && item.rollNumber.toLowerCase().includes(q))
    );
  }, [register?.items, searchQuery]);

  const isLocked = register?.isLocked && !canOverride;

  return (
    <div className="space-y-6">
      <AttendanceNav />

      {/* Control Bar: Class, Section, Date, Year */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Academic Year */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              {t('attendanceModule.register.academicYear', 'Academic Year')}
            </label>
            <select
              value={selectedAcademicYearId}
              onChange={(e) => setSelectedAcademicYearId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-zinc-300 bg-white text-xs font-medium focus:ring-2 focus:ring-mehndi-500"
            >
              {academicYears?.map((y: any) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              {t('attendanceModule.register.date', 'Attendance Date')}
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (hasUnsavedChanges && !window.confirm(t('attendanceModule.register.unsavedWarning', 'You have unsaved changes. Discard?'))) {
                  return;
                }
                setSelectedDate(e.target.value);
              }}
              className="w-full h-10 px-3 rounded-xl border border-zinc-300 bg-white text-xs font-medium focus:ring-2 focus:ring-mehndi-500"
            />
          </div>

          {/* Class */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              {t('attendanceModule.register.class', 'Class / Grade')}
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedSectionId('');
              }}
              className="w-full h-10 px-3 rounded-xl border border-zinc-300 bg-white text-xs font-medium focus:ring-2 focus:ring-mehndi-500"
            >
              <option value="">{t('attendanceModule.register.selectClass', 'Select Class')}</option>
              {classes?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              {t('attendanceModule.register.section', 'Section')}
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-zinc-300 bg-white text-xs font-medium focus:ring-2 focus:ring-mehndi-500"
            >
              <option value="">{t('attendanceModule.register.allSections', 'All Sections')}</option>
              {sections.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Day Status Notice & Search Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-100">
          <div className="flex items-center gap-2 flex-wrap">
            {register?.dayStatus.isHoliday && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>{t('attendanceModule.register.holidayNotice', 'School Holiday')}: {register.dayStatus.holidayName}</span>
              </span>
            )}

            {!register?.dayStatus.isWorkingDay && !register?.dayStatus.isHoliday && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>{t('attendanceModule.register.nonWorkingDay', 'Non-Working Day')}</span>
              </span>
            )}

            {register?.dayStatus.isWorkingOverride && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <Check className="w-3.5 h-3.5" />
                <span>{t('attendanceModule.register.workingOverride', 'Authorized Working Day Override')}</span>
              </span>
            )}

            {register && !register.isMarked && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-zinc-400" />
                <span>{t('attendanceModule.register.notMarkedYet', 'Attendance Not Yet Taken')}</span>
              </span>
            )}

            {register && register.isMarked && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('attendanceModule.register.markedRecorded', 'Attendance Recorded')}</span>
              </span>
            )}

            {register?.isLocked && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-bold">
                <Lock className="w-3.5 h-3.5 text-zinc-500" />
                <span>
                  {canOverride
                    ? t('attendanceModule.register.lockedOverridden', 'Locked (Override Active)')
                    : t('attendanceModule.register.locked', 'Attendance Locked')}
                </span>
              </span>
            )}

            {hasUnsavedChanges && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>{t('attendanceModule.register.unsaved', 'Unsaved Changes')}</span>
              </span>
            )}

            {saveSuccess && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('attendanceModule.register.savedSuccess', 'Attendance Saved Successfully!')}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={t('attendanceModule.register.searchPlaceholder', 'Filter by name or roll...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-mehndi-500"
              />
            </div>

            {canMark && !isLocked && (
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-all whitespace-nowrap"
              >
                {t('attendanceModule.register.markAllPresent', 'Mark All Present')}
              </button>
            )}

            {canMark && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saveMutation.isPending || isLocked}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-mehndi-600/20 transition-all whitespace-nowrap"
              >
                <Save className="w-4 h-4" />
                <span>{saveMutation.isPending ? t('common.saving', 'Saving...') : t('attendanceModule.register.saveAttendance', 'Save Register')}</span>
              </button>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Register List / Mobile Cards */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        {registerLoading ? (
          <div className="p-12 text-center text-zinc-400 text-xs">{t('common.loading', 'Loading register...')}</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 space-y-2">
            <Users className="w-8 h-8 mx-auto text-zinc-300" />
            <p className="text-sm font-semibold">{t('attendanceModule.register.noStudents', 'No eligible enrolled students found')}</p>
            <p className="text-xs text-zinc-400">{t('attendanceModule.register.noStudentsSub', 'Please verify Class, Section, and active enrollments for this date.')}</p>
          </div>
        ) : (
          <div>
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-16">#Roll</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Student ID / Adm No</th>
                    <th className="py-3 px-4">Attendance Status</th>
                    <th className="py-3 px-4">Remarks</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredItems.map((item) => {
                    const current = draftRecords[item.studentId] || {
                      status: item.status || '',
                      remarks: '',
                    };

                    return (
                      <tr key={item.studentId} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-zinc-700">{item.rollNumber || '—'}</td>
                        <td className="py-3 px-4 font-bold text-zinc-900">
                          <div className="flex items-center gap-2">
                            <span>{item.name}</span>
                            {item.hasApprovedLeave && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-semibold text-[10px]">
                                Approved Leave
                              </span>
                            )}
                            {!current.status && !item.hasApprovedLeave && (
                              <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 font-semibold text-[10px]">
                                {t('attendanceModule.register.unmarked', 'Unmarked')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-zinc-500">
                          {item.studentCode} • {item.admissionNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {[
                              { key: 'PRESENT', label: t('attendanceModule.status.present', 'Present'), color: 'emerald' },
                              { key: 'ABSENT', label: t('attendanceModule.status.absent', 'Absent'), color: 'rose' },
                              { key: 'LATE', label: t('attendanceModule.status.late', 'Late'), color: 'amber' },
                              { key: 'HALF_DAY', label: t('attendanceModule.status.halfDay', 'Half Day'), color: 'orange' },
                              { key: 'EXCUSED', label: t('attendanceModule.status.excused', 'Excused'), color: 'blue' },
                              { key: 'LEAVE', label: t('attendanceModule.status.leave', 'Leave'), color: 'purple' },
                            ].map((btn) => {
                              const active = current.status === btn.key;
                              return (
                                <button
                                  key={btn.key}
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => handleStatusChange(item.studentId, btn.key)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                                    active
                                      ? btn.key === 'PRESENT'
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                        : btn.key === 'ABSENT'
                                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                        : btn.key === 'LATE'
                                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                        : btn.key === 'HALF_DAY'
                                        ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                                        : btn.key === 'EXCUSED'
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                        : 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                      : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                                  } ${isLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                                >
                                  {btn.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder="Add note..."
                            disabled={isLocked}
                            value={current.remarks || ''}
                            onChange={(e) => handleRemarksChange(item.studentId, e.target.value)}
                            className="w-full px-2.5 py-1 rounded-lg border border-zinc-200 text-xs focus:ring-1 focus:ring-mehndi-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-right">
                          {item.attendanceId && (
                            <button
                              type="button"
                              onClick={() => {
                                setCorrectingStudent(item);
                                setCorrectionStatus(item.status || 'PRESENT');
                                setCorrectionReason('');
                                setCorrectionError('');
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-mehndi-700 hover:underline"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>{t('attendanceModule.register.correct', 'Correct')}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< 768px, optimized for 390px) */}
            <div className="md:hidden divide-y divide-zinc-200">
              {filteredItems.map((item) => {
                const current = draftRecords[item.studentId] || {
                  status: item.status || '',
                  remarks: '',
                };

                return (
                  <div key={item.studentId} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-zinc-900">
                            #{item.rollNumber || '—'} {item.name}
                          </span>
                          {item.hasApprovedLeave && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                              Leave
                            </span>
                          )}
                          {!current.status && !item.hasApprovedLeave && (
                            <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-bold">
                              {t('attendanceModule.register.unmarked', 'Unmarked')}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {item.studentCode} • {item.admissionNumber}
                        </p>
                      </div>

                      {item.attendanceId && (
                        <button
                          type="button"
                          onClick={() => {
                            setCorrectingStudent(item);
                            setCorrectionStatus(item.status || 'PRESENT');
                            setCorrectionReason('');
                            setCorrectionError('');
                          }}
                          className="text-[11px] font-bold text-mehndi-700 p-1"
                        >
                          {t('attendanceModule.register.correct', 'Correct')}
                        </button>
                      )}
                    </div>

                    {/* Status segment buttons */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { key: 'PRESENT', label: t('attendanceModule.status.present', 'Present'), color: 'emerald' },
                        { key: 'ABSENT', label: t('attendanceModule.status.absent', 'Absent'), color: 'rose' },
                        { key: 'LATE', label: t('attendanceModule.status.late', 'Late'), color: 'amber' },
                        { key: 'HALF_DAY', label: t('attendanceModule.status.halfDay', 'Half Day'), color: 'orange' },
                        { key: 'EXCUSED', label: t('attendanceModule.status.excused', 'Excused'), color: 'blue' },
                        { key: 'LEAVE', label: t('attendanceModule.status.leave', 'Leave'), color: 'purple' },
                      ].map((btn) => {
                        const active = current.status === btn.key;
                        return (
                          <button
                            key={btn.key}
                            type="button"
                            disabled={isLocked}
                            onClick={() => handleStatusChange(item.studentId, btn.key)}
                            className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                              active
                                ? btn.key === 'PRESENT'
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                  : btn.key === 'ABSENT'
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                  : btn.key === 'LATE'
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                  : btn.key === 'HALF_DAY'
                                  ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                                  : btn.key === 'EXCUSED'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                : 'bg-white text-zinc-700 border-zinc-200'
                            }`}
                          >
                            {btn.label}
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="text"
                      placeholder="Remarks..."
                      disabled={isLocked}
                      value={current.remarks || ''}
                      onChange={(e) => handleRemarksChange(item.studentId, e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 text-xs"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Attendance Correction Modal */}
      {correctingStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-zinc-900">
                {t('attendanceModule.correction.title', 'Attendance Correction')}
              </h3>
              <button
                type="button"
                onClick={() => setCorrectingStudent(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="space-y-4">
              <div>
                <p className="text-xs text-zinc-500">{t('attendanceModule.correction.student', 'Student')}</p>
                <p className="text-sm font-bold text-zinc-900 mt-0.5">
                  #{correctingStudent.rollNumber || '—'} {correctingStudent.name}
                </p>
                <p className="text-xs text-zinc-400">{correctingStudent.studentCode}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  {t('attendanceModule.correction.newStatus', 'New Status')}
                </label>
                <select
                  value={correctionStatus}
                  onChange={(e) => setCorrectionStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-mehndi-500"
                >
                  <option value="PRESENT">{t('attendanceModule.status.present', 'Present')}</option>
                  <option value="ABSENT">{t('attendanceModule.status.absent', 'Absent')}</option>
                  <option value="LATE">{t('attendanceModule.status.late', 'Late')}</option>
                  <option value="HALF_DAY">{t('attendanceModule.status.halfDay', 'Half Day')}</option>
                  <option value="EXCUSED">{t('attendanceModule.status.excused', 'Excused')}</option>
                  <option value="LEAVE">{t('attendanceModule.status.leave', 'Leave')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  {t('attendanceModule.correction.reason', 'Correction Reason')} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={t('attendanceModule.correction.reasonPlaceholder', 'Provide authoritative reason for this correction...')}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full p-3 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-mehndi-500"
                />
              </div>

              {correctionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                  {correctionError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setCorrectingStudent(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={correctMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold shadow-md shadow-mehndi-600/20"
                >
                  {correctMutation.isPending ? t('common.saving', 'Saving...') : t('attendanceModule.correction.apply', 'Apply Correction')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
