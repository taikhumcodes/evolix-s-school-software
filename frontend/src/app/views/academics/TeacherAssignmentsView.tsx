import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserCheck,
  BookOpen,
  Plus,
  Trash2,
  AlertCircle,
  X,
  GraduationCap,
} from 'lucide-react';
import { AcademicsNav } from './AcademicsNav';
import {
  useClassTeacherAssignments,
  useSubjectTeacherAssignments,
  useAssignClassTeacher,
  useRemoveClassTeacher,
  useAssignSubjectTeacher,
  useRemoveSubjectTeacher,
} from '../../../lib/api/academics';
import { useAcademicYears } from '../../../lib/api/academic-years';
import {
  useClasses,
  useClassSections,
  useClassSubjects,
} from '../../../lib/api/master-data';
import { useUsers } from '../../../lib/api/users';
import { useTenant } from '../../../core/tenancy/TenantContext';

export const TeacherAssignmentsView: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'CLASS' | 'SUBJECT'>('CLASS');

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

  // Users for teacher dropdown
  const { data: usersData } = useUsers(1, 200);
  const teachers = usersData?.items || [];

  // Assignments queries
  const {
    data: classTeachers = [],
    isLoading: loadingClassTeachers,
    refetch: refetchClassTeachers,
  } = useClassTeacherAssignments(currentYearId, selectedClassId || undefined);

  const {
    data: subjectTeachers = [],
    isLoading: loadingSubjectTeachers,
    refetch: refetchSubjectTeachers,
  } = useSubjectTeacherAssignments(
    currentYearId,
    selectedClassId || undefined,
    selectedSectionId || undefined
  );

  const assignClassTeacher = useAssignClassTeacher();
  const removeClassTeacher = useRemoveClassTeacher();
  const assignSubjectTeacher = useAssignSubjectTeacher();
  const removeSubjectTeacher = useRemoveSubjectTeacher();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalClassId, setModalClassId] = useState('');
  const [modalSectionId, setModalSectionId] = useState('');
  const [modalSubjectId, setModalSubjectId] = useState('');
  const [modalTeacherUserId, setModalTeacherUserId] = useState('');
  const [isPrimary, setIsPrimary] = useState(true);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const modalClassSections = useClassSections({ schoolId, classId: modalClassId }).data || [];
  const modalClassSubjects = useClassSubjects({ schoolId, classId: modalClassId }).data || [];

  const handleOpenAssignModal = () => {
    setModalClassId(selectedClassId || (classes[0]?.id ?? ''));
    setModalSectionId(selectedSectionId || '');
    setModalSubjectId('');
    setModalTeacherUserId(teachers[0]?.id ?? '');
    setIsPrimary(true);
    setNotes('');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!modalClassId || !modalSectionId || !modalTeacherUserId) {
      setErrorMsg(t('academics.assignments.allFieldsRequired', 'Please fill in all required fields.'));
      return;
    }

    try {
      if (activeTab === 'CLASS') {
        await assignClassTeacher.mutateAsync({
          academicYearId: currentYearId,
          classId: modalClassId,
          sectionId: modalSectionId,
          teacherUserId: modalTeacherUserId,
          isPrimary,
          notes,
        });
        refetchClassTeachers();
      } else {
        if (!modalSubjectId) {
          setErrorMsg(t('academics.assignments.subjectRequired', 'Please select a subject.'));
          return;
        }
        await assignSubjectTeacher.mutateAsync({
          academicYearId: currentYearId,
          classId: modalClassId,
          sectionId: modalSectionId,
          subjectId: modalSubjectId,
          teacherUserId: modalTeacherUserId,
          isPrimary,
          notes,
        });
        refetchSubjectTeachers();
      }
      setModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Assignment failed');
    }
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm(t('academics.assignments.confirmRemove', 'Remove this teacher assignment?'))) {
      return;
    }
    try {
      if (activeTab === 'CLASS') {
        await removeClassTeacher.mutateAsync(id);
        refetchClassTeachers();
      } else {
        await removeSubjectTeacher.mutateAsync(id);
        refetchSubjectTeachers();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="space-y-6">
      <AcademicsNav />

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              {t('academics.assignments.title', 'Teacher Class & Subject Assignments')}
            </h2>
            <p className="text-xs text-zinc-500">
              {t('academics.assignments.desc', 'Map educators to specific classrooms, sections, and curriculum subjects')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('CLASS')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeTab === 'CLASS'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {t('academics.assignments.classTeachers', 'Class Teachers')}
            </button>
            <button
              onClick={() => setActiveTab('SUBJECT')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeTab === 'SUBJECT'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {t('academics.assignments.subjectTeachers', 'Subject Teachers')}
            </button>
          </div>

          <button
            onClick={handleOpenAssignModal}
            disabled={!currentYearId}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t('academics.assignments.assignTeacher', 'Assign Teacher')}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
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
          <label className="block text-[11px] font-bold text-zinc-500 mb-1">{t('common.class', 'Filter Class')}</label>
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setSelectedSectionId('');
            }}
            className="px-3 py-1.5 border border-zinc-300 rounded-lg font-semibold bg-white"
          >
            <option value="">{t('common.allClasses', 'All Classes')}</option>
            {classes.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {activeTab === 'SUBJECT' && selectedClassId && (
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 mb-1">{t('common.section', 'Filter Section')}</label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="px-3 py-1.5 border border-zinc-300 rounded-lg font-semibold bg-white"
            >
              <option value="">{t('common.allSections', 'All Sections')}</option>
              {classSections.map((cs: any) => (
                <option key={cs.sectionId} value={cs.sectionId}>
                  {cs.section?.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Assignment Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {activeTab === 'CLASS' ? (
          loadingClassTeachers ? (
            <div className="p-8 text-center text-zinc-400 text-sm">{t('common.loading', 'Loading class teachers...')}</div>
          ) : classTeachers.length === 0 ? (
            <div className="p-12 text-center">
              <GraduationCap className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-zinc-700">{t('academics.assignments.noClassTeachers', 'No class teacher assignments found.')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">{t('common.class', 'Class')}</th>
                    <th className="py-3 px-4">{t('common.section', 'Section')}</th>
                    <th className="py-3 px-4">{t('academics.assignments.teacher', 'Class Teacher')}</th>
                    <th className="py-3 px-4">{t('common.email', 'Email')}</th>
                    <th className="py-3 px-4">{t('academics.assignments.isPrimary', 'Primary')}</th>
                    <th className="py-3 px-4">{t('common.notes', 'Notes')}</th>
                    <th className="py-3 px-4 text-right">{t('common.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {classTeachers.map((a) => (
                    <tr key={a.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-zinc-900">{a.class?.name}</td>
                      <td className="py-3 px-4 font-bold text-zinc-700">{a.section?.name}</td>
                      <td className="py-3 px-4 font-bold text-emerald-700">
                        {a.teacher ? `${a.teacher.firstName} ${a.teacher.lastName || ''}`.trim() : '—'}
                      </td>
                      <td className="py-3 px-4 text-zinc-500 font-mono">{a.teacher?.email}</td>
                      <td className="py-3 px-4">
                        {a.isPrimary ? (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {t('common.yes', 'Yes')}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                            {t('common.no', 'No')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-zinc-500">{a.notes || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRemove(a.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-700 hover:bg-rose-50 rounded"
                          title={t('common.delete', 'Remove')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          loadingSubjectTeachers ? (
            <div className="p-8 text-center text-zinc-400 text-sm">{t('common.loading', 'Loading subject teachers...')}</div>
          ) : subjectTeachers.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-zinc-700">{t('academics.assignments.noSubjectTeachers', 'No subject teacher assignments found.')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">{t('common.class', 'Class')}</th>
                    <th className="py-3 px-4">{t('common.section', 'Section')}</th>
                    <th className="py-3 px-4">{t('common.subject', 'Subject')}</th>
                    <th className="py-3 px-4">{t('academics.assignments.teacher', 'Subject Teacher')}</th>
                    <th className="py-3 px-4">{t('common.email', 'Email')}</th>
                    <th className="py-3 px-4">{t('academics.assignments.isPrimary', 'Primary')}</th>
                    <th className="py-3 px-4 text-right">{t('common.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {subjectTeachers.map((a) => (
                    <tr key={a.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-zinc-900">{a.class?.name}</td>
                      <td className="py-3 px-4 font-bold text-zinc-700">{a.section?.name}</td>
                      <td className="py-3 px-4 font-semibold text-zinc-900">
                        {a.subject?.name} <span className="text-zinc-400 font-mono text-[10px]">({a.subject?.code})</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-700">
                        {a.teacher ? `${a.teacher.firstName} ${a.teacher.lastName || ''}`.trim() : '—'}
                      </td>
                      <td className="py-3 px-4 text-zinc-500 font-mono">{a.teacher?.email}</td>
                      <td className="py-3 px-4">
                        {a.isPrimary ? (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {t('common.yes', 'Yes')}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                            {t('common.no', 'No')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRemove(a.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-700 hover:bg-rose-50 rounded"
                          title={t('common.delete', 'Remove')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Assign Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
              <h3 className="text-sm font-bold text-zinc-900">
                {activeTab === 'CLASS'
                  ? t('academics.assignments.assignClassTeacher', 'Assign Class Teacher')
                  : t('academics.assignments.assignSubjectTeacher', 'Assign Subject Teacher')}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-zinc-700 mb-1">{t('common.class', 'Class')} *</label>
                <select
                  required
                  value={modalClassId}
                  onChange={(e) => {
                    setModalClassId(e.target.value);
                    setModalSectionId('');
                    setModalSubjectId('');
                  }}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="">{t('common.selectClass', 'Select Class')}</option>
                  {classes.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">{t('common.section', 'Section')} *</label>
                <select
                  required
                  value={modalSectionId}
                  onChange={(e) => setModalSectionId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="">{t('common.selectSection', 'Select Section')}</option>
                  {modalClassSections.map((cs: any) => (
                    <option key={cs.sectionId} value={cs.sectionId}>{cs.section?.name}</option>
                  ))}
                </select>
              </div>

              {activeTab === 'SUBJECT' && (
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">{t('common.subject', 'Subject')} *</label>
                  <select
                    required
                    value={modalSubjectId}
                    onChange={(e) => setModalSubjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">{t('common.selectSubject', 'Select Subject')}</option>
                    {modalClassSubjects.map((s: any) => (
                      <option key={s.subjectId} value={s.subjectId}>
                        {s.subject?.name} ({s.subject?.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-zinc-700 mb-1">{t('academics.assignments.teacher', 'Teacher')} *</label>
                <select
                  required
                  value={modalTeacherUserId}
                  onChange={(e) => setModalTeacherUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="">{t('common.selectTeacher', 'Select Teacher')}</option>
                  {teachers.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name || u.firstName} {u.last_name || u.lastName || ''} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="primaryAssign"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500"
                />
                <label htmlFor="primaryAssign" className="font-bold text-zinc-700 cursor-pointer">
                  {t('academics.assignments.markAsPrimary', 'Mark as Primary Teacher')}
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-zinc-300 text-zinc-700 font-bold rounded-lg hover:bg-zinc-50"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={assignClassTeacher.isPending || assignSubjectTeacher.isPending}
                  className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
                >
                  {t('academics.assignments.confirmAssignment', 'Assign Teacher')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAssignmentsView;
