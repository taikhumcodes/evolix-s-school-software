import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpenCheck,
  Plus,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  X,
  AlertCircle,
} from 'lucide-react';
import { AcademicsNav } from './AcademicsNav';
import {
  Homework,
  useHomeworkList,
  useCreateHomework,
  useUpdateHomework,
  useDeleteHomework,
} from '../../../lib/api/academics';
import { useAcademicYears } from '../../../lib/api/academic-years';
import {
  useClasses,
  useClassSections,
  useClassSubjects,
} from '../../../lib/api/master-data';
import { useTenant } from '../../../core/tenancy/TenantContext';

export const HomeworkView: React.FC = () => {
  const { t } = useTranslation();

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

  const {
    data: homeworkList = [],
    isLoading,
    refetch,
  } = useHomeworkList({
    academicYearId: currentYearId,
    classId: selectedClassId || undefined,
    sectionId: selectedSectionId || undefined,
  });

  const createHomework = useCreateHomework();
  const updateHomework = useUpdateHomework();
  const deleteHomework = useDeleteHomework();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
  const [modalClassId, setModalClassId] = useState('');
  const [modalSectionId, setModalSectionId] = useState('');
  const [modalSubjectId, setModalSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedDate, setAssignedDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [allowLate, setAllowLate] = useState(false);
  const [maxPoints, setMaxPoints] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const modalSections = useClassSections({ schoolId, classId: modalClassId }).data || [];
  const modalSubjects = useClassSubjects({ schoolId, classId: modalClassId }).data || [];

  const openCreateModal = () => {
    setEditingHomework(null);
    setModalClassId(selectedClassId || classes[0]?.id || '');
    setModalSectionId(selectedSectionId || '');
    setModalSubjectId('');
    setTitle('');
    setDescription('');
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setAssignedDate(today);
    setDueDate(tomorrow);
    setAllowLate(false);
    setMaxPoints('');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (hw: Homework) => {
    setEditingHomework(hw);
    setModalClassId(hw.classId);
    setModalSectionId(hw.sectionId || '');
    setModalSubjectId(hw.subjectId);
    setTitle(hw.title);
    setDescription(hw.description);
    setAssignedDate(hw.assignedDate.split('T')[0]);
    setDueDate(hw.dueDate.split('T')[0]);
    setAllowLate(hw.allowLateSubmission);
    setMaxPoints(hw.maxPoints ? String(hw.maxPoints) : '');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (assignedDate > dueDate) {
      setErrorMsg(t('academics.homework.dateOrderError', 'Assigned date cannot be after due date.'));
      return;
    }

    try {
      if (editingHomework) {
        await updateHomework.mutateAsync({
          id: editingHomework.id,
          data: {
            title,
            description,
            assignedDate,
            dueDate,
            allowLateSubmission: allowLate,
            maxPoints: maxPoints ? Number(maxPoints) : null,
          },
        });
      } else {
        await createHomework.mutateAsync({
          academicYearId: currentYearId,
          classId: modalClassId,
          sectionId: modalSectionId || null,
          subjectId: modalSubjectId,
          title,
          description,
          assignedDate,
          dueDate,
          allowLateSubmission: allowLate,
          maxPoints: maxPoints ? Number(maxPoints) : null,
        });
      }
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to save homework');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('academics.homework.confirmDelete', 'Delete this homework assignment?'))) return;
    try {
      await deleteHomework.mutateAsync(id);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="space-y-6">
      <AcademicsNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
            <BookOpenCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              {t('academics.homework.title', 'Homework & Assignments')}
            </h2>
            <p className="text-xs text-zinc-500">
              {t('academics.homework.desc', 'Assign curriculum homework, manage due dates, and track student submissions')}
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          disabled={!currentYearId}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{t('academics.homework.createHomework', 'Post Homework')}</span>
        </button>
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

        {selectedClassId && (
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 mb-1">{t('common.section', 'Filter Section')}</label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="px-3 py-1.5 border border-zinc-300 rounded-lg font-semibold bg-white"
            >
              <option value="">{t('common.allSections', 'All Sections')}</option>
              {classSections.map((cs: any) => (
                <option key={cs.sectionId} value={cs.sectionId}>{cs.section?.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Homework List */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-zinc-400 text-sm">{t('common.loading', 'Loading assignments...')}</div>
        ) : homeworkList.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpenCheck className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-700">
              {t('academics.homework.noHomework', 'No homework assignments posted for the selected filters.')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {homeworkList.map((hw) => {
              const isPastDue = new Date(hw.dueDate) < new Date();
              return (
                <div key={hw.id} className="p-5 hover:bg-zinc-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
                        {hw.class?.name} {hw.section ? `• ${hw.section.name}` : ''}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {hw.subject?.name}
                      </span>
                      {hw.maxPoints && (
                        <span className="text-[11px] font-semibold text-zinc-500">
                          {hw.maxPoints} pts
                        </span>
                      )}
                      {isPastDue && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                          {t('academics.homework.pastDue', 'Past Due')}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-zinc-900">{hw.title}</h3>
                    <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed whitespace-pre-wrap">
                      {hw.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-zinc-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Assigned: {new Date(hw.assignedDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-zinc-600">
                        <Clock className="w-3.5 h-3.5" />
                        Due: {new Date(hw.dueDate).toLocaleDateString()}
                      </span>
                      {hw.createdByUser && (
                        <span>By: {hw.createdByUser.firstName} {hw.createdByUser.lastName || ''}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => openEditModal(hw)}
                      className="p-2 text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                      title={t('common.edit', 'Edit')}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(hw.id)}
                      className="p-2 text-zinc-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                      title={t('common.delete', 'Delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
              <h3 className="text-sm font-bold text-zinc-900">
                {editingHomework
                  ? t('academics.homework.editHomework', 'Edit Homework Assignment')
                  : t('academics.homework.newHomework', 'Create Homework Assignment')}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[85vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {!editingHomework && (
                <div className="grid grid-cols-3 gap-3">
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
                      className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg bg-white"
                    >
                      <option value="">{t('common.selectClass', 'Select Class')}</option>
                      {classes.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">{t('common.section', 'Section')}</label>
                    <select
                      value={modalSectionId}
                      onChange={(e) => setModalSectionId(e.target.value)}
                      className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg bg-white"
                    >
                      <option value="">{t('common.allSections', 'All Sections')}</option>
                      {modalSections.map((cs: any) => (
                        <option key={cs.sectionId} value={cs.sectionId}>{cs.section?.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">{t('common.subject', 'Subject')} *</label>
                    <select
                      required
                      value={modalSubjectId}
                      onChange={(e) => setModalSubjectId(e.target.value)}
                      className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg bg-white"
                    >
                      <option value="">{t('common.selectSubject', 'Select Subject')}</option>
                      {modalSubjects.map((s: any) => (
                        <option key={s.subjectId} value={s.subjectId}>{s.subject?.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-zinc-700 mb-1">{t('common.title', 'Assignment Title')} *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4 Exercise 4.2 Questions 1-10"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">{t('common.description', 'Instructions & Details')} *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide complete guidelines, steps, or book references for students..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">{t('academics.homework.assignedDate', 'Assigned Date')} *</label>
                  <input
                    type="date"
                    required
                    value={assignedDate}
                    onChange={(e) => setAssignedDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">{t('academics.homework.dueDate', 'Due Date')} *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">{t('academics.homework.maxPoints', 'Max Points')}</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="100"
                    value={maxPoints}
                    onChange={(e) => setMaxPoints(e.target.value)}
                    className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="allowLate"
                  checked={allowLate}
                  onChange={(e) => setAllowLate(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500"
                />
                <label htmlFor="allowLate" className="font-bold text-zinc-700 cursor-pointer">
                  {t('academics.homework.allowLateSubmission', 'Allow Late Submissions after Due Date')}
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
                  disabled={createHomework.isPending || updateHomework.isPending}
                  className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
                >
                  {editingHomework ? t('common.saveChanges', 'Save Changes') : t('academics.homework.postHomework', 'Post Homework')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeworkView;
