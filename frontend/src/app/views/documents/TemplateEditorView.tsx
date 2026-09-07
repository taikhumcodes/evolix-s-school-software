import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Play,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileCode,
  Layers,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import {
  useDocumentTemplate,
  useCreateTemplateVersion,
  usePublishTemplateVersion,
  usePreviewDocument,
} from '../../../lib/api/documents';

export const TemplateEditorView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: template, isLoading, refetch } = useDocumentTemplate(id);
  const createVersionMutation = useCreateTemplateVersion();
  const publishVersionMutation = usePublishTemplateVersion();
  const previewMutation = usePreviewDocument();

  const [activeVersionNumber, setActiveVersionNumber] = useState<number>(1);
  const [jsonContent, setJsonContent] = useState<string>('');
  const [jsonSyntaxError, setJsonSyntaxError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [changeSummary, setChangeSummary] = useState<string>('');
  const [previewPdfBase64, setPreviewPdfBase64] = useState<string | null>(null);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  // Initialize editor with current version layout
  useEffect(() => {
    if (template) {
      const activeVer =
        template.versions?.find((v) => v.id === template.currentVersionId) ||
        template.versions?.[template.versions.length - 1];

      if (activeVer) {
        setActiveVersionNumber(activeVer.versionNumber);
        setJsonContent(JSON.stringify(activeVer.layoutDefinition, null, 2));
        setJsonSyntaxError(null);
        setApiError(null);
      }
    }
  }, [template]);

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setJsonContent(val);
    setApiError(null);
    try {
      JSON.parse(val);
      setJsonSyntaxError(null);
    } catch (err: any) {
      setJsonSyntaxError(err.message);
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      setJsonContent(JSON.stringify(parsed, null, 2));
      setJsonSyntaxError(null);
      setApiError(null);
    } catch (err: any) {
      setJsonSyntaxError(err.message);
    }
  };

  const handleCopyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVar(variable);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const handlePreview = async () => {
    setApiError(null);
    try {
      const parsedLayout = JSON.parse(jsonContent);
      setJsonSyntaxError(null);
      const res = await previewMutation.mutateAsync({
        templateId: template?.id,
        layoutDefinition: parsedLayout,
        sourceType: template?.category || 'STUDENT',
        sourceId: 'preview-sample-id',
      });
      setPreviewPdfBase64(res.pdfBase64);
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setJsonSyntaxError(err.message);
      } else {
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err.message ||
          'Preview generation failed';
        setApiError(msg);
      }
    }
  };

  const handleSaveDraftVersion = async () => {
    if (!template) return;
    setApiError(null);
    try {
      const parsedLayout = JSON.parse(jsonContent);
      setJsonSyntaxError(null);
      await createVersionMutation.mutateAsync({
        templateId: template.id,
        data: {
          layoutDefinition: parsedLayout,
          changeSummary: changeSummary.trim() || 'Updated layout definition',
          isPublished: false,
        },
      });
      setChangeSummary('');
      refetch();
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setJsonSyntaxError(err.message);
      } else {
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err.message ||
          'Failed to save version';
        setApiError(msg);
      }
    }
  };

  const handlePublishActive = async (versionId: string) => {
    if (!template) return;
    setApiError(null);
    try {
      await publishVersionMutation.mutateAsync({
        templateId: template.id,
        versionId,
      });
      refetch();
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err.message ||
        'Failed to publish version';
      setApiError(msg);
    }
  };

  const variableSnippets = [
    { label: 'Student Full Name', code: '{{student.fullName}}' },
    { label: 'Admission No', code: '{{student.admissionNumber}}' },
    { label: 'Class & Section', code: '{{academic.className}} - {{academic.sectionName}}' },
    { label: 'Father Name', code: '{{student.fatherName}}' },
    { label: 'Date of Birth', code: '{{student.dateOfBirthFormatted}}' },
    { label: 'School Name', code: '{{school.name}}' },
    { label: 'School Affiliation / Code', code: '{{school.code}}' },
    { label: 'Receipt No', code: '{{finance.receiptNumber}}' },
    { label: 'Total Paid (INR)', code: '{{finance.totalAmountFormatted}}' },
    { label: 'Employee Name', code: '{{employee.fullName}}' },
    { label: 'Net Pay', code: '{{payroll.netPayFormatted}}' },
    { label: 'Issue Date', code: '{{document.dateFormatted}}' },
    { label: 'Document Number', code: '{{document.number}}' },
  ];

  if (isLoading) {
    return <div className="p-8 text-center text-zinc-400">Loading template designer...</div>;
  }

  if (!template) {
    return <div className="p-8 text-center text-zinc-500">Template not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/documents/templates')}
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                {template.code}
              </span>
              <h1 className="text-lg font-bold text-zinc-900">{template.name}</h1>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {template.category} • {template.pageSize} {template.orientation} • Policy: {template.numberingPolicy || 'NUMBER_SERIES_ON_FINALIZE'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePreview}
            disabled={Boolean(jsonSyntaxError) || previewMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs transition-colors disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${previewMutation.isPending ? 'animate-spin' : ''}`} />
            <span>{previewMutation.isPending ? 'Rendering...' : 'Live PDF Preview'}</span>
          </button>

          <button
            onClick={handleSaveDraftVersion}
            disabled={Boolean(jsonSyntaxError) || createVersionMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{createVersionMutation.isPending ? 'Saving...' : 'Save New Version'}</span>
          </button>
        </div>
      </div>

      {/* Editor & Preview Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Layout Editor & Variables (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Version Selector Bar */}
          <div className="bg-white p-3 rounded-2xl border border-zinc-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-zinc-400" />
              <span className="font-semibold text-zinc-600">Versions:</span>
              <div className="flex items-center gap-1.5">
                {template.versions?.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setActiveVersionNumber(v.versionNumber);
                      setJsonContent(JSON.stringify(v.layoutDefinition, null, 2));
                      setJsonSyntaxError(null);
                      setApiError(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      activeVersionNumber === v.versionNumber
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    v{v.versionNumber} {v.isPublished && '★'}
                  </button>
                ))}
              </div>
            </div>

            {template.versions?.some((v) => v.versionNumber === activeVersionNumber && !v.isPublished) && (
              <button
                onClick={() => {
                  const ver = template.versions?.find((v) => v.versionNumber === activeVersionNumber);
                  if (ver) handlePublishActive(ver.id);
                }}
                className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs transition-colors border border-emerald-200"
              >
                Publish v{activeVersionNumber}
              </button>
            )}
          </div>

          {/* JSON Layout Editor Container */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
            <div className="p-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-zinc-500" />
                Layout Definition (JSON AST)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFormatJson}
                  className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 bg-white hover:bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200 transition-colors"
                  title="Auto-format and indent JSON"
                >
                  Format JSON
                </button>
                {jsonSyntaxError ? (
                  <span className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    JSON Syntax Error
                  </span>
                ) : (
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Valid Structure
                  </span>
                )}
              </div>
            </div>

            <textarea
              value={jsonContent}
              onChange={handleJsonChange}
              rows={18}
              className="w-full p-4 font-mono text-xs bg-zinc-950 text-zinc-100 focus:outline-none leading-relaxed resize-y selection:bg-mehndi-600/40"
              spellCheck={false}
            />

            {jsonSyntaxError && (
              <div className="p-3 bg-rose-50 border-t border-rose-100 text-rose-700 text-xs font-mono flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">JSON Syntax Error: {jsonSyntaxError}</div>
                  <div className="text-[11px] text-rose-600 mt-1">
                    Check for missing or unclosed braces <code>{`{ }`}</code>, brackets <code>{`[ ]`}</code>, or trailing commas.
                  </div>
                </div>
              </div>
            )}

            {apiError && (
              <div className="p-3 bg-amber-50 border-t border-amber-200 text-amber-900 text-xs flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Error: </span>
                    <span>{apiError}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setApiError(null)}
                  className="text-xs text-amber-700 hover:text-amber-900 font-bold ml-2"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          {/* Safe Variables & Filters Palette */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs">
            <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5 mb-2">
              <Sparkles className="w-4 h-4 text-mehndi-600" />
              Available Data Variables (Click to copy)
            </h3>
            <p className="text-[11px] text-zinc-500 mb-3">
              Variables are safely resolved without script execution. You can use pipes like <code>| uppercase</code>, <code>| currency:₹</code>, or <code>| date</code>.
            </p>

            <div className="flex flex-wrap gap-2">
              {variableSnippets.map((v) => (
                <button
                  key={v.code}
                  onClick={() => handleCopyVariable(v.code)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-50 hover:bg-mehndi-50 border border-zinc-200 hover:border-mehndi-300 text-[11px] text-zinc-700 hover:text-mehndi-800 transition-all group"
                  title={`Click to copy: ${v.code}`}
                >
                  <span className="font-semibold">{v.label}:</span>
                  <code className="font-mono text-[10px] text-zinc-500 group-hover:text-mehndi-600">
                    {v.code}
                  </code>
                  {copiedVar === v.code ? (
                    <Check className="w-3 h-3 text-emerald-600 ml-1" />
                  ) : (
                    <Copy className="w-3 h-3 text-zinc-400 group-hover:text-mehndi-500 ml-1" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: PDF Preview (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs flex flex-col h-full min-h-[600px]">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
            <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-zinc-500" />
              Live Rendered PDF Preview
            </span>
            {previewPdfBase64 && (
              <span className="text-[10px] font-bold text-emerald-600 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                PDFKit Ready
              </span>
            )}
          </div>

          <div className="flex-1 bg-zinc-100 rounded-xl overflow-hidden flex items-center justify-center border border-zinc-200">
            {previewPdfBase64 ? (
              <iframe
                src={`data:application/pdf;base64,${previewPdfBase64}#toolbar=0&navpanes=0`}
                title="Document Preview"
                className="w-full h-full min-h-[550px] border-0"
              />
            ) : (
              <div className="text-center p-6 text-zinc-400">
                <Play className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                <p className="text-xs font-medium">No preview rendered yet</p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Click "Live PDF Preview" to test your layout against sample data.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditorView;
