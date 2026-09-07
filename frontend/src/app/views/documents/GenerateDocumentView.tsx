import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  FilePlus,
  CheckCircle2,
  AlertCircle,
  Play,
  Download,
  Eye,
  Search,
  User,
  Check,
} from 'lucide-react';
import {
  useDocumentTemplates,
  usePreviewDocument,
  useGenerateDocument,
  useFinalizeDocument,
  downloadOrReprintPdf,
} from '../../../lib/api/documents';
import { useStudents } from '../../../lib/api/students';

export const GenerateDocumentView: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialTemplateId = searchParams.get('templateId') || '';
  const initialType = searchParams.get('type') || '';

  const { data: templates, isLoading: loadingTemplates } = useDocumentTemplates({ status: 'PUBLISHED' });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateId);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [autoFinalize, setAutoFinalize] = useState<boolean>(true);
  const language = 'en';

  // Preview & Generation States
  const [previewPdfBase64, setPreviewPdfBase64] = useState<string | null>(null);
  const [generatedDoc, setGeneratedDoc] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Student search query
  const { data: studentsData, isLoading: loadingStudents } = useStudents({
    search: studentSearch.trim() || undefined,
    limit: 10,
  });

  const previewMutation = usePreviewDocument();
  const generateMutation = useGenerateDocument();
  const finalizeMutation = useFinalizeDocument();

  // Pre-select if passed via URL
  useEffect(() => {
    if (templates && templates.length > 0) {
      if (initialTemplateId) {
        setSelectedTemplateId(initialTemplateId);
      } else if (initialType) {
        const match = templates.find((t) => t.documentType === initialType);
        if (match) setSelectedTemplateId(match.id);
      } else if (!selectedTemplateId) {
        setSelectedTemplateId(templates[0].id);
      }
    }
  }, [templates, initialTemplateId, initialType]);

  const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId);
  const selectedStudent = studentsData?.items?.find((s) => s.id === selectedStudentId);

  // Handle Preview Action
  const handlePreview = async () => {
    if (!selectedTemplateId || !selectedStudentId) {
      setErrorMsg('Please select both a document template and a student.');
      return;
    }
    setErrorMsg(null);
    try {
      const res = await previewMutation.mutateAsync({
        templateId: selectedTemplateId,
        sourceType: selectedTemplate?.category || 'STUDENT',
        sourceId: selectedStudentId,
        language,
      });
      setPreviewPdfBase64(res.pdfBase64);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to render preview');
    }
  };

  // Handle Generate / Finalize Action
  const handleGenerate = async () => {
    if (!selectedTemplateId || !selectedStudentId) {
      setErrorMsg('Please select both a document template and a student.');
      return;
    }
    setErrorMsg(null);
    try {
      const doc = await generateMutation.mutateAsync({
        templateId: selectedTemplateId,
        sourceType: selectedTemplate?.category || 'STUDENT',
        sourceId: selectedStudentId,
        language,
        options: {
          autoFinalize,
        },
      });
      setGeneratedDoc(doc);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to generate document');
    }
  };

  return (
    <div className="space-y-6">
      {/* Wizard Header */}
      <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-2xs">
        <h1 className="text-xl font-bold text-zinc-900">
          {t('documents.generate.title', 'Issue Certificate or Document')}
        </h1>
        <p className="text-xs text-zinc-500 mt-1 max-w-xl">
          {t(
            'documents.generate.subtitle',
            'Select an approved layout template, assign the student or recipient, preview the rendered PDF, and issue an official verifiable record.'
          )}
        </p>
      </div>

      {generatedDoc ? (
        // Generation Success Card
        <div className="bg-white p-8 rounded-3xl border border-zinc-200/80 shadow-xs max-w-2xl mx-auto text-center space-y-5">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-zinc-900">
              {generatedDoc.status === 'FINALIZED'
                ? t('documents.generate.successFinalized', 'Document Finalized & Issued!')
                : t('documents.generate.successDraft', 'Document Draft Generated')}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {generatedDoc.status === 'FINALIZED'
                ? t('documents.generate.allocatedMsg', 'Assigned official sequence number and stored byte-immutable PDF.')
                : t('documents.generate.draftMsg', 'Document is saved as draft. You can finalize it anytime.')}
            </p>
          </div>

          {generatedDoc.documentNumber && (
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 max-w-sm mx-auto">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Official Document #
              </span>
              <div className="text-lg font-mono font-black text-zinc-900 mt-0.5">
                {generatedDoc.documentNumber}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-4">
            {generatedDoc.status === 'FINALIZED' ? (
              <button
                onClick={() =>
                  downloadOrReprintPdf(generatedDoc.id, `${generatedDoc.documentNumber || generatedDoc.id}.pdf`)
                }
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>{t('documents.actions.downloadPdf', 'Download PDF')}</span>
              </button>
            ) : (
              <button
                onClick={async () => {
                  const fin = await finalizeMutation.mutateAsync(generatedDoc.id);
                  setGeneratedDoc(fin);
                }}
                disabled={finalizeMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{finalizeMutation.isPending ? 'Finalizing...' : 'Finalize & Allocate Number'}</span>
              </button>
            )}

            <button
              onClick={() => {
                setGeneratedDoc(null);
                setPreviewPdfBase64(null);
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
            >
              {t('documents.generate.issueAnother', 'Issue Another Document')}
            </button>
          </div>
        </div>
      ) : (
        // Generation Form & Live Preview Grid
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Configuration (6 cols) */}
          <div className="lg:col-span-6 space-y-5">
            {/* Step 1: Select Template */}
            <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-2xs space-y-4">
              <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px]">
                  1
                </span>
                {t('documents.generate.step1', 'Select Document Template')}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {loadingTemplates ? (
                  <p className="text-xs text-zinc-400 col-span-full">Loading templates...</p>
                ) : (
                  templates?.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplateId(tpl.id);
                        setPreviewPdfBase64(null);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedTemplateId === tpl.id
                          ? 'border-mehndi-600 bg-mehndi-50/40 text-mehndi-900 ring-1 ring-mehndi-600'
                          : 'border-zinc-200 hover:border-zinc-300 bg-white text-zinc-800'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">{tpl.name}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                        {tpl.code} • {tpl.pageSize}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Step 2: Select Student / Recipient */}
            <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-2xs space-y-4">
              <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px]">
                  2
                </span>
                {t('documents.generate.step2', 'Select Student / Recipient')}
              </h2>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder={t('documents.generate.searchStudent', 'Search student by name, admission no...')}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-mehndi-500"
                />
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {loadingStudents ? (
                  <p className="text-xs text-zinc-400 py-3 text-center">Searching students...</p>
                ) : !studentsData?.items || studentsData.items.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-3 text-center">No students found matching search</p>
                ) : (
                  studentsData.items.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => {
                        setSelectedStudentId(student.id);
                        setPreviewPdfBase64(null);
                      }}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        selectedStudentId === student.id
                          ? 'border-mehndi-600 bg-mehndi-50/40 text-mehndi-900 ring-1 ring-mehndi-600'
                          : 'border-zinc-200 hover:border-zinc-300 bg-white text-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            Adm: {student.admissionNumber} {student.currentClass ? `• Class: ${student.currentClass.name}` : ''}
                          </div>
                        </div>
                      </div>
                      {selectedStudentId === student.id && (
                        <Check className="w-4 h-4 text-mehndi-600 shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Step 3: Options & Issuance Actions */}
            <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-2xs space-y-4">
              <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px]">
                  3
                </span>
                {t('documents.generate.step3', 'Issuance Options')}
              </h2>

              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <div>
                  <div className="text-xs font-bold text-zinc-900">
                    {t('documents.generate.autoFinalizeLabel', 'Auto-Finalize Immediately')}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {t('documents.generate.autoFinalizeHelp', 'Allocates official sequence number & saves immutable PDF')}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoFinalize}
                  onChange={(e) => setAutoFinalize(e.target.checked)}
                  className="w-4 h-4 rounded text-mehndi-600 focus:ring-mehndi-500"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={!selectedTemplateId || !selectedStudentId || previewMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  <span>{previewMutation.isPending ? 'Rendering Preview...' : 'Render Preview'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!selectedTemplateId || !selectedStudentId || generateMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                >
                  <FilePlus className="w-4 h-4" />
                  <span>
                    {generateMutation.isPending
                      ? 'Generating...'
                      : autoFinalize
                      ? 'Finalize & Issue'
                      : 'Save as Draft'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live PDF Preview (6 cols) */}
          <div className="lg:col-span-6 bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-2xs flex flex-col h-full min-h-[620px]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
              <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-zinc-500" />
                Live Document Preview
              </span>
              {selectedStudent && (
                <span className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                  Recipient: {selectedStudent.firstName} {selectedStudent.lastName}
                </span>
              )}
            </div>

            <div className="flex-1 bg-zinc-100 rounded-2xl overflow-hidden flex items-center justify-center border border-zinc-200">
              {previewPdfBase64 ? (
                <iframe
                  src={`data:application/pdf;base64,${previewPdfBase64}#toolbar=0&navpanes=0`}
                  title="Live Preview"
                  className="w-full h-full min-h-[560px] border-0"
                />
              ) : (
                <div className="text-center p-8 text-zinc-400">
                  <Play className="w-10 h-10 mx-auto mb-2 text-zinc-300" />
                  <p className="text-xs font-semibold text-zinc-600">No preview generated yet</p>
                  <p className="text-[11px] text-zinc-400 mt-1 max-w-xs mx-auto">
                    Select a template and student, then click "Render Preview" to inspect the document before issuing.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerateDocumentView;
