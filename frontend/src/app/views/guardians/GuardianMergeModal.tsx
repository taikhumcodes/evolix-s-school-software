import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  GitMerge,
  AlertTriangle,
  CheckCircle2,
  Users,
  Search,
} from 'lucide-react';
import {
  useGuardians,
  useGuardian,
  useMergeGuardians,
} from '../../../lib/api/guardians';

interface GuardianMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCanonicalId?: string;
  defaultDuplicateId?: string;
}

export const GuardianMergeModal: React.FC<GuardianMergeModalProps> = ({
  isOpen,
  onClose,
  defaultCanonicalId,
  defaultDuplicateId,
}) => {
  const { t } = useTranslation();

  const [canonicalId, setCanonicalId] = useState<string>(defaultCanonicalId || '');
  const [duplicateId, setDuplicateId] = useState<string>(defaultDuplicateId || '');
  const [searchTermA, setSearchTermA] = useState('');
  const [searchTermB, setSearchTermB] = useState('');

  // Search queries for selectors
  const { data: searchResultsA } = useGuardians({
    search: searchTermA,
    limit: 8,
    status: 'ACTIVE',
  });

  const { data: searchResultsB } = useGuardians({
    search: searchTermB,
    limit: 8,
    status: 'ACTIVE',
  });

  // Fetch full details of both candidates
  const { data: canonicalGuardian } = useGuardian(canonicalId || undefined);
  const { data: duplicateGuardian } = useGuardian(duplicateId || undefined);

  // Field selections (defaults to canonical values)
  const [selectedValues, setSelectedValues] = useState<Record<string, 'A' | 'B'>>({
    firstName: 'A',
    lastName: 'A',
    phone: 'A',
    email: 'A',
    address: 'A',
    city: 'A',
    occupation: 'A',
    preferredLanguage: 'A',
  });

  const mergeMutation = useMergeGuardians();

  if (!isOpen) return null;

  const handleFieldToggle = (field: string, choice: 'A' | 'B') => {
    setSelectedValues((prev) => ({ ...prev, [field]: choice }));
  };

  const handleExecuteMerge = async () => {
    if (!canonicalId || !duplicateId) return;
    if (canonicalId === duplicateId) return;

    const resolvedFields: any = {};
    const fields = [
      'firstName',
      'lastName',
      'phone',
      'email',
      'address',
      'city',
      'occupation',
      'preferredLanguage',
    ];

    fields.forEach((field) => {
      const choice = selectedValues[field] || 'A';
      const source = choice === 'A' ? canonicalGuardian : duplicateGuardian;
      if (source && (source as any)[field] !== undefined) {
        resolvedFields[field] = (source as any)[field];
      }
    });

    try {
      await mergeMutation.mutateAsync({
        canonicalGuardianId: canonicalId,
        duplicateGuardianId: duplicateId,
        resolvedFields,
      });
      onClose();
    } catch (err) {
      console.error('Merge failed:', err);
    }
  };

  const comparisonFields = [
    { key: 'firstName', label: t('parentsModule.fields.firstName', 'First Name') },
    { key: 'lastName', label: t('parentsModule.fields.lastName', 'Last Name') },
    { key: 'relationship', label: t('parentsModule.fields.relationship', 'Relationship') },
    { key: 'phone', label: t('parentsModule.fields.phone', 'Phone') },
    { key: 'email', label: t('parentsModule.fields.email', 'Email') },
    { key: 'occupation', label: t('parentsModule.fields.occupation', 'Occupation') },
    { key: 'address', label: t('parentsModule.fields.address', 'Address') },
    { key: 'city', label: t('parentsModule.fields.city', 'City') },
    { key: 'preferredLanguage', label: t('parentsModule.fields.language', 'Language') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <GitMerge className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                {t('parentsModule.merge.title', 'Merge Duplicate Guardians')}
              </h2>
              <p className="text-xs text-zinc-500">
                {t(
                  'parentsModule.merge.subtitle',
                  'Resolve conflicting data side-by-side and transfer all student relationships'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Guardian Selectors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column A: Canonical */}
            <div className="space-y-3 bg-emerald-50/40 p-4 rounded-xl border border-emerald-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t('parentsModule.merge.canonicalTitle', 'Canonical Record (Keep)')}
                </span>
                {canonicalGuardian && (
                  <button
                    onClick={() => setCanonicalId('')}
                    className="text-[11px] text-emerald-700 hover:underline"
                  >
                    Change
                  </button>
                )}
              </div>

              {!canonicalGuardian ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search by name or phone..."
                      value={searchTermA}
                      onChange={(e) => setSearchTermA(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white"
                    />
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 bg-white rounded-lg border border-zinc-200 p-1">
                    {searchResultsA?.data.map((g) => (
                      <div
                        key={g.id}
                        onClick={() => setCanonicalId(g.id)}
                        className={`p-2 rounded text-xs cursor-pointer hover:bg-emerald-50 flex items-center justify-between ${
                          g.id === duplicateId ? 'opacity-40 pointer-events-none' : ''
                        }`}
                      >
                        <div>
                          <p className="font-bold text-zinc-900">{g.fullName}</p>
                          <p className="text-[11px] text-zinc-500">
                            {g.phone} {g.relationship ? `(${g.relationship})` : ''}
                          </p>
                        </div>
                        <span className="text-[10px] text-zinc-400">
                          {g.childrenCount} children
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white p-3 rounded-lg border border-emerald-200 text-xs">
                  <p className="font-bold text-zinc-900 text-sm">{canonicalGuardian.fullName}</p>
                  <p className="text-zinc-600 mt-0.5">{canonicalGuardian.phone}</p>
                  <p className="text-zinc-500">{canonicalGuardian.email || 'No email'}</p>
                  <div className="mt-2 pt-2 border-t border-zinc-100 flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                    <Users className="w-3 h-3" />
                    <span>{canonicalGuardian.students?.length ?? 0} linked children</span>
                  </div>
                </div>
              )}
            </div>

            {/* Column B: Duplicate */}
            <div className="space-y-3 bg-amber-50/40 p-4 rounded-xl border border-amber-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {t('parentsModule.merge.duplicateTitle', 'Duplicate Record (Archive)')}
                </span>
                {duplicateGuardian && (
                  <button
                    onClick={() => setDuplicateId('')}
                    className="text-[11px] text-amber-700 hover:underline"
                  >
                    Change
                  </button>
                )}
              </div>

              {!duplicateGuardian ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search by name or phone..."
                      value={searchTermB}
                      onChange={(e) => setSearchTermB(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white"
                    />
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 bg-white rounded-lg border border-zinc-200 p-1">
                    {searchResultsB?.data.map((g) => (
                      <div
                        key={g.id}
                        onClick={() => setDuplicateId(g.id)}
                        className={`p-2 rounded text-xs cursor-pointer hover:bg-amber-50 flex items-center justify-between ${
                          g.id === canonicalId ? 'opacity-40 pointer-events-none' : ''
                        }`}
                      >
                        <div>
                          <p className="font-bold text-zinc-900">{g.fullName}</p>
                          <p className="text-[11px] text-zinc-500">
                            {g.phone} {g.relationship ? `(${g.relationship})` : ''}
                          </p>
                        </div>
                        <span className="text-[10px] text-zinc-400">
                          {g.childrenCount} children
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white p-3 rounded-lg border border-amber-200 text-xs">
                  <p className="font-bold text-zinc-900 text-sm">{duplicateGuardian.fullName}</p>
                  <p className="text-zinc-600 mt-0.5">{duplicateGuardian.phone}</p>
                  <p className="text-zinc-500">{duplicateGuardian.email || 'No email'}</p>
                  <div className="mt-2 pt-2 border-t border-zinc-100 flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                    <Users className="w-3 h-3" />
                    <span>{duplicateGuardian.students?.length ?? 0} linked children (will transfer)</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Side-by-Side Field Selection Table */}
          {canonicalGuardian && duplicateGuardian && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                  {t('parentsModule.merge.selectFields', 'Choose which field values to keep')}
                </h4>
                <span className="text-[11px] text-zinc-400">
                  Click on either column to select value
                </span>
              </div>

              <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full divide-y divide-zinc-200">
                  <thead className="bg-zinc-50 text-zinc-500">
                    <tr>
                      <th className="py-2.5 px-4 text-left font-semibold w-1/4">Field</th>
                      <th className="py-2.5 px-4 text-left font-semibold w-3/8 text-emerald-800 bg-emerald-50/50">
                        Canonical Record (A)
                      </th>
                      <th className="py-2.5 px-4 text-left font-semibold w-3/8 text-amber-800 bg-amber-50/50">
                        Duplicate Record (B)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {comparisonFields.map(({ key, label }) => {
                      const valA = (canonicalGuardian as any)[key] || '—';
                      const valB = (duplicateGuardian as any)[key] || '—';
                      const isSelectedA = (selectedValues[key] || 'A') === 'A';

                      return (
                        <tr key={key} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="py-2.5 px-4 font-medium text-zinc-600">{label}</td>
                          <td
                            onClick={() => handleFieldToggle(key, 'A')}
                            className={`py-2.5 px-4 cursor-pointer transition-colors ${
                              isSelectedA
                                ? 'bg-emerald-100/60 font-bold text-emerald-950 border-l-2 border-emerald-500'
                                : 'text-zinc-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{String(valA)}</span>
                              {isSelectedA && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                            </div>
                          </td>
                          <td
                            onClick={() => handleFieldToggle(key, 'B')}
                            className={`py-2.5 px-4 cursor-pointer transition-colors ${
                              !isSelectedA
                                ? 'bg-amber-100/60 font-bold text-amber-950 border-l-2 border-amber-500'
                                : 'text-zinc-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{String(valB)}</span>
                              {!isSelectedA && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Merge Impact Warning Notice */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">
                    {t('parentsModule.merge.warningTitle', 'Atomic Transfer & Archive Notice')}
                  </p>
                  <p className="text-zinc-600 text-[11px] leading-relaxed">
                    Executing this merge will transfer all student links, uploaded documents, and staff notes from{' '}
                    <strong>{duplicateGuardian.fullName}</strong> to{' '}
                    <strong>{canonicalGuardian.fullName}</strong>. The duplicate guardian record will be safely archived with a full audit log entry.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-between bg-zinc-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </button>

          <button
            type="button"
            disabled={
              !canonicalId ||
              !duplicateId ||
              canonicalId === duplicateId ||
              mergeMutation.isPending
            }
            onClick={handleExecuteMerge}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2"
          >
            <GitMerge className="w-4 h-4" />
            <span>
              {mergeMutation.isPending
                ? 'Merging...'
                : t('parentsModule.merge.executeButton', 'Execute Merge & Transfer')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
