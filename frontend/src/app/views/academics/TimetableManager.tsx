import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarRange,
  Plus,
  Clock,
  AlertTriangle,
  Trash2,
  X,
} from 'lucide-react';
import { AcademicsNav } from './AcademicsNav';
import {
  useSchoolPeriods,
  useCreateSchoolPeriod,
  useDeleteSchoolPeriod,
  useTimetableSlots,
  useSaveTimetableSlot,
  useDeleteTimetableSlot,
  SchoolPeriod,
} from '../../../lib/api/academics';
import { useAcademicYears } from '../../../lib/api/academic-years';
import {
  useClasses,
  useClassSections,
  useClassSubjects,
} from '../../../lib/api/master-data';
import { useUsers } from '../../../lib/api/users';
import { useTenant } from '../../../core/tenancy/TenantContext';

const DAYS_OF_WEEK = [
  { day: 1, key: 'mon', label: 'Monday' },
  { day: 2, key: 'tue', label: 'Tuesday' },
  { day: 3, key: 'wed', label: 'Wednesday' },
  { day: 4, key: 'thu', label: 'Thursday' },
  { day: 5, key: 'fri', label: 'Friday' },
  { day: 6, key: 'sat', label: 'Saturday' },
];

export const TimetableManager: React.FC = () => {
  const { t } = useTranslation();

  // Academic year, class, section selectors
  const { currentTenant } = useTenant();
  const schoolId = currentTenant?.schoolId || '';
  const { data: years = [] } = useAcademicYears(schoolId);
  const activeYear = years.find((y: any) => y.is_current || y.isCurrent) || years[0];
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const currentYearId = selectedYearId || activeYear?.id || '';

  const { data: classes = [] } = useClasses();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const { data: classSections = [] } = useClassSections({ schoolId, classId: selectedClassId });
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const { data: classSubjects = [] } = useClassSubjects({ schoolId, classId: selectedClassId });

  // Teachers
  const { data: usersData } = useUsers(1, 200);
  const teachers = usersData?.items || [];

  // Periods
  const { data: periods = [], refetch: refetchPeriods } = useSchoolPeriods();
  const createPeriod = useCreateSchoolPeriod();
  const deletePeriod = useDeleteSchoolPeriod();

  // Slots
  const {
    data: slots = [],
    refetch: refetchSlots,
  } = useTimetableSlots({
    academicYearId: currentYearId,
    classId: selectedClassId,
    sectionId: selectedSectionId,
  });

  const saveSlot = useSaveTimetableSlot();
  const deleteSlot = useDeleteTimetableSlot();

  // Period Modal
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [periodName, setPeriodName] = useState('');
  const [periodNumber, setPeriodNumber] = useState(1);
  const [periodStartTime, setPeriodStartTime] = useState('09:00');
  const [periodEndTime, setPeriodEndTime] = useState('09:45');
  const [periodType, setPeriodType] = useState<'TEACHING' | 'RECESS' | 'ASSEMBLY' | 'ZERO_PERIOD' | 'OTHER'>('TEACHING');

  // Slot Modal
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [activeCell, setActiveCell] = useState<{ day: number; periodId: string } | null>(null);
  const [slotSubjectId, setSlotSubjectId] = useState('');
  const [slotTeacherUserId, setSlotTeacherUserId] = useState('');
  const [slotRoomNumber, setSlotRoomNumber] = useState('');
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Quick lookup of slot for a (dayOfWeek, periodId)
  const slotMap = new Map<string, any>();
  slots.forEach((s) => {
    slotMap.set(`${s.dayOfWeek}_${s.periodId}`, s);
  });

  const handleOpenSlotModal = (day: number, period: SchoolPeriod) => {
    setActiveCell({ day, periodId: period.id });
    const existing = slotMap.get(`${day}_${period.id}`);
    if (existing) {
      setSlotSubjectId(existing.subjectId);
      setSlotTeacherUserId(existing.teacherUserId || '');
      setSlotRoomNumber(existing.roomNumber || '');
    } else {
      setSlotSubjectId(classSubjects[0]?.subjectId || '');
      setSlotTeacherUserId('');
      setSlotRoomNumber('');
    }
    setConflictError(null);
    setSlotModalOpen(true);
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCell || !selectedClassId || !selectedSectionId || !currentYearId) return;
    setConflictError(null);

    try {
      await saveSlot.mutateAsync({
        academicYearId: currentYearId,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        dayOfWeek: activeCell.day,
        periodId: activeCell.periodId,
        subjectId: slotSubjectId,
        teacherUserId: slotTeacherUserId || null,
        roomNumber: slotRoomNumber || null,
        effectiveFrom: new Date().toISOString().split('T')[0],
      });
      setSlotModalOpen(false);
      refetchSlots();
    } catch (err: any) {
      setConflictError(
        err.response?.data?.message || err.message || 'Timetable slot conflict detected.'
      );
    }
  };

  const handleDeleteSlot = async (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t('academics.timetable.confirmDeleteSlot', 'Remove this period slot?'))) return;
    try {
      await deleteSlot.mutateAsync(slotId);
      refetchSlots();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPeriod.mutateAsync({
        name: periodName,
        periodNumber: periodType === 'TEACHING' ? Number(periodNumber) : null,
        startTime: periodStartTime,
        endTime: periodEndTime,
        type: periodType,
        displayOrder: periods.length + 1,
        isActive: true,
      });
      setPeriodModalOpen(false);
      setPeriodName('');
      refetchPeriods();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDeletePeriod = async (periodId: string) => {
    if (!window.confirm(t('academics.timetable.confirmDeletePeriod', 'Delete this bell period? Timetable slots attached to it will also be removed.'))) return;
    try {
      await deletePeriod.mutateAsync(periodId);
      refetchPeriods();
      refetchSlots();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="space-y-6">
      <AcademicsNav />

      {/* Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
            <CalendarRange className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              {t('academics.timetable.title', 'Class Timetable & Period Schedules')}
            </h2>
            <p className="text-xs text-zinc-500">
              {t('academics.timetable.desc', 'Weekly period grid with automatic conflict detection for teachers, rooms, and classes')}
            </p>
          </div>
        </div>

        <button
          onClick={() => setPeriodModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-all"
        >
          <Clock className="w-4 h-4" />
          <span>{t('academics.timetable.managePeriods', 'Manage Bell Periods')}</span>
        </button>
      </div>

      {/* Selectors */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 flex flex-wrap items-center gap-3 text-xs">
        <div>
          <label className="block text-[11px] font-bold text-zinc-500 mb-1">{t('common.academicYear', 'Academic Year')}</label>
          <select
            value={currentYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="px-3 py-1.5 border border-zinc-300 rounded-lg font-semibold bg-white"
          >
            {years.map((y: any) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-500 mb-1">{t('common.class', 'Class')} *</label>
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setSelectedSectionId('');
            }}
            className="px-3 py-1.5 border border-zinc-300 rounded-lg font-semibold bg-white"
          >
            <option value="">{t('common.selectClass', 'Select Class')}</option>
            {classes.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-500 mb-1">{t('common.section', 'Section')} *</label>
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            disabled={!selectedClassId}
            className="px-3 py-1.5 border border-zinc-300 rounded-lg font-semibold bg-white disabled:opacity-50"
          >
            <option value="">{t('common.selectSection', 'Select Section')}</option>
            {classSections.map((cs: any) => (
              <option key={cs.sectionId} value={cs.sectionId}>{cs.section?.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Timetable Grid */}
      {!selectedClassId || !selectedSectionId ? (
        <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center">
          <CalendarRange className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-700">
            {t('academics.timetable.selectClassSectionPrompt', 'Please select a Class and Section to view and edit its timetable.')}
          </p>
        </div>
      ) : periods.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center">
          <Clock className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-700">
            {t('academics.timetable.noPeriodsConfigured', 'No school periods configured yet.')}
          </p>
          <button
            onClick={() => setPeriodModalOpen(true)}
            className="mt-3 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{t('academics.timetable.addPeriod', 'Add First Period')}</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-32 border-r border-zinc-200">
                    {t('academics.timetable.timePeriod', 'Period / Time')}
                  </th>
                  {DAYS_OF_WEEK.map((d) => (
                    <th key={d.day} className="py-3 px-4 min-w-[150px] border-r border-zinc-200 text-center">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {periods.map((period) => {
                  const isRecess = period.type === 'RECESS';
                  const isAssembly = period.type === 'ASSEMBLY';

                  return (
                    <tr key={period.id} className={isRecess ? 'bg-amber-50/40' : isAssembly ? 'bg-sky-50/40' : ''}>
                      <td className="py-3 px-4 border-r border-zinc-200 bg-zinc-50/30">
                        <div className="font-bold text-zinc-900">{period.name}</div>
                        <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                          {period.startTime} - {period.endTime}
                        </div>
                        {period.type !== 'TEACHING' && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700 mt-1 inline-block">
                            {period.type}
                          </span>
                        )}
                      </td>

                      {DAYS_OF_WEEK.map((d) => {
                        const slotKey = `${d.day}_${period.id}`;
                        const slot = slotMap.get(slotKey);

                        if (isRecess || isAssembly) {
                          return (
                            <td key={d.day} className="py-3 px-4 border-r border-zinc-200 text-center text-zinc-400 italic">
                              {period.name}
                            </td>
                          );
                        }

                        return (
                          <td
                            key={d.day}
                            onClick={() => handleOpenSlotModal(d.day, period)}
                            className="py-2 px-3 border-r border-zinc-200 cursor-pointer hover:bg-purple-50/40 transition-colors group relative align-top"
                          >
                            {slot ? (
                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 relative shadow-2xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-purple-900 truncate">
                                    {slot.subject?.name || 'Subject'}
                                  </span>
                                  <button
                                    onClick={(e) => handleDeleteSlot(slot.id, e)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-600 rounded transition-opacity"
                                    title={t('common.delete', 'Delete Slot')}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="text-[11px] text-zinc-600 mt-0.5 flex items-center gap-1 truncate">
                                  <span>{slot.teacher ? `${slot.teacher.firstName} ${slot.teacher.lastName || ''}`.trim() : 'Unassigned'}</span>
                                </div>
                                {slot.roomNumber && (
                                  <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                                    Room: {slot.roomNumber}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="h-14 border border-dashed border-zinc-200 rounded-lg flex items-center justify-center text-zinc-300 group-hover:border-purple-300 group-hover:text-purple-600 transition-colors">
                                <Plus className="w-4 h-4" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Period Manager Modal */}
      {periodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
              <h3 className="text-sm font-bold text-zinc-900">
                {t('academics.timetable.bellPeriods', 'School Bell Periods Configuration')}
              </h3>
              <button onClick={() => setPeriodModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs max-h-[80vh] overflow-y-auto">
              {/* Existing Periods */}
              <div>
                <h4 className="font-bold text-zinc-700 mb-2">{t('academics.timetable.existingPeriods', 'Existing Periods')}</h4>
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden">
                  {periods.map((p) => (
                    <div key={p.id} className="p-3 flex items-center justify-between hover:bg-zinc-50">
                      <div>
                        <span className="font-bold text-zinc-900">{p.name}</span>
                        <span className="font-mono text-zinc-500 text-[11px] ml-2">({p.startTime} - {p.endTime})</span>
                        <span className="text-[10px] uppercase font-bold text-zinc-400 ml-2">[{p.type}]</span>
                      </div>
                      <button
                        onClick={() => handleDeletePeriod(p.id)}
                        className="p-1 text-zinc-400 hover:text-rose-600 rounded"
                        title={t('common.delete', 'Delete Period')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Period Form */}
              <form onSubmit={handleCreatePeriod} className="space-y-3 pt-4 border-t border-zinc-200">
                <h4 className="font-bold text-zinc-900">{t('academics.timetable.addNewPeriod', 'Add New Period')}</h4>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">{t('common.name', 'Period Name')} *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Period 1 / Recess"
                      value={periodName}
                      onChange={(e) => setPeriodName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Period #</label>
                    <input
                      type="number"
                      min="1"
                      value={periodNumber}
                      onChange={(e) => setPeriodNumber(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">{t('common.type', 'Type')} *</label>
                    <select
                      value={periodType}
                      onChange={(e: any) => setPeriodType(e.target.value)}
                      className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg bg-white"
                    >
                      <option value="TEACHING">Teaching Period</option>
                      <option value="RECESS">Recess / Break</option>
                      <option value="ASSEMBLY">Morning Assembly</option>
                      <option value="ZERO_PERIOD">Zero Period</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">{t('common.startTime', 'Start Time')} *</label>
                    <input
                      type="time"
                      required
                      value={periodStartTime}
                      onChange={(e) => setPeriodStartTime(e.target.value)}
                      className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">{t('common.endTime', 'End Time')} *</label>
                    <input
                      type="time"
                      required
                      value={periodEndTime}
                      onChange={(e) => setPeriodEndTime(e.target.value)}
                      className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={createPeriod.isPending}
                  className="w-full py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-sm mt-2"
                >
                  {t('academics.timetable.savePeriod', 'Add Period')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Slot Editor Modal with Conflict Display */}
      {slotModalOpen && activeCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
              <h3 className="text-sm font-bold text-zinc-900">
                {t('academics.timetable.assignSlot', 'Assign Timetable Slot')}
              </h3>
              <button onClick={() => setSlotModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="p-6 space-y-4 text-xs">
              {conflictError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-800 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">{t('academics.timetable.conflictDetected', 'Schedule Conflict Detected')}</div>
                    <div className="mt-0.5">{conflictError}</div>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-zinc-700 mb-1">{t('common.subject', 'Subject')} *</label>
                <select
                  required
                  value={slotSubjectId}
                  onChange={(e) => setSlotSubjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">{t('common.selectSubject', 'Select Subject')}</option>
                  {classSubjects.map((cs: any) => (
                    <option key={cs.subjectId} value={cs.subjectId}>
                      {cs.subject?.name} ({cs.subject?.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">{t('academics.assignments.teacher', 'Assigned Teacher')}</label>
                <select
                  value={slotTeacherUserId}
                  onChange={(e) => setSlotTeacherUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">{t('common.unassigned', '-- Unassigned Teacher --')}</option>
                  {teachers.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name || u.firstName} {u.last_name || u.lastName || ''} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">{t('academics.timetable.roomNumber', 'Room / Lab Number')}</label>
                <input
                  type="text"
                  placeholder="e.g. Room 102 / Physics Lab"
                  value={slotRoomNumber}
                  onChange={(e) => setSlotRoomNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setSlotModalOpen(false)}
                  className="px-4 py-2 border border-zinc-300 text-zinc-700 font-bold rounded-lg hover:bg-zinc-50"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saveSlot.isPending}
                  className="px-4 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50 shadow-sm"
                >
                  {t('academics.timetable.saveSlot', 'Save Slot')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableManager;
