import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  Award,
  Plus,
  Calendar,
  Settings,
  Clock,
  PenLine,
  GraduationCap,
  Lock,
  Globe,
  Trash2,
  Edit2,
  X,
  AlertCircle,
} from 'lucide-react';
import { AcademicsNav } from './AcademicsNav';
import {
  Exam,
  useExamsList,
  useExamDetail,
  useCreateExam,
  useUpdateExam,
  useDeleteExam,
  useSaveExamSubjects,
  useSaveExamSchedules,
  useFinalizeExam,
  usePublishExam,
  useUnpublishExam,
  useAcademicTerms,
  useGradeScales,
} from '../../../lib/api/academics';
import { useAcademicYears } from '../../../lib/api/academic-years';
import { useClasses, useClassSubjects } from '../../../lib/api/master-data';
import { useUsers } from '../../../lib/api/users';
import { useTenant } from '../../../core/tenancy/TenantContext';

export const ExamsView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { currentTenant } = useTenant();
  const schoolId = currentTenant?.schoolId || '';
  const { data: years = [] } = useAcademicYears(schoolId);
  const activeYear = years.find((y: any) => y.is_current || y.isCurrent) || years[0];
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const currentYearId = selectedYearId || activeYear?.id || '';

  const { data: terms = [] } = useAcademicTerms(currentYearId);
  const { data: classes = [] } = useClasses();
  const { data: gradeScales = [] } = useGradeScales();
  const { data: usersData } = useUsers(1, 200);
  const teachers = usersData?.items || [];

  const { data: exams = [], isLoading, refetch } = useExamsList({ academicYearId: currentYearId });

  const createExam = useCreateExam();
  const updateExam = useUpdateExam();
  const deleteExam = useDeleteExam();
  const saveSubjects = useSaveExamSubjects();
  const saveSchedules = useSaveExamSchedules();
  const finalizeExam = useFinalizeExam();
  const publishExam = usePublishExam();
  const unpublishExam = useUnpublishExam();

  // Create / Edit Modal
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [examName, setExamName] = useState('');
  const [examCode, setExamCode] = useState('');
  const [examType, setExamType] = useState<any>('TERM');
  const [termId, setTermId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [weightage, setWeightage] = useState('');
  const [gradeScaleId, setGradeScaleId] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Subject Config Modal
  const [subjectConfigModalOpen, setSubjectConfigModalOpen] = useState(false);
  const [currentConfigExamId, setCurrentConfigExamId] = useState<string>('');
  const { data: detailedExam, refetch: refetchDetailedExam } = useExamDetail(currentConfigExamId);
  const [selectedConfigClassId, setSelectedConfigClassId] = useState<string>('');

  const { data: currentClassSubjects = [], isLoading: isLoadingClassSubjects } = useClassSubjects({
    schoolId,
    classId: selectedConfigClassId,
  });
  const [subjectConfigs, setSubjectConfigs] = useState<Record<string, any>>({});

  // Effective subjects: ONLY active subjects mapped through ClassSubject for selected class.
  // If an exam already contains a historical ExamSubject that was previously configured
  // but its ClassSubject mapping was later archived/inactive, display it clearly as:
  // "Previously configured / mapping currently inactive" and preserve its data.
  // DO NOT allow arbitrary school subjects to become selectable.
  const availableSubjects = React.useMemo(() => {
    const activeMapped = (currentClassSubjects || [])
      .filter((cs: any) => cs.isActive !== false)
      .map((cs: any) => ({
        subjectId: cs.subjectId,
        name: cs.subject?.name || 'Unknown Subject',
        code: cs.subject?.code || '',
        type: cs.subject?.type || 'THEORY',
        isHistoricalInactive: false,
      }));

    const mappedSubjectIds = new Set(activeMapped.map((s: any) => s.subjectId));

    const existingExamSubs = (detailedExam?.examSubjects || [])
      .filter((es: any) => es.classId === selectedConfigClassId && !mappedSubjectIds.has(es.subjectId))
      .map((es: any) => ({
        subjectId: es.subjectId,
        name: es.subject?.name || 'Historical Subject',
        code: es.subject?.code || '',
        type: es.subject?.type || 'THEORY',
        isHistoricalInactive: true,
      }));

    return [...activeMapped, ...existingExamSubs];
  }, [currentClassSubjects, detailedExam, selectedConfigClassId]);

  // Schedule Modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleConfigs, setScheduleConfigs] = useState<Record<string, any>>({});

  // Unpublish Modal
  const [unpublishModalOpen, setUnpublishModalOpen] = useState(false);
  const [unpublishReason, setUnpublishReason] = useState('');
  const [unpublishExamId, setUnpublishExamId] = useState('');

  const openCreateModal = () => {
    setEditingExam(null);
    setExamName('');
    setExamCode('');
    setExamType('TERM');
    setTermId(terms[0]?.id || '');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setWeightage('100');
    setGradeScaleId(gradeScales[0]?.id || '');
    setSelectedClassIds(classes.map((c: any) => c.id));
    setErrorMsg(null);
    setExamModalOpen(true);
  };

  const openEditModal = (exam: Exam) => {
    setEditingExam(exam);
    setExamName(exam.name);
    setExamCode(exam.code);
    setExamType(exam.examType);
    setTermId(exam.termId || '');
    setStartDate(exam.startDate.split('T')[0]);
    setEndDate(exam.endDate.split('T')[0]);
    setWeightage(exam.weightagePercent ? String(exam.weightagePercent) : '');
    setGradeScaleId(exam.gradeScaleId || '');
    setSelectedClassIds(exam.examClasses?.map((ec) => ec.classId) || []);
    setErrorMsg(null);
    setExamModalOpen(true);
  };

  const handleExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (startDate > endDate) {
      setErrorMsg(t('academics.exams.dateError', 'Start date cannot be after end date.'));
      return;
    }

    try {
      if (editingExam) {
        await updateExam.mutateAsync({
          id: editingExam.id,
          data: {
            name: examName,
            code: examCode,
            examType,
            termId: termId || null,
            startDate,
            endDate,
            weightagePercent: weightage ? Number(weightage) : null,
            gradeScaleId: gradeScaleId || null,
            classIds: selectedClassIds,
          },
        });
      } else {
        await createExam.mutateAsync({
          academicYearId: currentYearId,
          termId: termId || null,
          name: examName,
          code: examCode,
          examType,
          startDate,
          endDate,
          weightagePercent: weightage ? Number(weightage) : null,
          gradeScaleId: gradeScaleId || null,
          classIds: selectedClassIds,
        });
      }
      setExamModalOpen(false);
      refetch();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Operation failed');
    }
  };

  // Open Subject Configuration
  const openSubjectConfig = (examId: string) => {
    setCurrentConfigExamId(examId);
    setSelectedConfigClassId('');
    setSubjectConfigModalOpen(true);
  };

  // When detailedExam loads or class changes, populate existing subjects
  React.useEffect(() => {
    if (detailedExam && detailedExam.examClasses && detailedExam.examClasses.length > 0) {
      const activeClassId = selectedConfigClassId || detailedExam.examClasses[0].classId;
      if (!selectedConfigClassId) {
        setSelectedConfigClassId(activeClassId);
      }

      const existingConfigs: Record<string, any> = {};

      // Seed defaults for all available subjects
      availableSubjects.forEach((sub: any) => {
        existingConfigs[sub.subjectId] = {
          maxMarks: 100,
          passMarks: 33,
          theoryMaxMarks: 80,
          practicalMaxMarks: 20,
          activityMaxMarks: 0,
          allowGrace: true,
          maxGraceMarks: 5,
        };
      });

      // Overlay any already saved examSubjects
      detailedExam.examSubjects?.forEach((es) => {
        if (es.classId === activeClassId) {
          existingConfigs[es.subjectId] = {
            maxMarks: Number(es.maxMarks),
            passMarks: Number(es.passMarks),
            theoryMaxMarks: es.theoryMaxMarks ? Number(es.theoryMaxMarks) : Number(es.maxMarks),
            practicalMaxMarks: es.practicalMaxMarks ? Number(es.practicalMaxMarks) : 0,
            activityMaxMarks: es.activityMaxMarks ? Number(es.activityMaxMarks) : 0,
            allowGrace: es.allowGrace,
            maxGraceMarks: es.maxGraceMarks ? Number(es.maxGraceMarks) : 5,
          };
        }
      });
      setSubjectConfigs(existingConfigs);
    }
  }, [detailedExam?.id, selectedConfigClassId, availableSubjects.map((s: any) => s.subjectId).join(',')]);

  const handleSaveSubjects = async () => {
    if (!detailedExam || !selectedConfigClassId) return;

    const validSubjectIds = new Set(availableSubjects.map((s: any) => s.subjectId));
    const subjectsToSave = Object.entries(subjectConfigs)
      .filter(([subjectId]) => validSubjectIds.has(subjectId))
      .map(([subjectId, cfg]) => ({
        classId: selectedConfigClassId,
        subjectId,
        maxMarks: Number(cfg.maxMarks || 100),
        passMarks: Number(cfg.passMarks || 33),
        theoryMaxMarks: Number(cfg.theoryMaxMarks || 0),
        practicalMaxMarks: Number(cfg.practicalMaxMarks || 0),
        activityMaxMarks: Number(cfg.activityMaxMarks || 0),
        allowGrace: Boolean(cfg.allowGrace),
        maxGraceMarks: cfg.allowGrace ? Number(cfg.maxGraceMarks || 5) : 0,
      }));

    if (subjectsToSave.length === 0) {
      alert(t('academics.exams.noSubjectsConfigured', 'Please configure marks for at least one subject.'));
      return;
    }

    for (const sub of subjectsToSave) {
      const componentSum = Math.round((sub.theoryMaxMarks + sub.practicalMaxMarks + sub.activityMaxMarks) * 100) / 100;
      const expectedMax = Math.round(sub.maxMarks * 100) / 100;
      if (componentSum !== expectedMax) {
        alert(
          t(
            'academics.exams.componentSumMismatch',
            `Component marks total (${componentSum}) must equal Maximum Marks (${expectedMax})`
          )
        );
        return;
      }
    }

    try {
      await saveSubjects.mutateAsync({
        examId: detailedExam.id,
        subjects: subjectsToSave,
      });
      alert(t('academics.exams.subjectsSaved', 'Subject marks configuration saved successfully.'));
      refetchDetailedExam();
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    }
  };

  // Open Schedule Modal
  const openScheduleModal = (examId: string) => {
    setCurrentConfigExamId(examId);
    setScheduleModalOpen(true);
  };

  React.useEffect(() => {
    if (detailedExam) {
      const existingSchedules: Record<string, any> = {};
      detailedExam.examSchedules?.forEach((sch) => {
        existingSchedules[`${sch.classId}_${sch.subjectId}`] = {
          examDate: sch.examDate.split('T')[0],
          startTime: sch.startTime,
          endTime: sch.endTime,
          roomNumber: sch.roomNumber || '',
          invigilatorUserId: sch.invigilatorUserId || '',
        };
      });
      setScheduleConfigs(existingSchedules);
    }
  }, [detailedExam]);

  const handleSaveSchedules = async () => {
    if (!detailedExam) return;

    const schedulesToSave: any[] = [];
    Object.entries(scheduleConfigs).forEach(([key, cfg]) => {
      const [classId, subjectId] = key.split('_');
      if (cfg.examDate && cfg.startTime && cfg.endTime) {
        schedulesToSave.push({
          classId,
          subjectId,
          examDate: cfg.examDate,
          startTime: cfg.startTime,
          endTime: cfg.endTime,
          roomNumber: cfg.roomNumber || null,
          invigilatorUserId: cfg.invigilatorUserId || null,
        });
      }
    });

    try {
      await saveSchedules.mutateAsync({
        examId: detailedExam.id,
        schedules: schedulesToSave,
      });
      alert(t('academics.exams.schedulesSaved', 'Exam timetable schedules saved successfully.'));
      refetchDetailedExam();
      refetch();
      setScheduleModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleFinalize = async (examId: string) => {
    if (!window.confirm(t('academics.exams.confirmFinalize', 'Finalize exam? Normal marks editing will be locked.'))) return;
    try {
      await finalizeExam.mutateAsync(examId);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handlePublish = async (examId: string) => {
    if (!window.confirm(t('academics.exams.confirmPublish', 'Publish results? Students and parents will be able to view their report cards.'))) return;
    try {
      await publishExam.mutateAsync(examId);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleUnpublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unpublishReason.trim()) return;
    try {
      await unpublishExam.mutateAsync({ examId: unpublishExamId, reason: unpublishReason });
      setUnpublishModalOpen(false);
      setUnpublishReason('');
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('academics.exams.confirmDelete', 'Delete this exam? All configured subjects and schedules will be permanently deleted.'))) return;
    try {
      await deleteExam.mutateAsync(id);
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
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              {t('academics.exams.title', 'Examinations & Assessments')}
            </h2>
            <p className="text-xs text-zinc-500">
              {t('academics.exams.desc', 'Schedule term exams, configure subjects, manage time slots, and publish results')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={currentYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="text-xs font-semibold px-3 py-2 border border-zinc-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {years.map((y: any) => (
              <option key={y.id} value={y.id}>
                {y.name} {y.is_current || y.isCurrent ? `(${t('common.active', 'Active')})` : ''}
              </option>
            ))}
          </select>

          <button
            onClick={openCreateModal}
            disabled={!currentYearId}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t('academics.exams.newExam', 'Create Exam')}</span>
          </button>
        </div>
      </div>

      {/* Exams Grid */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-zinc-400 text-sm">{t('common.loading', 'Loading exams...')}</div>
        ) : exams.length === 0 ? (
          <div className="p-12 text-center">
            <Award className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-700">
              {t('academics.exams.noExams', 'No examinations found for this academic year.')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {exams.map((exam) => (
              <div key={exam.id} className="p-5 hover:bg-zinc-50/60 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                      {exam.code}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                      {exam.examType}
                    </span>
                    <span
                      className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        exam.status === 'PUBLISHED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : exam.status === 'FINALIZED'
                          ? 'bg-blue-100 text-blue-800'
                          : exam.status === 'IN_PROGRESS'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {exam.status}
                    </span>
                    {exam.term && (
                      <span className="text-[11px] font-medium text-zinc-500">
                        • {exam.term.name}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-zinc-900">{exam.name}</h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      {new Date(exam.startDate).toLocaleDateString()} — {new Date(exam.endDate).toLocaleDateString()}
                    </span>
                    <span>
                      Classes: {exam.examClasses?.map((ec) => ec.class.name).join(', ') || 'None'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => openSubjectConfig(exam.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border border-zinc-300 rounded-lg hover:bg-zinc-50 text-zinc-700"
                    title={t('academics.exams.configSubjects', 'Configure Subjects & Marks')}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Subjects</span>
                  </button>

                  <button
                    onClick={() => openScheduleModal(exam.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border border-zinc-300 rounded-lg hover:bg-zinc-50 text-zinc-700"
                    title={t('academics.exams.scheduleTime', 'Exam Schedule Timetable')}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Schedule</span>
                  </button>

                  <Link
                    to={`/academics/marks?examId=${exam.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border border-zinc-300 rounded-lg hover:bg-zinc-50 text-emerald-700"
                  >
                    <PenLine className="w-3.5 h-3.5" />
                    <span>Marks</span>
                  </Link>

                  <Link
                    to={`/academics/results?examId=${exam.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border border-zinc-300 rounded-lg hover:bg-zinc-50 text-indigo-700"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Results</span>
                  </Link>

                  {/* Lifecycle Buttons */}
                  {exam.status !== 'FINALIZED' && exam.status !== 'PUBLISHED' && (
                    <button
                      onClick={() => handleFinalize(exam.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Finalize</span>
                    </button>
                  )}

                  {exam.status === 'FINALIZED' && (
                    <button
                      onClick={() => handlePublish(exam.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Publish</span>
                    </button>
                  )}

                  {exam.status === 'PUBLISHED' && (
                    <button
                      onClick={() => {
                        setUnpublishExamId(exam.id);
                        setUnpublishModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100"
                    >
                      <span>Unpublish</span>
                    </button>
                  )}

                  <button
                    onClick={() => openEditModal(exam)}
                    className="p-1.5 text-zinc-400 hover:text-emerald-700 rounded"
                    title={t('common.edit', 'Edit Exam')}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(exam.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-700 rounded"
                    title={t('common.delete', 'Delete Exam')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Exam Modal */}
      {examModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
              <h3 className="text-sm font-bold text-zinc-900">
                {editingExam ? t('academics.exams.editExam', 'Edit Exam') : t('academics.exams.newExam', 'Create Exam')}
              </h3>
              <button onClick={() => setExamModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExamSubmit} className="p-6 space-y-4 text-xs max-h-[85vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">{t('common.name', 'Exam Name')} *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mid-Term Examination 2026"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">{t('common.code', 'Exam Code')} *</label>
                  <input
                    type="text"
                    required
                    placeholder="MID2026"
                    value={examCode}
                    onChange={(e) => setExamCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">{t('common.type', 'Exam Type')} *</label>
                  <select
                    value={examType}
                    onChange={(e: any) => setExamType(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white"
                  >
                    <option value="TERM">Term Exam</option>
                    <option value="UNIT">Unit Test</option>
                    <option value="PRACTICAL">Practical Assessment</option>
                    <option value="FINAL">Annual / Final Exam</option>
                    <option value="CLASS_TEST">Class Test</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">{t('academics.terms.term', 'Academic Term')}</label>
                  <select
                    value={termId}
                    onChange={(e) => setTermId(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white"
                  >
                    <option value="">{t('common.none', '-- None / Full Year --')}</option>
                    {terms.map((term) => (
                      <option key={term.id} value={term.id}>{term.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">{t('common.startDate', 'Start Date')} *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">{t('common.endDate', 'End Date')} *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">{t('academics.exams.weightage', 'Weightage %')}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="100"
                    value={weightage}
                    onChange={(e) => setWeightage(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">{t('academics.exams.gradeScale', 'Grading Scale')}</label>
                  <select
                    value={gradeScaleId}
                    onChange={(e) => setGradeScaleId(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white"
                  >
                    <option value="">Default Scale</option>
                    {gradeScales.map((gs) => (
                      <option key={gs.id} value={gs.id}>{gs.name} {gs.isDefault ? '(Default)' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Class Selection Checkboxes */}
              <div>
                <label className="block font-bold text-zinc-700 mb-1.5">{t('academics.exams.participatingClasses', 'Target Classes')} *</label>
                <div className="grid grid-cols-3 gap-2 border border-zinc-200 p-3 rounded-lg max-h-36 overflow-y-auto">
                  {classes.map((c: any) => {
                    const isChecked = selectedClassIds.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClassIds([...selectedClassIds, c.id]);
                            } else {
                              setSelectedClassIds(selectedClassIds.filter((id) => id !== c.id));
                            }
                          }}
                          className="w-3.5 h-3.5 text-emerald-600 rounded"
                        />
                        <span className="font-semibold text-zinc-700">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setExamModalOpen(false)}
                  className="px-4 py-2 border border-zinc-300 text-zinc-700 font-bold rounded-lg hover:bg-zinc-50"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createExam.isPending || updateExam.isPending}
                  className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
                >
                  {editingExam ? t('common.saveChanges', 'Save Changes') : t('academics.exams.createExam', 'Create Exam')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject Configuration Modal */}
      {subjectConfigModalOpen && detailedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  {t('academics.exams.configSubjectsTitle', 'Configure Exam Subjects & Marks Scheme')}
                </h3>
                <p className="text-xs text-zinc-500">{detailedExam.name} ({detailedExam.code})</p>
              </div>
              <button onClick={() => setSubjectConfigModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Class Tabs */}
              <div className="flex items-center gap-1 border-b border-zinc-200 pb-2 overflow-x-auto">
                {detailedExam.examClasses?.map((ec) => (
                  <button
                    key={ec.classId}
                    type="button"
                    onClick={() => setSelectedConfigClassId(ec.classId)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                      selectedConfigClassId === ec.classId
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    {ec.class.name}
                  </button>
                ))}
              </div>

              {/* Subject Rows */}
              <div className="space-y-3">
                {isLoadingClassSubjects ? (
                  <div className="p-8 text-center text-zinc-400 text-xs">
                    {t('common.loading', 'Loading subjects...')}
                  </div>
                ) : availableSubjects.length === 0 ? (
                  <div className="p-8 text-center bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="text-sm font-medium text-zinc-700">
                      {t('academics.exams.noMappedSubjects', 'No subjects are mapped to this class yet.')}
                    </p>
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setSubjectConfigModalOpen(false);
                          navigate('/master-data?tab=academic&sub=class-subjects');
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        {t('academics.exams.manageClassSubjects', 'Manage Class Subjects')}
                      </button>
                    </div>
                  </div>
                ) : (
                  availableSubjects.map((sub: any) => {
                    const subId = sub.subjectId;
                    const isHistorical = sub.isHistoricalInactive;
                    const cfg = subjectConfigs[subId] || {
                      maxMarks: 100,
                      passMarks: 33,
                      theoryMaxMarks: 80,
                      practicalMaxMarks: 20,
                      activityMaxMarks: 0,
                      allowGrace: true,
                      maxGraceMarks: 5,
                    };

                    const updateCfg = (updates: any) => {
                      setSubjectConfigs({
                        ...subjectConfigs,
                        [subId]: { ...cfg, ...updates },
                      });
                    };

                    return (
                      <div
                        key={subId}
                        className={`p-4 border rounded-xl space-y-3 ${
                          isHistorical
                            ? 'border-amber-200 bg-amber-50/40'
                            : 'border-zinc-200 bg-zinc-50/40'
                        }`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-zinc-900">
                              {sub.name}
                            </span>
                            {sub.code ? (
                              <span className="text-zinc-500 font-mono text-xs">
                                ({sub.code})
                              </span>
                            ) : null}
                            {sub.type ? (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-200/70 text-zinc-700">
                                {sub.type}
                              </span>
                            ) : null}
                            {isHistorical ? (
                              <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                {t('academics.exams.historicalInactiveMapping', 'Previously configured / mapping currently inactive')}
                              </span>
                            ) : null}
                          </div>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cfg.allowGrace ?? true}
                              onChange={(e) => updateCfg({ allowGrace: e.target.checked })}
                              className="w-3.5 h-3.5 text-emerald-600 rounded"
                            />
                            <span className="font-semibold text-zinc-700 text-xs">
                              {t('academics.exams.allowGrace', 'Allow Grace Marks')}
                            </span>
                          </label>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase">Max Marks</label>
                            <input
                              type="number"
                              value={cfg.maxMarks}
                              onChange={(e) => updateCfg({ maxMarks: Number(e.target.value) })}
                              className="w-full px-2 py-1 border border-zinc-300 rounded font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase">Pass Marks</label>
                            <input
                              type="number"
                              value={cfg.passMarks}
                              onChange={(e) => updateCfg({ passMarks: Number(e.target.value) })}
                              className="w-full px-2 py-1 border border-zinc-300 rounded font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase">Theory</label>
                            <input
                              type="number"
                              value={cfg.theoryMaxMarks ?? 0}
                              onChange={(e) => updateCfg({ theoryMaxMarks: Number(e.target.value) })}
                              className="w-full px-2 py-1 border border-zinc-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase">Practical</label>
                            <input
                              type="number"
                              value={cfg.practicalMaxMarks ?? 0}
                              onChange={(e) => updateCfg({ practicalMaxMarks: Number(e.target.value) })}
                              className="w-full px-2 py-1 border border-zinc-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase">Activity</label>
                            <input
                              type="number"
                              value={cfg.activityMaxMarks ?? 0}
                              onChange={(e) => updateCfg({ activityMaxMarks: Number(e.target.value) })}
                              className="w-full px-2 py-1 border border-zinc-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase">Max Grace</label>
                            <input
                              type="number"
                              disabled={!cfg.allowGrace}
                              value={cfg.maxGraceMarks ?? 5}
                              onChange={(e) => updateCfg({ maxGraceMarks: Number(e.target.value) })}
                              className="w-full px-2 py-1 border border-zinc-300 rounded disabled:opacity-40"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setSubjectConfigModalOpen(false)}
                  className="px-4 py-2 border border-zinc-300 text-zinc-700 font-bold rounded-lg hover:bg-zinc-50"
                >
                  {t('common.close', 'Close')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveSubjects}
                  disabled={saveSubjects.isPending}
                  className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
                >
                  {t('common.saveChanges', 'Save Subjects')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleModalOpen && detailedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  {t('academics.exams.scheduleExamTimetable', 'Schedule Examination Timetable')}
                </h3>
                <p className="text-xs text-zinc-500">{detailedExam.name}</p>
              </div>
              <button onClick={() => setScheduleModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="space-y-3">
                {detailedExam.examSubjects?.map((es) => {
                  const key = `${es.classId}_${es.subjectId}`;
                  const cfg = scheduleConfigs[key] || {
                    examDate: detailedExam.startDate.split('T')[0],
                    startTime: '09:00',
                    endTime: '12:00',
                    roomNumber: '',
                    invigilatorUserId: '',
                  };

                  const updateCfg = (updates: any) => {
                    setScheduleConfigs({
                      ...scheduleConfigs,
                      [key]: { ...cfg, ...updates },
                    });
                  };

                  return (
                    <div key={key} className="p-3 border border-zinc-200 rounded-xl bg-zinc-50/40 space-y-2">
                      <div className="font-bold text-zinc-900">
                        {es.class?.name} • {es.subject?.name}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase">Exam Date</label>
                          <input
                            type="date"
                            value={cfg.examDate}
                            onChange={(e) => updateCfg({ examDate: e.target.value })}
                            className="w-full px-2 py-1 border border-zinc-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase">Start Time</label>
                          <input
                            type="time"
                            value={cfg.startTime}
                            onChange={(e) => updateCfg({ startTime: e.target.value })}
                            className="w-full px-2 py-1 border border-zinc-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase">End Time</label>
                          <input
                            type="time"
                            value={cfg.endTime}
                            onChange={(e) => updateCfg({ endTime: e.target.value })}
                            className="w-full px-2 py-1 border border-zinc-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase">Room</label>
                          <input
                            type="text"
                            placeholder="Room 101"
                            value={cfg.roomNumber}
                            onChange={(e) => updateCfg({ roomNumber: e.target.value })}
                            className="w-full px-2 py-1 border border-zinc-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase">Invigilator</label>
                          <select
                            value={cfg.invigilatorUserId}
                            onChange={(e) => updateCfg({ invigilatorUserId: e.target.value })}
                            className="w-full px-2 py-1 border border-zinc-300 rounded bg-white"
                          >
                            <option value="">-- None --</option>
                            {teachers.map((u: any) => (
                              <option key={u.id} value={u.id}>{u.first_name || u.firstName} {u.last_name || u.lastName || ''}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-4 py-2 border border-zinc-300 text-zinc-700 font-bold rounded-lg hover:bg-zinc-50"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveSchedules}
                  disabled={saveSchedules.isPending}
                  className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
                >
                  {t('academics.exams.saveSchedules', 'Save Schedules')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unpublish Modal */}
      {unpublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
              <h3 className="text-sm font-bold text-zinc-900">
                {t('academics.exams.unpublishExam', 'Unpublish Exam Results')}
              </h3>
              <button onClick={() => setUnpublishModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUnpublishSubmit} className="p-6 space-y-4 text-xs">
              <p className="text-zinc-600">
                {t('academics.exams.unpublishWarning', 'Unpublishing removes public access to report cards and returns the exam to Finalized status. Please state the reason for audit compliance.')}
              </p>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">
                  {t('academics.exams.reason', 'Reason for Unpublishing')} *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Moderation adjustment requested for Mathematics Section A"
                  value={unpublishReason}
                  onChange={(e) => setUnpublishReason(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setUnpublishModalOpen(false)}
                  className="px-4 py-2 border border-zinc-300 text-zinc-700 font-bold rounded-lg hover:bg-zinc-50"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={unpublishExam.isPending}
                  className="px-4 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 disabled:opacity-50 shadow-sm"
                >
                  {t('academics.exams.confirmUnpublish', 'Unpublish Exam')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamsView;
