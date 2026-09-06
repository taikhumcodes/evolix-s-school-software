import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Plus,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Archive,
  RotateCcw,
  GitMerge,
  Phone,
  Mail,
  Users,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';
import { ParentsNav } from './ParentsNav';
import {
  useGuardians,
  useArchiveGuardian,
  useRestoreGuardian,
  Guardian,
} from '../../../lib/api/guardians';
import { GuardianMergeModal } from './GuardianMergeModal';
import apiClient from '../../../lib/api-client';

export default function GuardiansList() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state filters
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || 'ACTIVE';
  const relationship = searchParams.get('relationship') || 'ALL';
  const hasPortalAccess = searchParams.get('portal') || '';
  const preferredLanguage = searchParams.get('lang') || 'ALL';

  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeCanonicalId, setMergeCanonicalId] = useState<string | undefined>(undefined);
  const [portalSuccessModal, setPortalSuccessModal] = useState<{
    username: string;
    temporaryPassword?: string;
  } | null>(null);

  const { data: response, isLoading } = useGuardians({
    page,
    limit,
    search,
    status,
    relationship: relationship === 'ALL' ? undefined : relationship,
    hasPortalAccess: hasPortalAccess === '' ? undefined : hasPortalAccess,
    preferredLanguage: preferredLanguage === 'ALL' ? undefined : preferredLanguage,
  });

  const archiveMutation = useArchiveGuardian();
  const restoreMutation = useRestoreGuardian();

  const updateFilters = (newParams: Record<string, string | number | undefined>) => {
    const updated = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === undefined || val === '' || val === 'ALL') {
        updated.delete(key);
      } else {
        updated.set(key, String(val));
      }
    });
    // Reset to page 1 if changing filters
    if (!newParams.page) {
      updated.set('page', '1');
    }
    setSearchParams(updated);
  };

  const handleExport = async () => {
    try {
      const res = await apiClient.get('/api/v1/guardians/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `guardians_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleCreatePortalAccess = async (guardianId: string) => {
    try {
      const res = await apiClient.post(`/api/v1/guardians/${guardianId}/portal-access`);
      if (res.data.temporaryPassword) {
        setPortalSuccessModal({
          username: res.data.username,
          temporaryPassword: res.data.temporaryPassword,
        });
      }
    } catch (err) {
      console.error('Failed to create portal access:', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <ParentsNav
        onOpenMerge={() => {
          setMergeCanonicalId(undefined);
          setIsMergeModalOpen(true);
        }}
        onExport={handleExport}
      />

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
            <input
              type="text"
              placeholder={t(
                'parentsModule.list.searchPlaceholder',
                'Search by guardian name, phone, email, or student...'
              )}
              defaultValue={search}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateFilters({ search: (e.target as HTMLInputElement).value });
                }
              }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:border-mehndi-500 transition-colors"
            />
          </div>

          {/* Relationship Filter */}
          <div>
            <select
              value={relationship}
              onChange={(e) => updateFilters({ relationship: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white text-zinc-700"
            >
              <option value="ALL">{t('parentsModule.filters.allRelationships', 'All Relationships')}</option>
              <option value="FATHER">Father</option>
              <option value="MOTHER">Mother</option>
              <option value="GUARDIAN">Guardian</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Portal Access Filter */}
          <div>
            <select
              value={hasPortalAccess}
              onChange={(e) => updateFilters({ portal: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white text-zinc-700"
            >
              <option value="">{t('parentsModule.filters.allPortal', 'All Portal Statuses')}</option>
              <option value="true">{t('parentsModule.filters.portalActive', 'Portal Active')}</option>
              <option value="false">{t('parentsModule.filters.portalPending', 'No Portal Account')}</option>
            </select>
          </div>
        </div>

        {/* Secondary Filters (Status, Language) */}
        <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-xs flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-medium">Status:</span>
            {['ACTIVE', 'INACTIVE', 'ARCHIVED', 'ALL'].map((st) => (
              <button
                key={st}
                onClick={() => updateFilters({ status: st })}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  status === st
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-medium">Language:</span>
            {['ALL', 'en', 'hi', 'hinglish'].map((lang) => (
              <button
                key={lang}
                onClick={() => updateFilters({ lang })}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase transition-colors ${
                  preferredLanguage === lang
                    ? 'bg-mehndi-100 text-mehndi-800 border border-mehndi-300'
                    : 'text-zinc-500 hover:bg-zinc-100'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Directory Table / Cards */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-zinc-400">Loading directory...</div>
        ) : (response?.data?.length ?? 0) === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Users className="w-10 h-10 text-zinc-300 mx-auto" />
            <p className="text-sm font-semibold text-zinc-700">No guardians found</p>
            <p className="text-xs text-zinc-400">
              Try adjusting your search criteria or add a new guardian.
            </p>
            <Link
              to="/guardians/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mehndi-600 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Guardian</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/50 text-zinc-500 font-bold">
                  <th className="py-3 px-4">Guardian Profile</th>
                  <th className="py-3 px-4">Contact Details</th>
                  <th className="py-3 px-4">Linked Children</th>
                  <th className="py-3 px-4">Portal Access</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {response?.data.map((guardian: Guardian) => (
                  <tr key={guardian.id} className="hover:bg-zinc-50/70 transition-colors">
                    {/* Guardian Profile */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-mehndi-50 text-mehndi-700 font-extrabold text-xs flex items-center justify-center border border-mehndi-200/60 shrink-0">
                          {guardian.firstName?.[0]}
                          {guardian.lastName?.[0]}
                        </div>
                        <div>
                          <Link
                            to={`/guardians/${guardian.id}`}
                            className="font-bold text-zinc-900 hover:text-mehndi-700 transition-colors"
                          >
                            {guardian.fullName}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700">
                              {guardian.relationship}
                            </span>
                            {guardian.preferredLanguage && (
                              <span className="text-[10px] uppercase font-semibold text-zinc-400">
                                • {guardian.preferredLanguage}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact Details */}
                    <td className="py-3.5 px-4 text-zinc-600">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Phone className="w-3 h-3 text-zinc-400" />
                        <span>{guardian.phone}</span>
                      </div>
                      {guardian.email && (
                        <div className="flex items-center gap-1.5 text-zinc-400 mt-0.5 text-[11px]">
                          <Mail className="w-3 h-3" />
                          <span className="truncate max-w-[180px]">{guardian.email}</span>
                        </div>
                      )}
                    </td>

                    {/* Linked Children */}
                    <td className="py-3.5 px-4">
                      {(guardian.children?.length ?? 0) === 0 ? (
                        <span className="text-zinc-400 italic">No linked children</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {guardian.children?.map((c) => (
                            <Link
                              key={c.studentId}
                              to={`/students/${c.studentId}`}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
                                c.isPrimary
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                              }`}
                            >
                              <span>{c.name}</span>
                              {c.currentClass && (
                                <span className="text-[10px] text-zinc-400 font-mono">
                                  ({c.currentClass})
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Portal Access */}
                    <td className="py-3.5 px-4">
                      {guardian.hasPortalAccess ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCreatePortalAccess(guardian.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-medium text-[11px] transition-colors"
                        >
                          <ShieldAlert className="w-3 h-3 text-zinc-400" />
                          <span>Enable</span>
                        </button>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          guardian.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}
                      >
                        {guardian.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/guardians/${guardian.id}`}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors"
                          title="View 360 Profile"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => {
                            setMergeCanonicalId(guardian.id);
                            setIsMergeModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-zinc-400 hover:text-amber-700 transition-colors"
                          title="Merge Duplicate"
                        >
                          <GitMerge className="w-4 h-4" />
                        </button>
                        {guardian.status === 'ACTIVE' ? (
                          <button
                            onClick={() => archiveMutation.mutate(guardian.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors"
                            title="Archive Guardian"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => restoreMutation.mutate(guardian.id)}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-zinc-400 hover:text-emerald-600 transition-colors"
                            title="Restore Guardian"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {response && response.meta.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500 bg-zinc-50/50">
            <span>
              Showing {((page - 1) * limit) + 1} to{' '}
              {Math.min(page * limit, response.meta.total)} of {response.meta.total} records
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => updateFilters({ page: page - 1 })}
                className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 font-semibold text-zinc-700">
                {page} / {response.meta.totalPages}
              </span>
              <button
                disabled={page >= response.meta.totalPages}
                onClick={() => updateFilters({ page: page + 1 })}
                className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Merge Modal */}
      {isMergeModalOpen && (
        <GuardianMergeModal
          isOpen={isMergeModalOpen}
          onClose={() => setIsMergeModalOpen(false)}
          defaultCanonicalId={mergeCanonicalId}
        />
      )}

      {/* Portal Credentials Dialog */}
      {portalSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-2.5 text-emerald-700 font-bold">
              <CheckCircle className="w-5 h-5" />
              <span>Parent Portal Credentials Created</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Login access has been successfully provisioned. Share these temporary credentials with the parent. They will be required to create a new password on their first login.
            </p>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2 font-mono text-xs">
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase">Username / Identifier:</span>
                <span className="font-bold text-zinc-900 select-all">{portalSuccessModal.username}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase">Temporary Password:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded select-all border border-emerald-200">
                  {portalSuccessModal.temporaryPassword}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setPortalSuccessModal(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
