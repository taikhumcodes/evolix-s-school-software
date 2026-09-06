import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  ShieldCheck,
  CheckCheck,
  Users,
} from 'lucide-react';
import { AcademicsNav } from './AcademicsNav';
import {
  usePromotionPreview,
  useExecutePromotions,
  PromotionPreviewStudent,
} from '../../../lib/api/academics';
import { useAcademicYears } from '../../../lib/api/academic-years';
import { useClasses, useClassSections } from '../../../lib/api/master-data';
import { useTenant } from '../../../core/tenancy/TenantContext';

export const PromotionView: React.FC = () => {
  const { t } = useTranslation();

  const { currentTenant } = useTenant();
  const schoolId = currentTenant?.schoolId || '';
  const { data: years = [] } = useAcademicYears(schoolId);
  const [sourceYearId, setSourceYearId] = useState<string>('');
  const [targetYearId, setTargetYearId] = useState<string>('');

  const { data: classes = [] } = useClasses();
  const [sourceClassId, setSourceClassId] = useState<string>('');
  const { data: sourceSections = [] } = useClassSections({ schoolId, classId: sourceClassId });
  const [sourceSectionId, setSourceSectionId] = useState<string>('');

  const [targetClassId, setTargetClassId] = useState<string>('');
  const { data: targetSections = [] } = useClassSections({ schoolId, classId: targetClassId });
  const [targetSectionId, setTargetSectionId] = useState<string>('');

  // Auto initialize source and target years
  React.useEffect(() => {
    if (years.length >= 2 && !sourceYearId && !targetYearId) {
      const activeIndex = years.findIndex((y: any) => y.status === 'ACTIVE');
      if (activeIndex !== -1 && activeIndex + 1 < years.length) {
        setSourceYearId(years[activeIndex].id);
        setTargetYearId(years[activeIndex + 1].id);
      } else {
        setSourceYearId(years[0].id);
        setTargetYearId(years[1]?.id || '');
      }
    } else if (years.length === 1 && !sourceYearId) {
      setSourceYearId(years[0].id);
    }
  }, [years, sourceYearId, targetYearId]);

  // Preview query
  const {
    data: previewData,
    isLoading: loadingPreview,
  } = usePromotionPreview({
    sourceAcademicYearId: sourceYearId,
    sourceClassId,
    sourceSectionId: sourceSectionId || undefined,
    targetAcademicYearId: targetYearId,
  });

  const executePromotions = useExecutePromotions();

  // Local student state for overrides
  const [students, setStudents] = useState<PromotionPreviewStudent[]>([]);
  const [executionResult, setExecutionResult] = useState<any | null>(null);

  React.useEffect(() => {
    if (previewData && previewData.students) {
      setStudents(
        previewData.students.map((s) => ({
          ...s,
          selectedOutcome: s.suggestedOutcome,
        }))
      );
      setExecutionResult(null);
    }
  }, [previewData]);

  // Bulk Actions
  const markAll = (outcome: 'PROMOTE' | 'DETAIN' | 'COMPLETE') => {
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        selectedOutcome: outcome,
      }))
    );
  };

  const updateStudentOutcome = (studentId: string, outcome: 'PROMOTE' | 'DETAIN' | 'COMPLETE') => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, selectedOutcome: outcome } : s))
    );
  };

  const handleExecute = async () => {
    if (!sourceYearId || !sourceClassId || !targetYearId) {
      alert(t('academics.promotions.missingFields', 'Please select source year, source class, and target academic year.'));
      return;
    }

    const hasPromoteOrDetain = students.some((s) => s.selectedOutcome !== 'COMPLETE');
    if (hasPromoteOrDetain && !targetClassId) {
      alert(t('academics.promotions.targetClassRequired', 'Please select target class for promoted/detained students.'));
      return;
    }

    if (!window.confirm(t('academics.promotions.confirmExecution', 'Execute promotions for selected students? New academic enrollments will be created in the target year.'))) {
      return;
    }

    try {
      const payload = {
        sourceAcademicYearId: sourceYearId,
        sourceClassId,
        sourceSectionId: sourceSectionId || undefined,
        targetAcademicYearId: targetYearId,
        promotions: students.map((s) => ({
          studentId: s.studentId,
          outcome: s.selectedOutcome,
          targetClassId: s.selectedOutcome === 'DETAIN' ? sourceClassId : targetClassId,
          targetSectionId: targetSectionId || undefined,
        })),
      };

      const res = await executePromotions.mutateAsync(payload);
      setExecutionResult(res);
      alert(t('academics.promotions.successAlert', 'Promotions processed successfully!'));
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
          <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              {t('academics.promotions.title', 'Annual Student Promotions & Rollover')}
            </h2>
            <p className="text-xs text-zinc-500">
              {t('academics.promotions.desc', 'Transition students into next academic year with promotion, detention, and completion outcomes')}
            </p>
          </div>
        </div>

        {students.length > 0 && (
          <button
            onClick={handleExecute}
            disabled={executePromotions.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 shadow-sm"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{executePromotions.isPending ? 'Processing...' : 'Execute Promotions'}</span>
          </button>
        )}
      </div>

      {/* Selectors Grid: Source vs Target */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Source Class Box */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 space-y-3">
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-zinc-500"></span>
            1. Source Classroom (Current Session)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 mb-1">Source Session *</label>
              <select
                value={sourceYearId}
                onChange={(e) => setSourceYearId(e.target.value)}
                className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg bg-white font-semibold"
              >
                <option value="">Select Year</option>
                {years.map((y: any) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 mb-1">Source Class *</label>
              <select
                value={sourceClassId}
                onChange={(e) => {
                  setSourceClassId(e.target.value);
                  setSourceSectionId('');
                }}
                className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg bg-white font-semibold"
              >
                <option value="">Select Class</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 mb-1">Source Section</label>
              <select
                value={sourceSectionId}
                onChange={(e) => setSourceSectionId(e.target.value)}
                disabled={!sourceClassId}
                className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg bg-white font-semibold disabled:opacity-50"
              >
                <option value="">All Sections</option>
                {sourceSections.map((cs: any) => (
                  <option key={cs.sectionId} value={cs.sectionId}>{cs.section?.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Target Class Box */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 space-y-3">
          <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            2. Target Classroom (Next Session Destination)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 mb-1">Target Session *</label>
              <select
                value={targetYearId}
                onChange={(e) => setTargetYearId(e.target.value)}
                className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg bg-white font-semibold"
              >
                <option value="">Select Year</option>
                {years
                  .filter((y: any) => y.id !== sourceYearId)
                  .map((y: any) => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 mb-1">Target Class *</label>
              <select
                value={targetClassId}
                onChange={(e) => {
                  setTargetClassId(e.target.value);
                  setTargetSectionId('');
                }}
                className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg bg-white font-semibold"
              >
                <option value="">Select Class</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 mb-1">Target Section</label>
              <select
                value={targetSectionId}
                onChange={(e) => setTargetSectionId(e.target.value)}
                disabled={!targetClassId}
                className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg bg-white font-semibold disabled:opacity-50"
              >
                <option value="">Default / Keep Section</option>
                {targetSections.map((cs: any) => (
                  <option key={cs.sectionId} value={cs.sectionId}>{cs.section?.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Result Banner */}
      {executionResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold">Promotions Executed Successfully!</div>
              <div>{executionResult.promotedCount} students processed into destination academic session.</div>
            </div>
          </div>
        </div>
      )}

      {/* Student Promotion Review Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-zinc-50/70 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="font-bold text-zinc-700 flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-500" />
            <span>Eligible Student Candidate List ({students.length})</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-500 font-semibold">Bulk Set All:</span>
            <button
              onClick={() => markAll('PROMOTE')}
              className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
            >
              All Promote
            </button>
            <button
              onClick={() => markAll('DETAIN')}
              className="px-2.5 py-1 text-xs font-bold rounded bg-amber-100 text-amber-800 hover:bg-amber-200"
            >
              All Detain
            </button>
            <button
              onClick={() => markAll('COMPLETE')}
              className="px-2.5 py-1 text-xs font-bold rounded bg-purple-100 text-purple-800 hover:bg-purple-200"
            >
              All Complete
            </button>
          </div>
        </div>

        {loadingPreview ? (
          <div className="p-10 text-center text-zinc-400 text-sm">Loading promotion candidates...</div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingUp className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-700">
              Please select source academic year and class to generate promotion preview.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-12">Roll</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Current Section</th>
                  <th className="py-3 px-4 text-center">Score / Status</th>
                  <th className="py-3 px-4 text-center">Recommendation</th>
                  <th className="py-3 px-4 text-right">Promotion Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {students.map((s, idx) => (
                  <tr key={s.studentId} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-zinc-400">{s.rollNumber || (idx + 1)}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-zinc-900">{s.studentName}</div>
                      <div className="text-[11px] font-mono text-zinc-400">{s.admissionNumber}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-700">{s.currentSection || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      {s.currentPercentage !== undefined && s.currentPercentage !== null ? (
                        <span className="font-bold text-zinc-900">{s.currentPercentage}%</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                          s.suggestedOutcome === 'PROMOTE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.suggestedOutcome === 'DETAIN'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {s.suggestedOutcome}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <select
                        value={s.selectedOutcome}
                        onChange={(e: any) => updateStudentOutcome(s.studentId, e.target.value)}
                        className={`px-3 py-1.5 border rounded-lg font-bold text-xs ${
                          s.selectedOutcome === 'PROMOTE'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : s.selectedOutcome === 'DETAIN'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-purple-50 text-purple-800 border-purple-300'
                        }`}
                      >
                        <option value="PROMOTE">PROMOTE (Advance Class)</option>
                        <option value="DETAIN">DETAIN (Repeat Class)</option>
                        <option value="COMPLETE">COMPLETE (Graduated)</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromotionView;
