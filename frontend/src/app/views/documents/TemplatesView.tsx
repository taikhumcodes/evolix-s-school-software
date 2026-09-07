import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutTemplate,
  Plus,
  Search,
  Edit,
  ChevronRight,
} from 'lucide-react';
import {
  useDocumentTemplates,
  useCreateDocumentTemplate,
  DocumentCategory,
  DocumentType,
} from '../../../lib/api/documents';

export const TemplatesView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: templates, isLoading } = useDocumentTemplates({
    category: selectedCategory === 'ALL' ? undefined : selectedCategory,
    search: searchTerm.trim() || undefined,
  });

  const createTemplateMutation = useCreateDocumentTemplate();

  // Create Modal Form State
  const [newTemplate, setNewTemplate] = useState({
    code: '',
    name: '',
    documentType: 'BONAFIDE_CERTIFICATE' as DocumentType,
    category: 'STUDENT' as DocumentCategory,
    pageSize: 'A4',
    orientation: 'PORTRAIT',
    numberingPolicy: 'NUMBER_SERIES_ON_FINALIZE',
    numberSeriesCode: 'DOC_BONAFIDE',
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createTemplateMutation.mutateAsync({
        ...newTemplate,
        layoutDefinition: {
          margins: { top: 40, bottom: 40, left: 40, right: 40 },
          elements: [
            {
              id: 'header',
              type: 'TEXT',
              content: '{{school.name}}',
              style: { fontSize: 20, bold: true, alignment: 'center' },
            },
            {
              id: 'title',
              type: 'TEXT',
              content: newTemplate.name.toUpperCase(),
              style: { fontSize: 14, bold: true, alignment: 'center', marginTop: 15 },
            },
            {
              id: 'body',
              type: 'PARAGRAPH',
              content: 'This document certifies that {{student.fullName}} is a registered student.',
              style: { marginTop: 25, fontSize: 12, lineHeight: 1.6 },
            },
            {
              id: 'qr',
              type: 'QR_CODE',
              style: { width: 60, height: 60, marginTop: 30 },
            },
          ],
        },
      });
      setShowCreateModal(false);
      navigate(`/documents/templates/${created.id}/editor`);
    } catch (err) {
      console.error('Failed to create template', err);
    }
  };

  const categories: Array<{ id: string; label: string }> = [
    { id: 'ALL', label: t('common.all', 'All Categories') },
    { id: 'STUDENT', label: t('documents.category.student', 'Student') },
    { id: 'ACADEMIC', label: t('documents.category.academic', 'Academic') },
    { id: 'FINANCE', label: t('documents.category.finance', 'Finance') },
    { id: 'HR', label: t('documents.category.hr', 'HR & Payroll') },
    { id: 'OPERATIONS', label: t('documents.category.operations', 'Operations') },
  ];

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('documents.templates.searchPlaceholder', 'Search templates by code, name, type...')}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-mehndi-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white font-semibold text-xs transition-all shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{t('documents.templates.newTemplate', 'New Template')}</span>
          </button>
        </div>
      </div>

      {/* Template Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-zinc-400">
            {t('common.loading', 'Loading document templates...')}
          </div>
        ) : !templates || templates.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-zinc-200">
            <LayoutTemplate className="w-10 h-10 mx-auto text-zinc-300 mb-3" />
            <h3 className="text-sm font-bold text-zinc-800">
              {t('documents.templates.emptyTitle', 'No Document Templates Found')}
            </h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              {t('documents.templates.emptyDesc', 'Create a new template to begin designing certificates and official school documents.')}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-mehndi-600 text-white font-semibold text-xs"
            >
              {t('documents.templates.createFirst', 'Create First Template')}
            </button>
          </div>
        ) : (
          templates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200 uppercase">
                      {tpl.code}
                    </span>
                    <h3 className="text-sm font-bold text-zinc-900 mt-2 group-hover:text-mehndi-700 transition-colors">
                      {tpl.name}
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      tpl.status === 'PUBLISHED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {tpl.status}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                  <span className="px-2 py-0.5 rounded bg-zinc-50 border border-zinc-200 font-medium">
                    {tpl.category}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-zinc-50 border border-zinc-200 font-medium">
                    {tpl.pageSize} • {tpl.orientation}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-zinc-50 border border-zinc-200 font-medium">
                    v{tpl.versions?.length || 1}
                  </span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3 bg-zinc-50/70 border-t border-zinc-100 flex items-center justify-between">
                <NavLink
                  to={`/documents/templates/${tpl.id}/editor`}
                  className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>{t('documents.templates.editLayout', 'Edit Layout')}</span>
                </NavLink>

                <NavLink
                  to={`/documents/generate?templateId=${tpl.id}`}
                  className="text-xs font-bold text-mehndi-700 hover:text-mehndi-800 flex items-center gap-1"
                >
                  <span>{t('documents.templates.issueBtn', 'Issue')}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </NavLink>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200">
            <h2 className="text-lg font-bold text-zinc-900">
              {t('documents.templates.modalCreateTitle', 'Create Document Template')}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {t('documents.templates.modalCreateSubtitle', 'Define the template type, paper format, and sequence numbering policy.')}
            </p>

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  {t('documents.templates.formCode', 'Template Unique Code')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BONAFIDE_CERTIFICATE_STD"
                  value={newTemplate.code}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })
                  }
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-mono uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-mehndi-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  {t('documents.templates.formName', 'Template Display Name')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Bonafide Certificate"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-mehndi-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    {t('documents.templates.formType', 'Document Type')}
                  </label>
                  <select
                    value={newTemplate.documentType}
                    onChange={(e) => setNewTemplate({ ...newTemplate, documentType: e.target.value as DocumentType })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:bg-white"
                  >
                    <option value="BONAFIDE_CERTIFICATE">Bonafide Certificate</option>
                    <option value="TRANSFER_CERTIFICATE">Transfer Certificate (TC)</option>
                    <option value="CHARACTER_CERTIFICATE">Character Certificate</option>
                    <option value="STUDENT_ID_CARD">Student ID Card</option>
                    <option value="REPORT_CARD">Report Card / Exam Result</option>
                    <option value="FEE_RECEIPT">Fee Payment Receipt</option>
                    <option value="PAYSLIP">Salary Payslip</option>
                    <option value="SALARY_CERTIFICATE">Salary Certificate</option>
                    <option value="ROUTE_MANIFEST">Transport Route Manifest</option>
                    <option value="VISITOR_PASS">Visitor Gate Pass</option>
                    <option value="CUSTOM_DOCUMENT">Custom Document</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    {t('documents.templates.formCategory', 'Category')}
                  </label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value as DocumentCategory })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:bg-white"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="ACADEMIC">Academic</option>
                    <option value="FINANCE">Finance</option>
                    <option value="HR">HR</option>
                    <option value="PAYROLL">Payroll</option>
                    <option value="OPERATIONS">Operations</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    {t('documents.templates.formPageSize', 'Paper Size')}
                  </label>
                  <select
                    value={newTemplate.pageSize}
                    onChange={(e) => setNewTemplate({ ...newTemplate, pageSize: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:bg-white"
                  >
                    <option value="A4">A4 (Standard 210 x 297 mm)</option>
                    <option value="A5">A5 (Half A4 148 x 210 mm)</option>
                    <option value="LETTER">US Letter</option>
                    <option value="CARD_CR80">CR80 ID Card (85.6 x 54 mm)</option>
                    <option value="RECEIPT_THERMAL">Thermal Receipt (80mm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    {t('documents.templates.formOrientation', 'Orientation')}
                  </label>
                  <select
                    value={newTemplate.orientation}
                    onChange={(e) => setNewTemplate({ ...newTemplate, orientation: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:bg-white"
                  >
                    <option value="PORTRAIT">Portrait</option>
                    <option value="LANDSCAPE">Landscape</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  {t('documents.templates.formPolicy', 'Numbering Policy')}
                </label>
                <select
                  value={newTemplate.numberingPolicy}
                  onChange={(e) => setNewTemplate({ ...newTemplate, numberingPolicy: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:bg-white"
                >
                  <option value="NUMBER_SERIES_ON_FINALIZE">NUMBER_SERIES_ON_FINALIZE (Allocate on finalize)</option>
                  <option value="SOURCE_NUMBER">SOURCE_NUMBER (Inherit from Fee receipt / Visit / Invoice)</option>
                  <option value="NO_OFFICIAL_NUMBER">NO_OFFICIAL_NUMBER (No number assigned)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createTemplateMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  {createTemplateMutation.isPending
                    ? t('common.creating', 'Creating...')
                    : t('documents.templates.createAndEdit', 'Create & Design Layout')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesView;
