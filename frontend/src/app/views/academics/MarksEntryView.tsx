import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  PenLine,
  Save,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  Lock,
  Edit3,
  X,
} from 'lucide-react';
import { AcademicsNav } from './AcademicsNav';
import {
  useExamsList,
  useMarksRegister,
  useSaveMarksRegister,
  useModerateMark,
} from '../../../lib/api/academics';
import { useClasses, useClassSections, useClassSubjects } from '../../../lib/api/master-data';
import { useAuth } from '../../../core/auth/AuthContext';
import { useTenant } from '../../../core/tenancy/TenantContext';

export const MarksEntryView: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const { currentTenant } = useTenant();
  const schoolId = currentTenant?.schoolId || '';
  const canModerate = hasPermission('marks.moderate');

  // Selectors
  const { data: exams = [] } = useExamsList();
  const [selectedExamId, setSelectedExamId] = useState<string>(searchParams.get('examId') || '');
  const currentExam = exams.find((e) => e.id === selectedExamId) || exams[0];

  const { data: classes = [] } = useClasses();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const { data: classSections = [] } = useClassSections({ schoolId, classId: selectedClassId });
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const { data: classSubjects = [] } = useClassSubjects({ schoolId, classId: selectedClassId });
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Register Query
  const {
    data: registerData,
    isLoading: loadingRegister,
    refetch: refetchRegister,
  } = useMarksRegister({
    examId: selectedExamId || currentExam?.id,
    classId: selectedClassId,
    sectionId: selectedSectionId || undefined,
    subjectId: selectedSubjectId,
  });

  const saveMarks = useSaveMarksRegister();
  const moderateMark = useModerateMark();

  // Local rows state
  const [rows, setRows] = useState<any[]>([]);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Moderation modal
  const [modModalOpen, setModModalOpen] = useState(false);
  const [modStudent, setModStudent] = useState<any>(null);
  const [modRawTheory, setModRawTheory] = useState('');
  const [modGrace, setModGrace] = useState('');
  const [modReason, setModReason] = useState('');

  // Synchronize rows when registerData loads
  useEffect(() => {
    if (registerData && registerData.rows) {
      setRows(
        registerData.rows.map((r) => ({
          studentId: r.studentId,
          studentName: r.studentName,
          admissionNumber: r.admissionNumber,
          rollNumber: r.rollNumber,
          status: r.status || 'PRESENT',
          rawTheoryMarks: r.rawTheoryMarks !== null && r.rawTheoryMarks !== undefined ? String(r.rawTheoryMarks) : '',
          rawPracticalMarks: r.rawPracticalMarks !== null && r.rawPracticalMarks !== undefined ? String(r.rawPracticalMarks) : '',
          rawActivityMarks: r.rawActivityMarks !== null && r.rawActivityMarks !== undefined ? String(r.rawActivityMarks) : '',
          graceMarks: r.graceMarks !== null && r.graceMarks !== undefined ? String(r.graceMarks) : '0',
          finalMarks: r.finalMarks,
          isPassed: r.isPassed,
          grade: r.grade,
          remarks: r.remarks || '',
          version: r.version,
        }))
      );
      setConflictError(null);
    }
  }, [registerData]);

  // Set default exam / class / subject
  useEffect(() => {
    if (!selectedExamId && currentExam) {
      setSelectedExamId(currentExam.id);
    }
  }, [currentExam, selectedExamId]);

  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  useEffect(() => {
    if (classSubjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(classSubjects[0].subjectId);
    }
  }, [classSubjects, selectedSubjectId]);

  const maxMarks = registerData?.config?.maxMarks ?? 100;
  const passMarks = registerData?.config?.passMarks ?? 33;
  const isExamLocked = registerData?.exam?.isLocked ?? false;

  const updateRow = (index: number, updates: any) => {
    const updated = [...rows];
    const currentRow = { ...updated[index], ...updates };

    // Auto calculate final marks & pass status locally
    if (currentRow.status === 'PRESENT') {
      const theory = parseFloat(currentRow.rawTheoryMarks) || 0;
      const practical = parseFloat(currentRow.rawPracticalMarks) || 0;
      const activity = parseFloat(currentRow.rawActivityMarks) || 0;
      const grace = parseFloat(currentRow.graceMarks) || 0;
      const total = Math.min(maxMarks, theory + practical + activity + grace);
      currentRow.finalMarks = total;
      currentRow.isPassed = total >= passMarks;
    } else if (currentRow.status === 'ABSENT') {
      currentRow.finalMarks = null;
      currentRow.isPassed = false;
      currentRow.rawTheoryMarks = '';
      currentRow.rawPracticalMarks = '';
      currentRow.rawActivityMarks = '';
    } else if (currentRow.status === 'EXEMPT') {
      currentRow.finalMarks = null;
      currentRow.isPassed = true;
      currentRow.rawTheoryMarks = '';
      currentRow.rawPracticalMarks = '';
      currentRow.rawActivityMarks = '';
    }

    updated[index] = currentRow;
    setRows(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, field: string) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.querySelector<HTMLInputElement>(
        `input[data-row="${rowIndex + 1}"][data-field="${field}"]`
      );
      if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.querySelector<HTMLInputElement>(
        `input[data-row="${rowIndex - 1}"][data-field="${field}"]`
      );
      if (prevInput) prevInput.focus();
    }
  };

  const handleSaveRegister = async () => {
    setConflictError(null);
    setSuccessMsg(null);

    const payload = {
      examId: selectedExamId || currentExam.id,
      classId: selectedClassId,
      sectionId: selectedSectionId || undefined,
      subjectId: selectedSubjectId,
      marks: rows.map((r) => ({
        studentId: r.studentId,
        status: r.status,
        rawTheoryMarks: r.status === 'PRESENT' && r.rawTheoryMarks !== '' ? Number(r.rawTheoryMarks) : null,
        rawPracticalMarks: r.status === 'PRESENT' && r.rawPracticalMarks !== '' ? Number(r.rawPracticalMarks) : null,
        rawActivityMarks: r.status === 'PRESENT' && r.rawActivityMarks !== '' ? Number(r.rawActivityMarks) : null,
        graceMarks: r.status === 'PRESENT' && r.graceMarks !== '' ? Number(r.graceMarks) : 0,
        remarks: r.remarks || null,
        version: r.version,
      })),
    };

    try {
      await saveMarks.mutateAsync(payload);
      setSuccessMsg(t('academics.marks.savedSuccess', 'Marks register saved successfully.'));
      refetchRegister();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      if (err.response?.status === 409 || err.response?.data?.code === 'STALE_MARKS_REGISTER') {
        setConflictError(
          t(
            'academics.marks.staleConflictAlert',
            'Conflict: Another user has updated this marks register. Please refresh to load the newest version before making further edits.'
          )
        );
      } else {
        setConflictError(err.response?.data?.message || err.message || 'Failed to save marks');
      }
    }
  };

  const openModerationModal = (student: any) => {
    setModStudent(student);
    setModRawTheory(student.rawTheoryMarks ?? '');
    setModGrace(student.graceMarks ?? '0');
    setModReason('');
    setModModalOpen(true);
  };

  const handleModerationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modStudent || !modReason.trim()) return;

    try {
      await moderateMark.mutateAsync({
        examId: selectedExamId || currentExam.id,
        studentId: modStudent.studentId,
        subjectId: selectedSubjectId,
        rawTheoryMarks: modRawTheory !== '' ? Number(modRawTheory) : undefined,
        graceMarks: modGrace !== '' ? Number(modGrace) : undefined,
        reason: modReason,
      });
      setModModalOpen(false);
      refetchRegister();
      alert(t('academics.marks.moderationSuccess', 'Mark adjustment recorded in audit log and updated.'));
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
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <PenLine className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              {t('academics.marks.title', 'Marks Entry Register')}
            </h2>
            <p className="text-xs text-zinc-500">
              {t('academics.marks.desc', 'High-speed keyboard register with absent/exempt toggles and concurrency protection')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isExamLocked && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">
              <Lock className="w-3.5 h-3.5" />
              {t('academics.marks.examFinalizedLocked', 'Finalized (Moderation Mode Only)')}
            </span>
          )}

          <button
            onClick={() => refetchRegister()}
            className="p-2 border border-zinc-300 rounded-lg text-zinc-600 hover:bg-zinc-50"
            title={t('common.refresh', 'Refresh')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {!isExamLocked && (
            <button
              onClick={handleSaveRegister}
              disabled={saveMarks.isPending || rows.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saveMarks.isPending ? t('common.saving', 'Saving...') : t('common.saveAll', 'Save Register')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 flex flex-wrap items-center gap-3 text-xs">
        <div>
          <label className="block text-[11px] font-bold text-zinc-500 mb-1">{t('common.exam', 'Exam')} *</label>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="px-3 py-1.5 border border-zinc-300 rounded-lg font-semibold bg-white"
          >
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name} ({exam.code}) — {exam.status}
              </option>
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
            {classes.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-500 mb-1">{t('common.section', 'Section')}</label>
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

        <div>
          <label className="block text-[11px] font-bold text-zinc-500 mb-1">{t('common.subject', 'Subject')} *</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="px-3 py-1.5 border border-zinc-300 rounded-lg font-semibold bg-white"
          >
            {classSubjects.map((cs: any) => (
              <option key={cs.subjectId} value={cs.subjectId}>
                {cs.subject?.name} ({cs.subject?.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notifications */}
      {conflictError && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl flex items-start justify-between gap-3 text-rose-800 text-xs shadow-xs">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <div className="font-bold text-sm">Concurrency Conflict Detected</div>
              <div className="mt-0.5 leading-relaxed">{conflictError}</div>
            </div>
          </div>
          <button
            onClick={() => refetchRegister()}
            className="px-3 py-1.5 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 shrink-0"
          >
            Reload Latest Register
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Marks Register Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {loadingRegister ? (
          <div className="p-10 text-center text-zinc-400 text-sm">{t('common.loading', 'Loading student marks register...')}</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <PenLine className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-700">
              {t('academics.marks.noStudents', 'No students enrolled or eligible for marks entry in this class.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-12">Roll</th>
                  <th className="py-3 px-4">{t('common.student', 'Student')}</th>
                  <th className="py-3 px-4 w-32">{t('common.status', 'Attendance')}</th>
                  <th className="py-3 px-4 w-28 text-center">{t('academics.marks.theory', 'Theory (Marks)')}</th>
                  <th className="py-3 px-4 w-28 text-center">{t('academics.marks.practical', 'Practical')}</th>
                  <th className="py-3 px-4 w-28 text-center">{t('academics.marks.activity', 'Activity')}</th>
                  {canModerate && <th className="py-3 px-4 w-24 text-center">{t('academics.marks.grace', 'Grace')}</th>}
                  <th className="py-3 px-4 w-24 text-center">{t('academics.marks.final', 'Final')}</th>
                  <th className="py-3 px-4 w-24 text-center">{t('common.result', 'Result')}</th>
                  {isExamLocked && <th className="py-3 px-4 text-right">Moderation</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row, idx) => {
                  const isPresent = row.status === 'PRESENT';

                  return (
                    <tr key={row.studentId} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-zinc-400">
                        {row.rollNumber || (idx + 1)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-zinc-900">{row.studentName}</div>
                        <div className="text-[11px] font-mono text-zinc-400">{row.admissionNumber}</div>
                      </td>

                      {/* Status Selector */}
                      <td className="py-3 px-4">
                        <select
                          disabled={isExamLocked}
                          value={row.status}
                          onChange={(e) => updateRow(idx, { status: e.target.value })}
                          className={`px-2 py-1 border rounded-lg font-bold text-xs ${
                            row.status === 'PRESENT'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : row.status === 'ABSENT'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          <option value="PRESENT">Present</option>
                          <option value="ABSENT">Absent</option>
                          <option value="EXEMPT">Exempt</option>
                        </select>
                      </td>

                      {/* Theory Marks */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          step="any"
                          disabled={!isPresent || isExamLocked}
                          data-row={idx}
                          data-field="theory"
                          placeholder="—"
                          value={row.rawTheoryMarks}
                          onChange={(e) => updateRow(idx, { rawTheoryMarks: e.target.value })}
                          onKeyDown={(e) => handleKeyDown(e, idx, 'theory')}
                          className="w-20 px-2 py-1 text-center font-bold text-zinc-900 border border-zinc-300 rounded-lg disabled:bg-zinc-100 disabled:text-zinc-400 focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Practical Marks */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          step="any"
                          disabled={!isPresent || isExamLocked}
                          data-row={idx}
                          data-field="practical"
                          placeholder="—"
                          value={row.rawPracticalMarks}
                          onChange={(e) => updateRow(idx, { rawPracticalMarks: e.target.value })}
                          onKeyDown={(e) => handleKeyDown(e, idx, 'practical')}
                          className="w-20 px-2 py-1 text-center font-bold text-zinc-900 border border-zinc-300 rounded-lg disabled:bg-zinc-100 disabled:text-zinc-400 focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Activity Marks */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          step="any"
                          disabled={!isPresent || isExamLocked}
                          data-row={idx}
                          data-field="activity"
                          placeholder="—"
                          value={row.rawActivityMarks}
                          onChange={(e) => updateRow(idx, { rawActivityMarks: e.target.value })}
                          onKeyDown={(e) => handleKeyDown(e, idx, 'activity')}
                          className="w-20 px-2 py-1 text-center font-bold text-zinc-900 border border-zinc-300 rounded-lg disabled:bg-zinc-100 disabled:text-zinc-400 focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Grace Marks */}
                      {canModerate && (
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            step="any"
                            disabled={!isPresent || isExamLocked}
                            data-row={idx}
                            data-field="grace"
                            value={row.graceMarks}
                            onChange={(e) => updateRow(idx, { graceMarks: e.target.value })}
                            onKeyDown={(e) => handleKeyDown(e, idx, 'grace')}
                            className="w-16 px-2 py-1 text-center font-bold text-amber-700 bg-amber-50/50 border border-amber-200 rounded-lg disabled:opacity-40"
                          />
                        </td>
                      )}

                      {/* Final Marks Display */}
                      <td className="py-3 px-4 text-center font-black text-sm">
                        {row.finalMarks !== null ? row.finalMarks : '—'}
                      </td>

                      {/* Pass / Fail Status */}
                      <td className="py-3 px-4 text-center">
                        {row.status === 'ABSENT' ? (
                          <span className="text-[10px] font-bold uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded">Absent</span>
                        ) : row.status === 'EXEMPT' ? (
                          <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Exempt</span>
                        ) : row.isPassed ? (
                          <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Pass</span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded">Fail</span>
                        )}
                      </td>

                      {/* Moderation Button for Locked Exams */}
                      {isExamLocked && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openModerationModal(row)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Moderate Mark (Authorized Adjustment)"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
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

      {/* Moderation Modal */}
      {modModalOpen && modStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  {t('academics.marks.moderateTitle', 'Authorized Marks Moderation')}
                </h3>
                <p className="text-xs text-zinc-500">{modStudent.studentName} ({modStudent.admissionNumber})</p>
              </div>
              <button onClick={() => setModModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleModerationSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs">
                This exam is finalized. Any adjustment is logged permanently in the AuditLog and recalculates the student result.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Corrected Theory Marks</label>
                  <input
                    type="number"
                    step="any"
                    value={modRawTheory}
                    onChange={(e) => setModRawTheory(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Grace Marks</label>
                  <input
                    type="number"
                    step="any"
                    value={modGrace}
                    onChange={(e) => setModGrace(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">
                  Correction Reason * (Mandatory for audit trail)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the justification for this change (e.g. Scrutiny committee re-evaluation question 4)..."
                  value={modReason}
                  onChange={(e) => setModReason(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setModModalOpen(false)}
                  className="px-4 py-2 border border-zinc-300 text-zinc-700 font-bold rounded-lg hover:bg-zinc-50"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={moderateMark.isPending}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm"
                >
                  {t('academics.marks.submitCorrection', 'Submit Moderation')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarksEntryView;
