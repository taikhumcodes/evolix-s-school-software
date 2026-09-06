import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Save,
  ArrowLeft,
  Users,
  Check,
} from 'lucide-react';
import { ParentsNav } from '../guardians/ParentsNav';
import {
  useFamily,
  useCreateFamily,
  useUpdateFamily,
} from '../../../lib/api/families';
import { useGuardians } from '../../../lib/api/guardians';
import { useStudents } from '../../../lib/api/students';

export default function FamilyForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: existingFamily, isLoading: isExistingLoading } = useFamily(id);
  const createMutation = useCreateFamily();
  const updateMutation = useUpdateFamily(id || '');

  // Form states
  const [familyName, setFamilyName] = useState('');
  const [primaryGuardianId, setPrimaryGuardianId] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('IN');
  const [notes, setNotes] = useState('');

  // Initial members for create mode
  const [selectedGuardianIds, setSelectedGuardianIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const [guardianSearch, setGuardianSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const { data: guardianResults } = useGuardians({
    search: guardianSearch,
    limit: 6,
    status: 'ACTIVE',
  });

  const { data: studentResults } = useStudents({
    search: studentSearch,
    limit: 6,
    status: 'ACTIVE',
  });

  useEffect(() => {
    if (existingFamily && isEdit) {
      setFamilyName(existingFamily.familyName || '');
      setPrimaryGuardianId(existingFamily.primaryGuardianId || '');
      setAddress(existingFamily.address || '');
      setCity(existingFamily.city || '');
      setState(existingFamily.state || '');
      setPostalCode(existingFamily.postalCode || '');
      setCountry(existingFamily.country || 'IN');
      setNotes(existingFamily.notes || '');
    }
  }, [existingFamily, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim()) return;

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          familyName: familyName.trim(),
          primaryGuardianId: primaryGuardianId || null,
          address: address.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          postalCode: postalCode.trim() || null,
          country,
          notes: notes.trim() || null,
        });
        navigate(`/families/${id}`);
      } else {
        const created = await createMutation.mutateAsync({
          familyName: familyName.trim(),
          primaryGuardianId: primaryGuardianId || null,
          address: address.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          postalCode: postalCode.trim() || null,
          country,
          notes: notes.trim() || null,
          guardianIds: selectedGuardianIds,
          studentIds: selectedStudentIds,
        });
        navigate(`/families/${created.id}`);
      }
    } catch (err) {
      console.error('Failed to save family:', err);
    }
  };

  const toggleStudent = (sId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(sId) ? prev.filter((item) => item !== sId) : [...prev, sId]
    );
  };

  const toggleGuardian = (gId: string) => {
    setSelectedGuardianIds((prev) => {
      if (prev.includes(gId)) {
        if (primaryGuardianId === gId) setPrimaryGuardianId('');
        return prev.filter((item) => item !== gId);
      } else {
        if (!primaryGuardianId) setPrimaryGuardianId(gId);
        return [...prev, gId];
      }
    });
  };

  if (isExistingLoading) {
    return (
      <div className="space-y-6 pb-12">
        <ParentsNav />
        <div className="py-20 text-center text-xs text-zinc-400">Loading household...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <ParentsNav />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to={isEdit ? `/families/${id}` : '/families'}
              className="p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                {isEdit
                  ? t('common.actions.edit', 'Edit Family Household')
                  : t('parentsModule.actions.createFamily', 'Create Family Household')}
              </h2>
              <p className="text-xs text-zinc-500">
                {isEdit
                  ? 'Update household details and address'
                  : 'Group siblings and guardians into a single address and family unit'}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Household'}
            </span>
          </button>
        </div>

        {/* Family Demographics */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-3">
            Household Identification
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-bold text-zinc-700 mb-1">
                Family Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sharma Household or Patel Family"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/40 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-zinc-700 mb-1">Street Address</label>
              <input
                type="text"
                placeholder="Flat / House number, Apartment, Street"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/40 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/40 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">State / Province</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/40 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">Postal Code</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/40 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/40 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-zinc-700 mb-1">Household Notes</label>
              <textarea
                rows={2}
                placeholder="Optional family notes or special custody instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 rounded-xl border border-zinc-200 bg-zinc-50/40 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Initial Member Pickers (For create mode) */}
        {!isEdit && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pick Initial Guardians */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Select Household Guardians</span>
              </h4>
              <input
                type="text"
                placeholder="Search guardian..."
                value={guardianSearch}
                onChange={(e) => setGuardianSearch(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200"
              />
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-zinc-200 rounded-xl p-1 bg-zinc-50/30 text-xs">
                {guardianResults?.data.map((g) => {
                  const isSelected = selectedGuardianIds.includes(g.id);
                  const isPrimary = primaryGuardianId === g.id;
                  return (
                    <div
                      key={g.id}
                      onClick={() => toggleGuardian(g.id)}
                      className={`p-2 rounded-lg cursor-pointer flex items-center justify-between ${
                        isSelected ? 'bg-blue-50 text-blue-900 border border-blue-200' : 'hover:bg-zinc-100'
                      }`}
                    >
                      <div>
                        <p className="font-semibold">{g.fullName}</p>
                        <p className="text-[11px] text-zinc-500">{g.phone}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrimaryGuardianId(g.id);
                            }}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              isPrimary ? 'bg-blue-600 text-white' : 'bg-zinc-200 text-zinc-700'
                            }`}
                          >
                            {isPrimary ? 'Primary' : 'Make Primary'}
                          </button>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pick Initial Siblings */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Select Siblings / Children</span>
              </h4>
              <input
                type="text"
                placeholder="Search student..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200"
              />
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-zinc-200 rounded-xl p-1 bg-zinc-50/30 text-xs">
                {studentResults?.items?.map((st: any) => {
                  const isSelected = selectedStudentIds.includes(st.id);
                  return (
                    <div
                      key={st.id}
                      onClick={() => toggleStudent(st.id)}
                      className={`p-2 rounded-lg cursor-pointer flex items-center justify-between ${
                        isSelected ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'hover:bg-zinc-100'
                      }`}
                    >
                      <div>
                        <p className="font-semibold">
                          {st.firstName} {st.lastName}
                        </p>
                        <p className="text-[11px] text-zinc-500">ID: {st.studentId}</p>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
