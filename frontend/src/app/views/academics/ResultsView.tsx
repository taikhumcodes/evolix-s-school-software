import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  GraduationCap,
  Award,
  Printer,
  Globe,
  Lock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { AcademicsNav } from './AcademicsNav';
import {
  useExamsList,
  useCalculatedResults,
  usePublishExam,
  useFinalizeExam,
} from '../../../lib/api/academics';
import { useClasses, useClassSections } from '../../../lib/api/master-data';
import { useTenant } from '../../../core/tenancy/TenantContext';
import { ReportCardModal } from './ReportCardModal';

export const ResultsView: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { currentTenant } = useTenant();
  const schoolId = currentTenant?.schoolId || '';

  const { data: exams = [] } = useExamsList();
  const [selectedExamId, setSelectedExamId] = useState<string>(searchParams.get('examId') || '');
  const currentExam = exams.find((e) => e.id === selectedExamId) || exams[0];

  const { data: classes = [] } = useClasses();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const { data: classSections = [] } = useClassSections({ schoolId, classId: selectedClassId });
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');

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

  const {
    data: results = [],
    isLoading,
    refetch,
  } = useCalculatedResults({
    examId: selectedExamId || currentExam?.id,
    classId: selectedClassId,
    sectionId: selectedSectionId || undefined,
  });

  const finalizeExam = useFinalizeExam();
  const publishExam = usePublishExam();

  // Report Card Modal State
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const handleFinalize = async () => {
    if (!currentExam) return;
    if (!window.confirm(t('academics.results.confirmFinalize', 'Finalize exam results? Marks editing will be locked.'))) return;
    try {
      await finalizeExam.mutateAsync(currentExam.id);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handlePublish = async () => {
    if (!currentExam) return;
    if (!window.confirm(t('academics.results.confirmPublish', 'Publish results? Students and parents will have access.'))) return;
    try {
      await publishExam.mutateAsync(currentExam.id);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const passCount = results.filter((r) => r.isPassed).length;
  const failCount = results.length - passCount;
  const avgPercentage =
    results.length > 0
      ? (results.reduce((sum, r) => sum + r.percentage, 0) / results.length).toFixed(1)
      : '0';

  return (
    <div className="space-y-6">
      <AcademicsNav />

      {/* Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              {t('academics.results.title', 'Examination Results & Report Cards')}
            </h2>
            <p className="text-xs text-zinc-500">
              {t('academics.results.desc', 'Student performance calculations, grade assignments, and board-compliant report cards')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentExam && currentExam.status !== 'FINALIZED' && currentExam.status !== 'PUBLISHED' && (
            <button
              onClick={handleFinalize}
              disabled={finalizeExam.isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm"
            >
              <Lock className="w-4 h-4" />
              <span>Finalize Exam</span>
            </button>
          )}

          {currentExam && currentExam.status === 'FINALIZED' && (
            <button
              onClick={handlePublish}
              disabled={publishExam.isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
            >
              <Globe className="w-4 h-4" />
              <span>Publish Results</span>
            </button>
          )}

          {currentExam && currentExam.status === 'PUBLISHED' && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <Globe className="w-3.5 h-3.5" />
              Published to Portal
            </span>
          )}
        </div>
      </div>

      {/* Filter Bar */}
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
      </div>

      {/* Metrics Summary Strip */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs">
            <span className="text-zinc-500 text-xs font-semibold">Total Students</span>
            <div className="text-2xl font-black text-zinc-900 mt-1">{results.length}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs">
            <span className="text-emerald-700 text-xs font-semibold">Passed</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{passCount}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs">
            <span className="text-rose-700 text-xs font-semibold">Failed</span>
            <div className="text-2xl font-black text-rose-700 mt-1">{failCount}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs">
            <span className="text-indigo-700 text-xs font-semibold">Average Score</span>
            <div className="text-2xl font-black text-indigo-700 mt-1">{avgPercentage}%</div>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-zinc-400 text-sm">Calculating examination results...</div>
        ) : results.length === 0 ? (
          <div className="p-12 text-center">
            <Award className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-700">
              No results available for this selection. Ensure marks are entered for the exam.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-12">Roll</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4 text-center">Marks Obtained</th>
                  <th className="py-3 px-4 text-center">Total Max</th>
                  <th className="py-3 px-4 text-center">Percentage</th>
                  <th className="py-3 px-4 text-center">Grade</th>
                  <th className="py-3 px-4 text-center">Result</th>
                  <th className="py-3 px-4 text-right">Report Card</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {results.map((r, idx) => (
                  <tr key={r.studentId} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-zinc-400">{r.rollNumber || (idx + 1)}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-zinc-900">{r.studentName}</div>
                      <div className="text-[11px] font-mono text-zinc-400">{r.admissionNumber}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-zinc-900 text-sm">
                      {r.totalMarksObtained}
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-zinc-500">
                      {r.totalMaxMarks}
                    </td>
                    <td className="py-3 px-4 text-center font-black text-emerald-700 text-sm">
                      {r.percentage}%
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-zinc-800">
                      {r.finalGrade || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {r.isPassed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Passed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedStudentId(r.studentId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Card</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Card Modal */}
      {selectedStudentId && currentExam && (
        <ReportCardModal
          examId={currentExam.id}
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
        />
      )}
    </div>
  );
};

export default ResultsView;
