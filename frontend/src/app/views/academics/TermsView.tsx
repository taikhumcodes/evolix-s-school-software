import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Edit2,
  Trash2,
  Archive,
  CalendarDays,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
} from 'lucide-react';
import { AcademicsNav } from './AcademicsNav';
import {
  AcademicTerm,
  useAcademicTerms,
  useCreateAcademicTerm,
  useUpdateAcademicTerm,
  useDeleteAcademicTerm,
} from '../../../lib/api/academics';
import { useAcademicYears } from '../../../lib/api/academic-years';
import { useTenant } from '../../../core/tenancy/TenantContext';

export const TermsView: React.FC = () => {
  const { t } = useTranslation();
  const { currentTenant } = useTenant();
  const schoolId = currentTenant?.schoolId || '';
  const { data: years = [] } = useAcademicYears(schoolId);
  const activeYear = years.find((y: any) => y.is_current || y.isCurrent) || years[0];

  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const currentYearId = selectedYearId || activeYear?.id || '';

  const { data: terms = [], isLoading, refetch } = useAcademicTerms(currentYearId);
  const createTerm = useCreateAcademicTerm();
  const updateTerm = useUpdateAcademicTerm();
  const deleteTerm = useDeleteAcademicTerm();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    startDate: '',
    endDate: '',
    weightagePercent: '',
    displayOrder: 1,
    isActive: true,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingTerm(null);
    setFormData({
      name: '',
      code: '',
      startDate: '',
      endDate: '',
      weightagePercent: '',
      displayOrder: (terms.length + 1),
      isActive: true,
    });
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (term: AcademicTerm) => {
    setEditingTerm(term);
    setFormData({
      name: term.name,
      code: term.code,
      startDate: term.startDate.split('T')[0],
      endDate: term.endDate.split('T')[0],
      weightagePercent: term.weightagePercent ? String(term.weightagePercent) : '',
      displayOrder: term.displayOrder,
      isActive: term.isActive,
    });
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (formData.startDate >= formData.endDate) {
      setErrorMsg(t('academics.terms.dateOrderError', 'Start date must be earlier than end date.'));
      return;
    }

    try {
      if (editingTerm) {
        await updateTerm.mutateAsync({
          id: editingTerm.id,
          data: {
            ...formData,
            weightagePercent: formData.weightagePercent ? Number(formData.weightagePercent) : null,
          },
        });
      } else {
        await createTerm.mutateAsync({
          ...formData,
          academicYearId: currentYearId,
          weightagePercent: formData.weightagePercent ? Number(formData.weightagePercent) : null,
        });
      }
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Operation failed');
    }
  };

  const handleToggleArchive = async (term: AcademicTerm) => {
    const nextActive = !term.isActive;
    const promptMsg = nextActive
      ? t('academics.terms.confirmActivate', 'Activate this academic term?')
      : t('academics.terms.confirmDeactivate', 'Deactivate/Archive this academic term? Historical records will be preserved.');
    if (!window.confirm(promptMsg)) return;

    try {
      await updateTerm.mutateAsync({
        id: term.id,
        data: { isActive: nextActive, status: nextActive ? 'ACTIVE' : 'INACTIVE' },
      });
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDelete = async (term: AcademicTerm) => {
    if (!window.confirm(t('academics.terms.confirmDelete', 'Are you sure you want to delete this term? Note: Terms referenced by exams or timetables cannot be deleted and should be deactivated instead.'))) {
      return;
    }
    try {
      await deleteTerm.mutateAsync(term.id);
      refetch();
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === 'TERM_HAS_REFERENCES') {
        const wantsArchive = window.confirm(
          t(
            'academics.terms.promptDeactivate',
            'This term cannot be deleted because it is referenced by existing exams or timetables. Deactivate/archive it instead to preserve historical records?'
          )
        );
        if (wantsArchive) {
          try {
            await updateTerm.mutateAsync({
              id: term.id,
              data: { isActive: false, status: 'INACTIVE' },
            });
            refetch();
          } catch (archErr: any) {
            alert(archErr.response?.data?.message || archErr.message);
          }
        }
      } else {
        alert(err.response?.data?.message || err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      <AcademicsNav />

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              {t('academics.terms.manageTerms', 'Academic Terms & Semesters')}
            </h2>
            <p className="text-xs text-zinc-500">
              {t('academics.terms.manageTermsDesc', 'Break down the school calendar into discrete assessment periods')}
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
                {y.name} {y.status === 'ACTIVE' ? `(${t('common.active', 'Active')})` : ''}
              </option>
            ))}
          </select>

          <button
            onClick={openCreateModal}
            disabled={!currentYearId}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t('academics.terms.addTerm', 'Add Term')}</span>
          </button>
        </div>
      </div>

      {/* Terms Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-zinc-400 text-sm">{t('common.loading', 'Loading terms...')}</div>
        ) : terms.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-700">
              {t('academics.terms.noTerms', 'No terms configured for this academic year.')}
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              {t('academics.terms.noTermsDesc', 'Create terms like Term 1, Term 2, or Mid-Term to organize exams.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">{t('common.name', 'Term Name')}</th>
                  <th className="py-3 px-4">{t('common.code', 'Code')}</th>
                  <th className="py-3 px-4">{t('common.startDate', 'Start Date')}</th>
                  <th className="py-3 px-4">{t('common.endDate', 'End Date')}</th>
                  <th className="py-3 px-4">{t('academics.terms.weightage', 'Weightage %')}</th>
                  <th className="py-3 px-4">{t('common.status', 'Status')}</th>
                  <th className="py-3 px-4 text-right">{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {terms.map((term) => (
                  <tr key={term.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-zinc-500">{term.displayOrder}</td>
                    <td className="py-3 px-4 font-bold text-zinc-900">{term.name}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono bg-zinc-100 px-2 py-0.5 rounded text-zinc-700 font-bold">
                        {term.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-600 font-medium">
                      {new Date(term.startDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-zinc-600 font-medium">
                      {new Date(term.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-zinc-700 font-semibold">
                      {term.weightagePercent ? `${term.weightagePercent}%` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {term.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          {t('common.active', 'Active')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" />
                          {t('common.inactive', 'Inactive')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => openEditModal(term)}
                        className="p-1.5 text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                        title={t('common.edit', 'Edit')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleArchive(term)}
                        className="p-1.5 text-zinc-500 hover:text-amber-700 hover:bg-amber-50 rounded"
                        title={term.isActive ? t('common.archive', 'Deactivate / Archive') : t('common.activate', 'Activate')}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(term)}
                        className="p-1.5 text-zinc-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                        title={t('common.delete', 'Delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
              <h3 className="text-sm font-bold text-zinc-900">
                {editingTerm
                  ? t('academics.terms.editTerm', 'Edit Academic Term')
                  : t('academics.terms.newTerm', 'Create Academic Term')}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-zinc-700 mb-1">
                  {t('academics.terms.termName', 'Term Name')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Term 1 / First Semester"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    {t('common.code', 'Code')} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="TERM1"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    {t('academics.terms.weightage', 'Weightage %')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 50"
                    value={formData.weightagePercent}
                    onChange={(e) => setFormData({ ...formData, weightagePercent: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    {t('common.startDate', 'Start Date')} *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    {t('common.endDate', 'End Date')} *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center pt-2">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    {t('academics.terms.displayOrder', 'Display Order')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="termActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500"
                  />
                  <label htmlFor="termActive" className="font-bold text-zinc-700 cursor-pointer">
                    {t('common.active', 'Active')}
                  </label>
                </div>
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
                  disabled={createTerm.isPending || updateTerm.isPending}
                  className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
                >
                  {editingTerm ? t('common.saveChanges', 'Save Changes') : t('common.create', 'Create Term')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TermsView;
