import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Phone,
  Mail,
  MapPin,
  Globe,
  ShieldCheck,
  ShieldAlert,
  Edit,
  Archive,
  RotateCcw,
  GitMerge,
  FileText,
  MessageSquare,
  Plus,
  CheckCircle,
  Lock,
  Upload,
  UserCheck,
  Home,
  Trash2,
} from 'lucide-react';
import { ParentsNav } from './ParentsNav';
import {
  useGuardian,
  useArchiveGuardian,
  useRestoreGuardian,
  useCreatePortalAccess,
  useDisablePortalAccess,
  useUpdatePreferences,
  useUploadGuardianDoc,
  useVerifyGuardianDoc,
  useAddGuardianNote,
  useLinkStudent,
  useUpdateStudentLink,
  useUnlinkStudent,
} from '../../../lib/api/guardians';
import { useStudents } from '../../../lib/api/students';
import { GuardianMergeModal } from './GuardianMergeModal';

export default function GuardianDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'children' | 'portal' | 'preferences' | 'documents' | 'notes'
  >('overview');

  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isLinkStudentModalOpen, setIsLinkStudentModalOpen] = useState(false);
  const [portalCredentialsModal, setPortalCredentialsModal] = useState<{
    username: string;
    temporaryPassword?: string;
  } | null>(null);

  // Queries & Mutations
  const { data: guardian, isLoading } = useGuardian(id);
  const archiveMutation = useArchiveGuardian();
  const restoreMutation = useRestoreGuardian();
  const createPortalMutation = useCreatePortalAccess(id || '');
  const disablePortalMutation = useDisablePortalAccess(id || '');
  const updatePrefsMutation = useUpdatePreferences(id || '');
  const uploadDocMutation = useUploadGuardianDoc(id || '');
  const verifyDocMutation = useVerifyGuardianDoc(id || '');
  const addNoteMutation = useAddGuardianNote(id || '');
  const linkStudentMutation = useLinkStudent(id || '');
  const updateLinkMutation = useUpdateStudentLink(id || '');
  const unlinkStudentMutation = useUnlinkStudent(id || '');

  // Local form states
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('GENERAL');
  const [noteConfidential, setNoteConfidential] = useState(false);

  // Link Student form state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [linkRelationship, setLinkRelationship] = useState('FATHER');
  const [linkIsPrimary, setLinkIsPrimary] = useState(false);
  const [linkIsEmergency, setLinkIsEmergency] = useState(false);
  const [linkHasPickup, setLinkHasPickup] = useState(true);
  const [linkLivesWith, setLinkLivesWith] = useState(true);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  const { data: studentSearchResults } = useStudents({
    search: studentSearchTerm,
    limit: 5,
    status: 'ACTIVE',
  });

  // Doc upload state
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('ID_PROOF');

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <ParentsNav />
        <div className="py-20 text-center text-xs text-zinc-400">Loading guardian profile...</div>
      </div>
    );
  }

  if (!guardian) {
    return (
      <div className="space-y-6 pb-12">
        <ParentsNav />
        <div className="py-20 text-center text-xs text-zinc-400">Guardian record not found.</div>
      </div>
    );
  }

  const handleCreatePortal = async () => {
    try {
      const res = await createPortalMutation.mutateAsync();
      if (res.temporaryPassword) {
        setPortalCredentialsModal({
          username: res.username,
          temporaryPassword: res.temporaryPassword,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocFile) return;
    try {
      await uploadDocMutation.mutateAsync({ file: selectedDocFile, documentType: docType });
      setSelectedDocFile(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    try {
      await addNoteMutation.mutateAsync({
        category: noteCategory,
        content: noteContent,
        isConfidential: noteConfidential,
      });
      setNoteContent('');
      setNoteConfidential(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLinkStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    try {
      await linkStudentMutation.mutateAsync({
        studentId: selectedStudentId,
        relationship: linkRelationship,
        isPrimary: linkIsPrimary,
        isEmergencyContact: linkIsEmergency,
        hasPickupPermission: linkHasPickup,
        livesWithStudent: linkLivesWith,
      });
      setIsLinkStudentModalOpen(false);
      setSelectedStudentId('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <ParentsNav />

      {/* Hero Profile Header */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-mehndi-600 to-mehndi-500 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-mehndi-600/20 shrink-0">
              {guardian.firstName?.[0]}
              {guardian.lastName?.[0]}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                  {guardian.fullName}
                </h2>
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                  {guardian.relationship}
                </span>
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    guardian.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                  }`}
                >
                  {guardian.status}
                </span>
                {guardian.hasPortalAccess && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Portal Active</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="font-semibold text-zinc-700">{guardian.phone}</span>
                </span>
                {guardian.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{guardian.email}</span>
                  </span>
                )}
                {guardian.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    <span>
                      {guardian.city}, {guardian.state || guardian.country}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/guardians/${guardian.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition-all"
            >
              <Edit className="w-3.5 h-3.5 text-zinc-400" />
              <span>{t('common.actions.edit', 'Edit Profile')}</span>
            </Link>

            <button
              onClick={() => setIsMergeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition-all"
            >
              <GitMerge className="w-3.5 h-3.5 text-amber-600" />
              <span>{t('parentsModule.actions.mergeDuplicates', 'Merge')}</span>
            </button>

            {guardian.status === 'ACTIVE' ? (
              <button
                onClick={() => archiveMutation.mutate(guardian.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-zinc-500 text-xs font-semibold transition-all"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{t('common.actions.archive', 'Archive')}</span>
              </button>
            ) : (
              <button
                onClick={() => restoreMutation.mutate(guardian.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('common.actions.restore', 'Restore')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Profile Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-zinc-100 pt-3 mt-5 -mb-2 text-xs font-semibold">
          {[
            { key: 'overview', label: 'Overview', icon: UserCheck },
            { key: 'children', label: `Linked Children (${guardian.students?.length ?? 0})`, icon: Users },
            { key: 'portal', label: 'Portal Access', icon: ShieldCheck },
            { key: 'preferences', label: 'Preferences', icon: Globe },
            { key: 'documents', label: `Documents (${guardian.documents?.length ?? 0})`, icon: FileText },
            { key: 'notes', label: `Notes (${guardian.notes?.length ?? 0})`, icon: MessageSquare },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === key
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Overview & Demographics */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Demographic & Contact Details */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-3">
              Demographic & Contact Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase">First Name</span>
                <span className="font-semibold text-zinc-800">{guardian.firstName}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase">Middle Name</span>
                <span className="font-semibold text-zinc-800">{guardian.middleName || '—'}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase">Last Name</span>
                <span className="font-semibold text-zinc-800">{guardian.lastName}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase">Relationship</span>
                <span className="font-semibold text-zinc-800">{guardian.relationship}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase">Primary Phone</span>
                <span className="font-semibold text-zinc-800">{guardian.phone}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase">Alternate Phone</span>
                <span className="font-semibold text-zinc-800">{guardian.altPhone || '—'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-zinc-400 block text-[10px] uppercase">Email Address</span>
                <span className="font-semibold text-zinc-800">{guardian.email || '—'}</span>
              </div>
            </div>
          </div>

          {/* Address & Employment */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-3">
              Residential & Employment Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase">Occupation</span>
                <span className="font-semibold text-zinc-800">{guardian.occupation || '—'}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase">Employer / Org</span>
                <span className="font-semibold text-zinc-800">{guardian.employer || '—'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-zinc-400 block text-[10px] uppercase">Street Address</span>
                <span className="font-semibold text-zinc-800">{guardian.address || '—'}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase">City</span>
                <span className="font-semibold text-zinc-800">{guardian.city || '—'}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase">State / Province</span>
                <span className="font-semibold text-zinc-800">{guardian.state || '—'}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase">Postal Code</span>
                <span className="font-semibold text-zinc-800">{guardian.postalCode || '—'}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase">Country</span>
                <span className="font-semibold text-zinc-800">{guardian.country}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Linked Children */}
      {activeTab === 'children' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-zinc-900 text-sm">Associated Children & Students</h3>
              <p className="text-xs text-zinc-500">
                Manage custody, pickup rights, emergency designations, and household co-residence.
              </p>
            </div>
            <button
              onClick={() => setIsLinkStudentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Link Student</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guardian.students?.map((sg) => (
              <div
                key={sg.student.id}
                className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      to={`/students/${sg.student.id}`}
                      className="font-bold text-sm text-zinc-900 hover:text-mehndi-700 transition-colors"
                    >
                      {sg.student.firstName} {sg.student.lastName}
                    </Link>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Adm No: {sg.student.admissionNumber} • ID: {sg.student.studentId}
                    </p>
                    {sg.student.enrollments?.[0] && (
                      <p className="text-xs font-medium text-mehndi-700 mt-0.5">
                        Class: {sg.student.enrollments[0].class?.name}{' '}
                        {sg.student.enrollments[0].section?.name
                          ? `(${sg.student.enrollments[0].section.name})`
                          : ''}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => unlinkStudentMutation.mutate(sg.student.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors"
                    title="Unlink student"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Flags Grid with Live Checkboxes */}
                <div className="pt-3 border-t border-zinc-100 grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sg.isPrimary}
                      onChange={(e) =>
                        updateLinkMutation.mutate({
                          studentId: sg.student.id,
                          data: { isPrimary: e.target.checked },
                        })
                      }
                      className="rounded text-mehndi-600 focus:ring-mehndi-500"
                    />
                    <span className="font-semibold text-zinc-700">Primary Guardian</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sg.isEmergencyContact}
                      onChange={(e) =>
                        updateLinkMutation.mutate({
                          studentId: sg.student.id,
                          data: { isEmergencyContact: e.target.checked },
                        })
                      }
                      className="rounded text-mehndi-600 focus:ring-mehndi-500"
                    />
                    <span className="text-zinc-700">Emergency Contact</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sg.hasPickupPermission}
                      onChange={(e) =>
                        updateLinkMutation.mutate({
                          studentId: sg.student.id,
                          data: { hasPickupPermission: e.target.checked },
                        })
                      }
                      className="rounded text-mehndi-600 focus:ring-mehndi-500"
                    />
                    <span className="text-zinc-700">Pickup Authorized</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sg.livesWithStudent}
                      onChange={(e) =>
                        updateLinkMutation.mutate({
                          studentId: sg.student.id,
                          data: { livesWithStudent: e.target.checked },
                        })
                      }
                      className="rounded text-mehndi-600 focus:ring-mehndi-500"
                    />
                    <span className="text-zinc-700">Lives Together</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* Household Siblings Callout */}
          {(guardian.householdSiblings?.length ?? 0) > 0 && (
            <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                <Home className="w-4 h-4 text-blue-600" />
                <span>Household Siblings Detected in Shared Families</span>
              </div>
              <p className="text-xs text-zinc-600">
                These students belong to the same family household as this guardian:
              </p>
              <div className="flex flex-wrap gap-2">
                {guardian.householdSiblings?.map((sib) => (
                  <Link
                    key={sib.id}
                    to={`/students/${sib.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-blue-200 text-xs font-semibold text-blue-800 hover:bg-blue-100 transition-colors"
                  >
                    <span>{sib.name}</span>
                    <span className="text-[10px] text-zinc-400">({sib.studentId})</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Portal Access */}
      {activeTab === 'portal' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-6 max-w-2xl">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Parent Portal Login Account</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Provide secure online portal access so parents can view attendance, report cards, and notices for their children only.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-700">Access Status</span>
              {guardian.hasPortalAccess ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Active Account
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Unprovisioned
                </span>
              )}
            </div>

            {guardian.user && (
              <div className="pt-2 border-t border-zinc-200/60 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Portal Username / Email:</span>
                  <span className="font-mono font-bold text-zinc-900">{guardian.user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Password Change Required:</span>
                  <span className="font-semibold text-amber-700">
                    {guardian.user.mustChangePassword ? 'Yes (First Login Pending)' : 'No (Activated)'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!guardian.hasPortalAccess ? (
              <button
                onClick={handleCreatePortal}
                disabled={createPortalMutation.isPending}
                className="px-4 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {createPortalMutation.isPending ? 'Provisioning...' : 'Provision Portal Account'}
                </span>
              </button>
            ) : (
              <button
                onClick={() => disablePortalMutation.mutate()}
                disabled={disablePortalMutation.isPending}
                className="px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-all"
              >
                Revoke Portal Access
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Communication Preferences */}
      {activeTab === 'preferences' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-6 max-w-2xl">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Communication & Language Preferences</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Select preferred language and notification dispatch channels for school announcements.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-zinc-700 mb-1.5">
                Preferred Interface & Notification Language
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'en', label: 'English' },
                  { id: 'hi', label: 'हिंदी (Hindi)' },
                  { id: 'hinglish', label: 'Hinglish' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updatePrefsMutation.mutate({ preferredLanguage: item.id as any })}
                    className={`py-2.5 px-3 rounded-xl border text-center font-bold transition-all ${
                      guardian.preferredLanguage === item.id
                        ? 'border-mehndi-600 bg-mehndi-50 text-mehndi-800'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100 space-y-3">
              <span className="block font-bold text-zinc-700">Notification Channels</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={guardian.emailNotification}
                  onChange={(e) => updatePrefsMutation.mutate({ emailNotification: e.target.checked })}
                  className="rounded text-mehndi-600 focus:ring-mehndi-500"
                />
                <span className="text-zinc-700 font-medium">Email Notifications</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={guardian.smsNotification}
                  onChange={(e) => updatePrefsMutation.mutate({ smsNotification: e.target.checked })}
                  className="rounded text-mehndi-600 focus:ring-mehndi-500"
                />
                <span className="text-zinc-700 font-medium">SMS Alerts</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={guardian.whatsappNotification}
                  onChange={(e) => updatePrefsMutation.mutate({ whatsappNotification: e.target.checked })}
                  className="rounded text-mehndi-600 focus:ring-mehndi-500"
                />
                <span className="text-zinc-700 font-medium">WhatsApp Updates</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 mb-4">Upload Verification Document</h3>
            <form onSubmit={handleUploadDoc} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-zinc-500 mb-1">Document Type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white"
                >
                  <option value="ID_PROOF">Aadhaar / National ID</option>
                  <option value="ADDRESS_PROOF">Address Proof / Utility Bill</option>
                  <option value="CUSTODY_DOCUMENT">Court Order / Custody Document</option>
                  <option value="OTHER">Other Proof Document</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Select File (PDF, PNG, JPG)</label>
                <input
                  type="file"
                  onChange={(e) => setSelectedDocFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 bg-white"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={!selectedDocFile || uploadDocMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 disabled:opacity-50 text-white font-bold transition-all flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadDocMutation.isPending ? 'Uploading...' : 'Upload Document'}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(guardian.documents?.length ?? 0) === 0 ? (
              <div className="col-span-2 py-12 text-center text-xs text-zinc-400 bg-white rounded-2xl border border-zinc-200">
                No proof documents uploaded yet.
              </div>
            ) : (
              guardian.documents?.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                        {doc.documentType}
                      </span>
                      <p className="font-bold text-xs text-zinc-900 mt-1">{doc.originalFileName}</p>
                      <p className="text-[11px] text-zinc-400">
                        {(doc.fileSize / 1024).toFixed(1)} KB • {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        doc.verificationStatus === 'VERIFIED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : doc.verificationStatus === 'REJECTED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {doc.verificationStatus}
                    </span>
                  </div>

                  {doc.verificationStatus === 'PENDING' && (
                    <div className="pt-2 border-t border-zinc-100 flex items-center gap-2">
                      <button
                        onClick={() =>
                          verifyDocMutation.mutate({
                            docId: doc.id,
                            status: 'VERIFIED',
                            verificationNotes: 'Verified by staff review',
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                      >
                        Verify
                      </button>
                      <button
                        onClick={() =>
                          verifyDocMutation.mutate({
                            docId: doc.id,
                            status: 'REJECTED',
                            verificationNotes: 'Rejected due to illegibility',
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Staff Notes */}
      {activeTab === 'notes' && (
        <div className="space-y-6 max-w-3xl">
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-zinc-900">Add Staff Internal Note</h3>
            <form onSubmit={handleAddNote} className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-zinc-500 mb-1">Category</label>
                  <select
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white"
                  >
                    <option value="GENERAL">General</option>
                    <option value="ADMINISTRATIVE">Administrative</option>
                    <option value="FINANCIAL">Financial / Fee Related</option>
                    <option value="PARENT_REQUEST">Parent Request</option>
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-rose-700">
                    <input
                      type="checkbox"
                      checked={noteConfidential}
                      onChange={(e) => setNoteConfidential(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>Mark as Confidential (Restricted to Staff Admins)</span>
                  </label>
                </div>
              </div>

              <textarea
                rows={3}
                placeholder="Type internal note here..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="w-full p-3 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:border-mehndi-500"
              />

              <button
                type="submit"
                disabled={!noteContent.trim() || addNoteMutation.isPending}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-bold transition-all"
              >
                {addNoteMutation.isPending ? 'Saving...' : 'Add Note'}
              </button>
            </form>
          </div>

          <div className="space-y-3">
            {(guardian.notes?.length ?? 0) === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-400 bg-white rounded-2xl border border-zinc-200">
                No staff notes recorded.
              </div>
            ) : (
              guardian.notes?.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 rounded-2xl border bg-white shadow-sm space-y-2 ${
                    n.isConfidential ? 'border-rose-200 bg-rose-50/20' : 'border-zinc-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-800">{n.category}</span>
                      {n.isConfidential && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                          Confidential
                        </span>
                      )}
                    </div>
                    <span className="text-zinc-400 text-[11px]">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">
                    {n.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Link Student Modal */}
      {isLinkStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-zinc-900">Link Student to Guardian</h3>
            <form onSubmit={handleLinkStudentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-500 mb-1">Search Student</label>
                <input
                  type="text"
                  placeholder="Type student name or ID..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="w-full p-2 border border-zinc-200 rounded-xl mb-2"
                />
                <div className="max-h-32 overflow-y-auto space-y-1 border border-zinc-200 rounded-xl p-1">
                  {studentSearchResults?.items?.map((st: any) => (
                    <div
                      key={st.id}
                      onClick={() => setSelectedStudentId(st.id)}
                      className={`p-2 rounded text-xs cursor-pointer ${
                        selectedStudentId === st.id ? 'bg-mehndi-100 font-bold' : 'hover:bg-zinc-50'
                      }`}
                    >
                      {st.firstName} {st.lastName} ({st.studentId})
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Relationship</label>
                <select
                  value={linkRelationship}
                  onChange={(e) => setLinkRelationship(e.target.value)}
                  className="w-full p-2 border border-zinc-200 rounded-xl"
                >
                  <option value="FATHER">Father</option>
                  <option value="MOTHER">Mother</option>
                  <option value="GUARDIAN">Guardian</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="pt-2 border-t border-zinc-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkIsPrimary}
                    onChange={(e) => setLinkIsPrimary(e.target.checked)}
                    className="rounded text-mehndi-600 focus:ring-mehndi-500"
                  />
                  <span className="font-semibold text-zinc-700">Set as Primary Guardian</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkIsEmergency}
                    onChange={(e) => setLinkIsEmergency(e.target.checked)}
                    className="rounded text-mehndi-600 focus:ring-mehndi-500"
                  />
                  <span className="text-zinc-700">Emergency Contact</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkHasPickup}
                    onChange={(e) => setLinkHasPickup(e.target.checked)}
                    className="rounded text-mehndi-600 focus:ring-mehndi-500"
                  />
                  <span className="text-zinc-700">Pickup Authorized</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkLivesWith}
                    onChange={(e) => setLinkLivesWith(e.target.checked)}
                    className="rounded text-mehndi-600 focus:ring-mehndi-500"
                  />
                  <span className="text-zinc-700">Lives with Student</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLinkStudentModalOpen(false)}
                  className="px-3 py-1.5 border border-zinc-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedStudentId || linkStudentMutation.isPending}
                  className="px-4 py-1.5 bg-mehndi-600 hover:bg-mehndi-700 text-white rounded-xl font-bold"
                >
                  {linkStudentMutation.isPending ? 'Linking...' : 'Link Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {isMergeModalOpen && (
        <GuardianMergeModal
          isOpen={isMergeModalOpen}
          onClose={() => setIsMergeModalOpen(false)}
          defaultCanonicalId={guardian.id}
        />
      )}

      {/* Portal Credentials Dialog */}
      {portalCredentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-2.5 text-emerald-700 font-bold">
              <CheckCircle className="w-5 h-5" />
              <span>Parent Portal Credentials Created</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Login access has been successfully provisioned. Share these temporary credentials with the parent. They will be required to change their password on their first login.
            </p>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2 font-mono text-xs">
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase">Username / Identifier:</span>
                <span className="font-bold text-zinc-900 select-all">{portalCredentialsModal.username}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase">Temporary Password:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded select-all border border-emerald-200">
                  {portalCredentialsModal.temporaryPassword}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setPortalCredentialsModal(null)}
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
