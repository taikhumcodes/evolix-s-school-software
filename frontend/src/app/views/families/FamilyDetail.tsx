import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  UserPlus,
  MapPin,
  Phone,
  Mail,
  Edit,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { ParentsNav } from '../guardians/ParentsNav';
import {
  useFamily,
  useAddFamilyMember,
  useRemoveFamilyMember,
} from '../../../lib/api/families';
import { useGuardians } from '../../../lib/api/guardians';
import { useStudents } from '../../../lib/api/students';

export default function FamilyDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberType, setMemberType] = useState<'STUDENT' | 'GUARDIAN'>('STUDENT');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [guardianRole, setGuardianRole] = useState('MEMBER');

  const { data: family, isLoading } = useFamily(id);
  const addMemberMutation = useAddFamilyMember(id || '');
  const removeMemberMutation = useRemoveFamilyMember(id || '');

  const { data: studentResults } = useStudents({
    search: memberType === 'STUDENT' ? memberSearchTerm : undefined,
    limit: 5,
    status: 'ACTIVE',
  });

  const { data: guardianResults } = useGuardians({
    search: memberType === 'GUARDIAN' ? memberSearchTerm : undefined,
    limit: 5,
    status: 'ACTIVE',
  });

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <ParentsNav />
        <div className="py-20 text-center text-xs text-zinc-400">Loading household...</div>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="space-y-6 pb-12">
        <ParentsNav />
        <div className="py-20 text-center text-xs text-zinc-400">Family household not found.</div>
      </div>
    );
  }

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) return;
    try {
      await addMemberMutation.mutateAsync({
        memberType,
        memberId: selectedMemberId,
        role: memberType === 'GUARDIAN' ? guardianRole : undefined,
      });
      setIsAddMemberOpen(false);
      setSelectedMemberId('');
      setMemberSearchTerm('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <ParentsNav />

      {/* Hero Header */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <Home className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                  {family.familyName}
                </h2>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                  {family.familyNumber}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {family.siblings?.length ?? 0} siblings • {family.guardians?.length ?? 0} guardians
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddMemberOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t('parentsModule.families.addMember', 'Add Member')}</span>
            </button>
            <Link
              to={`/families/${family.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition-all"
            >
              <Edit className="w-3.5 h-3.5 text-zinc-400" />
              <span>{t('common.actions.edit', 'Edit Details')}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Grid: Address & Primary Guardian */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Primary Guardian Card */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Designated Primary Guardian
            </h3>
            {family.primaryGuardian && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Primary Contact
              </span>
            )}
          </div>

          {family.primaryGuardian ? (
            <div className="flex items-center justify-between text-xs">
              <div className="space-y-1">
                <Link
                  to={`/guardians/${family.primaryGuardian.id}`}
                  className="font-bold text-sm text-zinc-900 hover:text-mehndi-700 transition-colors"
                >
                  {family.primaryGuardian.firstName} {family.primaryGuardian.lastName}
                </Link>
                <div className="flex items-center gap-1 text-zinc-500">
                  <Phone className="w-3 h-3 text-zinc-400" />
                  <span>{family.primaryGuardian.phone}</span>
                </div>
                {family.primaryGuardian.email && (
                  <div className="flex items-center gap-1 text-zinc-500">
                    <Mail className="w-3 h-3 text-zinc-400" />
                    <span>{family.primaryGuardian.email}</span>
                  </div>
                )}
              </div>
              <Link
                to={`/guardians/${family.primaryGuardian.id}`}
                className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <p className="text-xs text-zinc-400 italic">No primary guardian assigned yet.</p>
          )}
        </div>

        {/* Household Residence Card */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 pb-3 border-b border-zinc-100">
            Household Residence Address
          </h3>
          <div className="text-xs space-y-1 text-zinc-700">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{family.address || 'No street address specified'}</p>
                <p className="text-zinc-500">
                  {[family.city, family.state, family.postalCode, family.country]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            </div>
            {family.notes && (
              <p className="text-zinc-500 text-[11px] pt-2 border-t border-zinc-100 italic">
                "{family.notes}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Siblings / Children Section */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Enrolled Children & Siblings</h3>
            <p className="text-xs text-zinc-500">
              All students belonging to this household entity.
            </p>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
            {family.siblings?.length ?? 0} Children
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(family.siblings?.length ?? 0) === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-zinc-400">
              No students added to this household yet. Click "Add Member" above.
            </div>
          ) : (
            family.siblings?.map((child) => (
              <div
                key={child.id}
                className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/40 hover:bg-white hover:border-blue-300 transition-all space-y-2 relative group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      to={`/students/${child.id}`}
                      className="font-bold text-xs text-zinc-900 hover:text-blue-700 transition-colors"
                    >
                      {child.firstName} {child.lastName}
                    </Link>
                    <p className="text-[11px] text-zinc-500">
                      Adm No: {child.admissionNumber} • ID: {child.studentId}
                    </p>
                    {child.currentClass && (
                      <p className="text-xs font-semibold text-blue-700 mt-1">
                        Class: {child.currentClass} {child.currentSection ? `(${child.currentSection})` : ''}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      removeMemberMutation.mutate({ memberType: 'STUDENT', memberId: child.id })
                    }
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-opacity"
                    title="Remove child from family"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Household Guardians Section */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Household Guardians</h3>
            <p className="text-xs text-zinc-500">
              All registered guardians and parents associated with this family unit.
            </p>
          </div>
          <span className="text-xs font-bold text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded-lg">
            {family.guardians?.length ?? 0} Guardians
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {family.guardians?.map((fg) => (
            <div
              key={fg.id}
              className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2 relative group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/guardians/${fg.guardian.id}`}
                      className="font-bold text-xs text-zinc-900 hover:text-mehndi-700 transition-colors"
                    >
                      {fg.guardian.firstName} {fg.guardian.lastName}
                    </Link>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                      {fg.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">{fg.guardian.phone}</p>
                </div>
                <button
                  onClick={() =>
                    removeMemberMutation.mutate({ memberType: 'GUARDIAN', memberId: fg.guardian.id })
                  }
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-opacity"
                  title="Remove guardian from family"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Member Modal */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-zinc-900">Add Household Member</h3>
            <form onSubmit={handleAddMemberSubmit} className="space-y-3 text-xs">
              <div className="flex items-center gap-3 border-b border-zinc-100 pb-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="mType"
                    checked={memberType === 'STUDENT'}
                    onChange={() => {
                      setMemberType('STUDENT');
                      setSelectedMemberId('');
                    }}
                  />
                  <span className="font-semibold">Student / Child</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="mType"
                    checked={memberType === 'GUARDIAN'}
                    onChange={() => {
                      setMemberType('GUARDIAN');
                      setSelectedMemberId('');
                    }}
                  />
                  <span className="font-semibold">Guardian / Parent</span>
                </label>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">
                  Search {memberType === 'STUDENT' ? 'Student' : 'Guardian'}
                </label>
                <input
                  type="text"
                  placeholder="Type name or phone/ID..."
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  className="w-full p-2 border border-zinc-200 rounded-xl mb-2"
                />

                <div className="max-h-36 overflow-y-auto space-y-1 border border-zinc-200 rounded-xl p-1 bg-zinc-50/30">
                  {memberType === 'STUDENT'
                    ? studentResults?.items?.map((st: any) => (
                        <div
                          key={st.id}
                          onClick={() => setSelectedMemberId(st.id)}
                          className={`p-2 rounded text-xs cursor-pointer ${
                            selectedMemberId === st.id ? 'bg-blue-100 font-bold text-blue-900' : 'hover:bg-zinc-100'
                          }`}
                        >
                          {st.firstName} {st.lastName} ({st.studentId})
                        </div>
                      ))
                    : guardianResults?.data.map((g) => (
                        <div
                          key={g.id}
                          onClick={() => setSelectedMemberId(g.id)}
                          className={`p-2 rounded text-xs cursor-pointer ${
                            selectedMemberId === g.id ? 'bg-blue-100 font-bold text-blue-900' : 'hover:bg-zinc-100'
                          }`}
                        >
                          {g.fullName} ({g.phone})
                        </div>
                      ))}
                </div>
              </div>

              {memberType === 'GUARDIAN' && (
                <div>
                  <label className="block text-zinc-500 mb-1">Household Role</label>
                  <select
                    value={guardianRole}
                    onChange={(e) => setGuardianRole(e.target.value)}
                    className="w-full p-2 border border-zinc-200 rounded-xl"
                  >
                    <option value="PRIMARY">Primary Guardian</option>
                    <option value="SECONDARY">Secondary Guardian</option>
                    <option value="MEMBER">Member</option>
                  </select>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-3 py-1.5 border border-zinc-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedMemberId || addMemberMutation.isPending}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                >
                  {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
