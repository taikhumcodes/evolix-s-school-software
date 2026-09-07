import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  Play,
  Check,
  Search,
  RefreshCw,
} from 'lucide-react';
import {
  useDocumentTemplates,
  useBulkDocumentJobs,
  useBulkDocumentJob,
  useCreateBulkDocumentJob,
} from '../../../lib/api/documents';
import { useStudents } from '../../../lib/api/students';

export const BulkGenerationView: React.FC = () => {
  const { t } = useTranslation();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [autoFinalize, setAutoFinalize] = useState<boolean>(true);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const { data: templates } = useDocumentTemplates({ status: 'PUBLISHED' });
  const { data: studentsData, isLoading: loadingStudents } = useStudents({
    search: studentSearch.trim() || undefined,
    limit: 50,
  });

  const { data: bulkJobs, refetch: refetchJobs } = useBulkDocumentJobs();
  const { data: activeJob } = useBulkDocumentJob(activeJobId || undefined);

  const createBulkJobMutation = useCreateBulkDocumentJob();

  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    if (!studentsData?.items) return;
    const allIds = studentsData.items.map((s) => s.id);
    const allSelected = allIds.every((id) => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...allIds])));
    }
  };

  const handleStartBulkJob = async () => {
    if (!selectedTemplateId || selectedStudentIds.length === 0) return;
    try {
      const job = await createBulkJobMutation.mutateAsync({
        templateId: selectedTemplateId,
        sourceType: 'STUDENT',
        sourceIds: selectedStudentIds,
        autoFinalize,
      });
      setActiveJobId(job.id);
      setSelectedStudentIds([]);
      refetchJobs();
    } catch (err) {
      console.error('Failed to submit bulk job', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-2xs">
        <h1 className="text-xl font-bold text-zinc-900">
          {t('documents.bulk.title', 'Bulk Document & Certificate Generation')}
        </h1>
        <p className="text-xs text-zinc-500 mt-1 max-w-xl">
          {t(
            'documents.bulk.subtitle',
            'Queue asynchronous batch generation for student identity cards, term report cards, or grade certificates.'
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Job Configurator (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Template Select */}
          <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-2xs space-y-3">
            <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px]">
                1
              </span>
              Select Target Template
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {templates?.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedTemplateId === tpl.id
                      ? 'border-mehndi-600 bg-mehndi-50/40 text-mehndi-900 ring-1 ring-mehndi-600'
                      : 'border-zinc-200 hover:border-zinc-300 bg-white text-zinc-800'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{tpl.name}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    {tpl.category} • {tpl.pageSize}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Recipient Selection */}
          <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px]">
                  2
                </span>
                Select Students ({selectedStudentIds.length} chosen)
              </h2>

              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="text-xs font-bold text-mehndi-700 hover:text-mehndi-800"
              >
                Toggle Select All Visible
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search students..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-mehndi-500"
              />
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {loadingStudents ? (
                <p className="text-xs text-zinc-400 py-4 text-center">Loading students...</p>
              ) : !studentsData?.items || studentsData.items.length === 0 ? (
                <p className="text-xs text-zinc-400 py-4 text-center">No students found.</p>
              ) : (
                studentsData.items.map((stu) => {
                  const isChecked = selectedStudentIds.includes(stu.id);
                  return (
                    <div
                      key={stu.id}
                      onClick={() => handleToggleStudent(stu.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isChecked
                          ? 'border-mehndi-600 bg-mehndi-50/40 text-mehndi-900 ring-1 ring-mehndi-600'
                          : 'border-zinc-200 hover:border-zinc-300 bg-white text-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                            isChecked
                              ? 'bg-mehndi-600 border-mehndi-600 text-white'
                              : 'border-zinc-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold">
                            {stu.firstName} {stu.lastName}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            Adm: {stu.admissionNumber} {stu.currentClass ? `• Class: ${stu.currentClass.name}` : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. Submit Bulk Job */}
          <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoFin"
                checked={autoFinalize}
                onChange={(e) => setAutoFinalize(e.target.checked)}
                className="w-4 h-4 rounded text-mehndi-600 focus:ring-mehndi-500"
              />
              <label htmlFor="autoFin" className="text-xs font-semibold text-zinc-800 cursor-pointer">
                Auto-Finalize & Allocate Official Numbers
              </label>
            </div>

            <button
              onClick={handleStartBulkJob}
              disabled={
                !selectedTemplateId ||
                selectedStudentIds.length === 0 ||
                createBulkJobMutation.isPending
              }
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>
                {createBulkJobMutation.isPending
                  ? 'Queueing...'
                  : `Start Job (${selectedStudentIds.length})`}
              </span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Job Tracker & History (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Active Job Tracker */}
          {activeJob && (
            <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-mehndi-600" />
                  Active Bulk Job Progress
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    activeJob.status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : activeJob.status === 'PROCESSING'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                      : 'bg-zinc-100 text-zinc-700'
                  }`}
                >
                  {activeJob.status}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 mb-1">
                  <span>
                    Processed {activeJob.successCount} of {activeJob.totalCount} items
                  </span>
                  <span>{Math.round((activeJob.successCount / (activeJob.totalCount || 1)) * 100)}%</span>
                </div>
                <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-mehndi-600 rounded-full transition-all duration-300"
                    style={{
                      width: `${(activeJob.successCount / (activeJob.totalCount || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {activeJob.items?.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-between text-xs"
                  >
                    <span className="font-mono text-zinc-600 text-[11px] truncate max-w-[150px]">
                      {item.sourceId}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        item.status === 'SUCCESS'
                          ? 'text-emerald-700 bg-emerald-50'
                          : item.status === 'FAILED'
                          ? 'text-rose-700 bg-rose-50'
                          : 'text-zinc-500 bg-zinc-100'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past Bulk Jobs */}
          <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Recent Bulk Jobs History
              </h3>
              <button
                onClick={() => refetchJobs()}
                className="text-zinc-400 hover:text-zinc-700 p-1"
                title="Refresh jobs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {!bulkJobs || bulkJobs.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-6">No bulk jobs executed yet.</p>
              ) : (
                bulkJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => setActiveJobId(job.id)}
                    className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                      activeJobId === job.id
                        ? 'border-mehndi-600 bg-mehndi-50/40'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-zinc-900">
                      <span className="truncate max-w-[160px]">{job.template?.name || 'Template'}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700">
                        {job.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1 flex items-center justify-between">
                      <span>
                        Success: {job.successCount} / {job.totalCount}
                      </span>
                      <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkGenerationView;
