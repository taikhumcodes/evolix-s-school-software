import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Camera,
  Trash2,
  UserMinus,
  ArrowRightLeft,
  RotateCcw,
  Plus,
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Phone,
  Mail,
  X,
  Lock,
  CalendarCheck,
  Award,
  Printer,
} from 'lucide-react';
import { StudentsNav } from './StudentsNav';
import { useStudentSummary, useStudentLeaves } from '../../../lib/api/attendance';
import { useExamsList } from '../../../lib/api/academics';
import { ReportCardModal } from '../academics/ReportCardModal';
import {
  useStudent,
  useUploadStudentPhoto,
  useRemoveStudentPhoto,
  useChangeClassSection,
  useWithdrawStudent,
  useTransferStudent,
  useReactivateStudent,
  useLinkGuardian,
  useUnlinkGuardian,
  useUploadStudentDocument,
  useVerifyStudentDocument,
  useArchiveStudentDocument,
  useAddStudentNote,
  useAddDiscipline,
  useGuardiansSearch,
} from '../../../lib/api/students';
import { useClasses } from '../../../lib/api/master-data';
import { useAuth } from '../../../core/auth/AuthContext';
import { useTenant } from '../../../core/tenancy/TenantContext';

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const { currentTenant } = useTenant();
  const schoolId = currentTenant?.schoolId || localStorage.getItem('selected_school_id') || undefined;

  const canManage = hasPermission('students.manage');
  const canDocManage = hasPermission('student.documents.manage');
  const canDisciplineView = hasPermission('student.discipline.view');
  const canDisciplineManage = hasPermission('student.discipline.manage');

  const { data: student, isLoading, error, refetch } = useStudent(id || '');
  const { data: classes } = useClasses(schoolId);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'academic' | 'guardians' | 'documents' | 'history' | 'notes' | 'discipline' | 'attendance'
  >('overview');

  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();
  const [attendanceMonth, setAttendanceMonth] = useState(currentMonthNum);
  const [attendanceYear, setAttendanceYear] = useState(currentYearNum);

  const { data: attendanceSummary, isLoading: isAttendanceLoading } = useStudentSummary(
    id || '',
    attendanceMonth,
    attendanceYear
  );
  const { data: studentLeaves } = useStudentLeaves({
    studentId: id || undefined,
  });

  const { data: studentExams = [] } = useExamsList();
  const [selectedExamReportCardId, setSelectedExamReportCardId] = useState<string | null>(null);

  // Photo Mutation
  const uploadPhotoMutation = useUploadStudentPhoto();
  const removePhotoMutation = useRemoveStudentPhoto();

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !student) return;
    try {
      await uploadPhotoMutation.mutateAsync({ id: student.id, file });
      refetch();
    } catch (err) {
      console.error('Photo upload failed:', err);
    }
  };

  const handlePhotoRemove = async () => {
    if (!student || !window.confirm(t('studentsModule.student.removePhoto', 'Remove student photo?'))) return;
    try {
      await removePhotoMutation.mutateAsync(student.id);
      refetch();
    } catch (err) {
      console.error('Photo remove failed:', err);
    }
  };

  // Modals state
  const [showClassModal, setShowClassModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [showLinkGuardianModal, setShowLinkGuardianModal] = useState(false);
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showAddDisciplineModal, setShowAddDisciplineModal] = useState(false);
  const [modalError, setModalError] = useState('');

  // Change Class Form State
  const [newClassId, setNewClassId] = useState('');
  const [newSectionId, setNewSectionId] = useState('');
  const [newRollNumber, setNewRollNumber] = useState('');
  const [changeClassReason, setChangeClassReason] = useState('');
  const changeClassMutation = useChangeClassSection();

  // Lifecycle Form States
  const [withdrawDate, setWithdrawDate] = useState(new Date().toISOString().split('T')[0]);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawLastAttendance, setWithdrawLastAttendance] = useState('');
  const withdrawMutation = useWithdrawStudent();

  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferDestination, setTransferDestination] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const transferMutation = useTransferStudent();

  const [reactivateClassId, setReactivateClassId] = useState('');
  const [reactivateSectionId, setReactivateSectionId] = useState('');
  const [reactivateRollNumber, setReactivateRollNumber] = useState('');
  const [reactivateReason, setReactivateReason] = useState('');
  const reactivateMutation = useReactivateStudent();

  // Guardian Linking Form State
  const [guardianSearch, setGuardianSearch] = useState('');
  const { data: guardianSearchResults } = useGuardiansSearch(guardianSearch);
  const [linkRelationship, setLinkRelationship] = useState('FATHER');
  const [linkIsPrimary, setLinkIsPrimary] = useState(false);
  const [linkIsEmergency, setLinkIsEmergency] = useState(false);
  const [newGuardianData, setNewGuardianData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    occupation: '',
  });
  const linkGuardianMutation = useLinkGuardian();
  const unlinkGuardianMutation = useUnlinkGuardian();

  // Documents Form State
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('BIRTH_CERTIFICATE');
  const [docNotes, setDocNotes] = useState('');
  const uploadDocMutation = useUploadStudentDocument();
  const verifyDocMutation = useVerifyStudentDocument();
  const archiveDocMutation = useArchiveStudentDocument();

  // Notes Form State
  const [noteCategory, setNoteCategory] = useState('ACADEMIC');
  const [noteContent, setNoteContent] = useState('');
  const [noteIsConfidential, setNoteIsConfidential] = useState(false);
  const addNoteMutation = useAddStudentNote();

  // Discipline Form State
  const [disciplineDate, setDisciplineDate] = useState(new Date().toISOString().split('T')[0]);
  const [disciplineType, setDisciplineType] = useState('MISCONDUCT');
  const [disciplineTitle, setDisciplineTitle] = useState('');
  const [disciplineDescription, setDisciplineDescription] = useState('');
  const [disciplineSeverity, setDisciplineSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('LOW');
  const [disciplineAction, setDisciplineAction] = useState('');
  const addDisciplineMutation = useAddDiscipline();

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <StudentsNav />
        <div className="p-12 text-center text-xs text-zinc-400">Loading student profile...</div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="space-y-6 pb-12">
        <StudentsNav />
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700">
          Student profile not found or access denied.
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; border: string }> = {
      ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
      INACTIVE: { bg: 'bg-zinc-100', text: 'text-zinc-700', border: 'border-zinc-200' },
      WITHDRAWN: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
      TRANSFERRED: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
      ALUMNI: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    };
    const style = map[status] || { bg: 'bg-zinc-50', text: 'text-zinc-700', border: 'border-zinc-200' };
    return (
      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${style.bg} ${style.text} ${style.border}`}>
        {t(`studentsModule.status.${status}`, status)}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      <StudentsNav />

      {/* Top Breadcrumb & Profile Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/students/list"
          className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <span className="text-xs text-zinc-500">Student Directory /</span>
          <h1 className="text-xl font-black text-zinc-900">
            {student.firstName} {student.middleName || ''} {student.lastName}
          </h1>
        </div>
      </div>

      {/* 360 Header Card */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar with upload overlay */}
            <div className="relative group w-20 h-20 rounded-2xl bg-zinc-100 border-2 border-zinc-200 flex items-center justify-center font-black text-zinc-700 text-xl overflow-hidden shrink-0 shadow-inner">
              {student.photoStorageKey ? (
                <img
                  src={`/api/v1/storage/${student.photoStorageKey}`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                `${student.firstName[0]}${student.lastName[0]}`
              )}
              {canManage && (
                <label className="absolute inset-0 bg-zinc-900/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Camera className="w-5 h-5" />
                  <span className="text-[9px] font-bold mt-1">Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
                  {student.firstName} {student.lastName}
                </h2>
                {getStatusBadge(student.status)}
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-600 flex-wrap">
                <span className="font-mono bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
                  ID: <strong className="text-zinc-900">{student.studentId}</strong>
                </span>
                <span className="font-mono bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
                  ADM: <strong className="text-zinc-900">{student.admissionNumber}</strong>
                </span>
                <span className="bg-mehndi-50 text-mehndi-800 px-2 py-0.5 rounded-md border border-mehndi-200 font-bold">
                  {student.currentClass?.name || 'Class N/A'}
                  {student.currentSection?.name ? ` • Sec ${student.currentSection.name}` : ''}
                </span>
                {student.currentRollNumber && (
                  <span className="font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200 font-bold">
                    Roll #{student.currentRollNumber}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Header Action Controls */}
          {canManage && (
            <div className="flex items-center gap-2 flex-wrap">
              {student.photoStorageKey && (
                <button
                  onClick={handlePhotoRemove}
                  className="p-2 rounded-xl border border-zinc-200 hover:border-rose-200 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors"
                  title={t('studentsModule.student.removePhoto', 'Remove Photo')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => {
                  setNewClassId(student.currentClass?.id || '');
                  setNewSectionId(student.currentSection?.id || '');
                  setNewRollNumber(student.currentRollNumber || '');
                  setModalError('');
                  setShowClassModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-zinc-500" />
                <span>{t('studentsModule.actions.changeClass', 'Change Class')}</span>
              </button>

              {student.status === 'ACTIVE' && (
                <>
                  <button
                    onClick={() => {
                      setModalError('');
                      setShowWithdrawModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-100 text-xs font-semibold text-rose-700 transition-colors"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>{t('studentsModule.actions.withdraw', 'Withdraw')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setModalError('');
                      setShowTransferModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-orange-200 bg-orange-50/40 hover:bg-orange-100 text-xs font-semibold text-orange-700 transition-colors"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>{t('studentsModule.actions.transfer', 'Transfer')}</span>
                  </button>
                </>
              )}

              {(student.status === 'INACTIVE' || student.status === 'WITHDRAWN') && (
                <button
                  onClick={() => {
                    setModalError('');
                    setShowReactivateModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('studentsModule.actions.reactivate', 'Reactivate Student')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 7 Tab Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-zinc-200 pb-1">
        {[
          { id: 'overview', label: t('studentsModule.tabs.overview', 'Overview') },
          { id: 'academic', label: t('studentsModule.tabs.academic', 'Academic & Enrollment') },
          { id: 'guardians', label: t('studentsModule.tabs.guardians', 'Guardians & Family') },
          { id: 'documents', label: t('studentsModule.tabs.documents', 'Documents') },
          { id: 'history', label: t('studentsModule.tabs.history', 'Activity History') },
          { id: 'notes', label: t('studentsModule.tabs.notes', 'Staff Notes') },
          { id: 'attendance', label: t('studentsModule.tabs.attendance', 'Attendance & Leaves') },
          ...(canDisciplineView
            ? [{ id: 'discipline', label: t('studentsModule.tabs.discipline', 'Discipline') }]
            : []),
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENTS */}
      {/* 1. Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-2">
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-zinc-400 block text-[11px]">{t('studentsModule.student.dob', 'Date of Birth')}</span>
                <span className="font-semibold text-zinc-900">
                  {new Date(student.dateOfBirth).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">{t('studentsModule.student.gender', 'Gender')}</span>
                <span className="font-semibold text-zinc-900">{student.gender}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">{t('studentsModule.student.bloodGroup', 'Blood Group')}</span>
                <span className="font-semibold text-zinc-900">{student.bloodGroup || '—'}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">Place of Birth</span>
                <span className="font-semibold text-zinc-900">{student.placeOfBirth || '—'}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">Nationality</span>
                <span className="font-semibold text-zinc-900">{student.nationality || 'IN'}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">Primary Language</span>
                <span className="font-semibold text-zinc-900">{student.primaryLanguage || '—'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-2">
              {t('studentsModule.student.address', 'Residential Address')}
            </h3>
            <p className="text-xs text-zinc-800 leading-relaxed">
              {[
                student.addressLine1,
                student.addressLine2,
                student.city,
                student.state,
                student.postalCode,
                student.country,
              ]
                .filter(Boolean)
                .join(', ') || 'No address registered.'}
            </p>
            <div className="pt-3 border-t border-zinc-100 text-xs">
              <span className="text-zinc-400 block text-[11px]">Admission Date</span>
              <span className="font-semibold text-zinc-900">
                {new Date(student.admissionDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Academic & Enrollment */}
      {activeTab === 'academic' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-2 mb-4">
              Current Enrollment
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-zinc-400 block text-[11px]">{t('studentsModule.student.class', 'Class')}</span>
                <span className="text-sm font-bold text-zinc-900">
                  {student.currentClass?.name || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">{t('studentsModule.student.section', 'Section')}</span>
                <span className="text-sm font-bold text-zinc-900">
                  {student.currentSection?.name || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">{t('studentsModule.student.rollNumber', 'Roll Number')}</span>
                <span className="text-sm font-bold text-zinc-900 font-mono">
                  {student.currentRollNumber || '—'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">{t('studentsModule.student.academicYear', 'Academic Year')}</span>
                <span className="text-sm font-bold text-zinc-900">
                  {student.currentAcademicYear?.name || student.admittedAcademicYear?.name || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Enrollment History */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-2 mb-4">
              Enrollment Timeline
            </h3>
            <div className="divide-y divide-zinc-100 text-xs">
              {student.enrollments && student.enrollments.length > 0 ? (
                student.enrollments.map((enr) => (
                  <div key={enr.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-zinc-900">
                        {enr.class?.name} {enr.section?.name ? `• ${enr.section.name}` : ''}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        Year: {enr.academicYear?.name} • Enrolled: {new Date(enr.enrollmentDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                        {enr.status}
                      </span>
                      {enr.rollNumber && (
                        <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                          Roll: {enr.rollNumber}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-zinc-400">No previous enrollments.</div>
              )}
            </div>
          </div>

          {/* Examinations & Report Cards */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                <span>Academic Assessments & Report Cards</span>
              </h3>
            </div>
            <div className="divide-y divide-zinc-100 text-xs">
              {studentExams && studentExams.length > 0 ? (
                studentExams.map((exam) => (
                  <div key={exam.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-zinc-900">{exam.name}</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        Code: {exam.code} • Type: {exam.examType} • {new Date(exam.startDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          exam.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {exam.status}
                      </span>
                      {exam.status === 'PUBLISHED' && (
                        <button
                          onClick={() => setSelectedExamReportCardId(exam.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Report Card</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-zinc-400">No examination records found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Guardians */}
      {activeTab === 'guardians' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900">Linked Guardians</h3>
            {canManage && (
              <button
                onClick={() => {
                  setModalError('');
                  setShowLinkGuardianModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-semibold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('studentsModule.actions.addGuardian', 'Link Guardian')}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {student.guardians && student.guardians.length > 0 ? (
              student.guardians.map((sg) => (
                <div
                  key={sg.id}
                  className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-zinc-900 text-sm">
                        {sg.guardian?.firstName} {sg.guardian?.lastName}
                      </div>
                      <div className="text-xs font-semibold text-mehndi-700 uppercase mt-0.5">
                        {sg.relationship}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {sg.isPrimary && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Primary
                        </span>
                      )}
                      {sg.isEmergencyContact && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                          Emergency
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-zinc-600 pt-2 border-t border-zinc-100">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="font-mono">{sg.guardian?.phone}</span>
                    </div>
                    {sg.guardian?.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{sg.guardian.email}</span>
                      </div>
                    )}
                    {sg.guardian?.occupation && (
                      <div className="text-[11px] text-zinc-500">
                        Occupation: {sg.guardian.occupation}
                      </div>
                    )}
                  </div>

                  {canManage && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={async () => {
                          if (window.confirm('Unlink this guardian from student?')) {
                            await unlinkGuardianMutation.mutateAsync({
                              id: student.id,
                              guardianId: sg.guardian.id,
                            });
                            refetch();
                          }
                        }}
                        className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                      >
                        Unlink
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-2 p-8 text-center text-xs text-zinc-400 bg-white rounded-2xl border border-zinc-200">
                No guardians linked.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900">Student Documents</h3>
            {canDocManage && (
              <button
                onClick={() => {
                  setModalError('');
                  setShowUploadDocModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-semibold shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{t('studentsModule.actions.uploadDoc', 'Upload Document')}</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-4">{t('studentsModule.document.type', 'Type')}</th>
                    <th className="py-3 px-4">{t('studentsModule.document.fileName', 'File')}</th>
                    <th className="py-3 px-4">{t('studentsModule.document.status', 'Status')}</th>
                    <th className="py-3 px-4">Uploaded On</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {student.documents && student.documents.length > 0 ? (
                    student.documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-zinc-50/80">
                        <td className="py-3 px-4 font-bold text-zinc-900">
                          {t(`studentsModule.document.types.${doc.documentType}`, doc.documentType)}
                        </td>
                        <td className="py-3 px-4">
                          <a
                            href={`/api/v1/storage/${doc.storageKey}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-mehndi-700 hover:underline font-medium flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{doc.originalFileName}</span>
                          </a>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                              doc.verificationStatus === 'VERIFIED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : doc.verificationStatus === 'REJECTED'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {doc.verificationStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-500">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {canDocManage && (
                            <div className="flex items-center justify-end gap-2">
                              {doc.verificationStatus === 'PENDING' && (
                                <>
                                  <button
                                    onClick={async () => {
                                      await verifyDocMutation.mutateAsync({
                                        id: student.id,
                                        docId: doc.id,
                                        status: 'VERIFIED',
                                      });
                                      refetch();
                                    }}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                    title="Verify"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const notes = window.prompt('Enter rejection reason:');
                                      if (notes) {
                                        await verifyDocMutation.mutateAsync({
                                          id: student.id,
                                          docId: doc.id,
                                          status: 'REJECTED',
                                          notes,
                                        });
                                        refetch();
                                      }
                                    }}
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                    title="Reject"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={async () => {
                                  if (window.confirm('Delete this document?')) {
                                    await archiveDocMutation.mutateAsync({
                                      id: student.id,
                                      docId: doc.id,
                                    });
                                    refetch();
                                  }
                                }}
                                className="p-1 text-zinc-400 hover:text-rose-600"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-400">
                        No documents uploaded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-2">
            Status Change Records & Lifecycle History
          </h3>
          {student.statusChangeDate ? (
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-1">
              <div className="font-bold text-zinc-900">
                Current Status: {student.status}
              </div>
              <div>Effective Date: {new Date(student.statusChangeDate).toLocaleDateString()}</div>
              {student.statusReason && <div>Reason: {student.statusReason}</div>}
              {student.destinationSchool && <div>Destination: {student.destinationSchool}</div>}
              {student.lastAttendanceDate && (
                <div>Last Attendance: {new Date(student.lastAttendanceDate).toLocaleDateString()}</div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-zinc-400">
              No status changes recorded. Student enrolled on {new Date(student.admissionDate).toLocaleDateString()}.
            </div>
          )}
        </div>
      )}

      {/* 6. Staff Notes */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900">Internal Staff Notes</h3>
            {canManage && (
              <button
                onClick={() => {
                  setModalError('');
                  setShowAddNoteModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-semibold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('studentsModule.actions.addNote', 'Add Note')}</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {student.notes && student.notes.length > 0 ? (
              student.notes.map((n) => (
                <div key={n.id} className="bg-white rounded-2xl border border-zinc-200/80 p-4 shadow-sm text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-zinc-500">
                        {n.category}
                      </span>
                      {n.isConfidential && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                          <Lock className="w-2.5 h-2.5" />
                          Confidential
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-zinc-800 leading-relaxed">{n.content}</p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-zinc-400 bg-white rounded-2xl border border-zinc-200">
                No staff notes recorded.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. Discipline (Confidential) */}
      {activeTab === 'discipline' && canDisciplineView && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-zinc-900">Confidential Discipline Records</h3>
            </div>
            {canDisciplineManage && (
              <button
                onClick={() => {
                  setModalError('');
                  setShowAddDisciplineModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm shadow-rose-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('studentsModule.actions.addDiscipline', 'Record Incident')}</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {student.disciplines && student.disciplines.length > 0 ? (
              student.disciplines.map((d) => (
                <div
                  key={d.id}
                  className="bg-white rounded-2xl border border-rose-200/80 p-5 shadow-sm space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 text-sm">{d.title}</span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          d.severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800'
                            : d.severity === 'HIGH'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {d.severity}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400">
                      {new Date(d.incidentDate).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-zinc-700 leading-relaxed">{d.description}</p>

                  {d.actionTaken && (
                    <div className="pt-2 border-t border-zinc-100 text-[11px] text-zinc-600">
                      <strong>Action Taken:</strong> {d.actionTaken}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-zinc-400 bg-white rounded-2xl border border-zinc-200">
                No disciplinary incidents logged.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. Attendance & Leave Records */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Month & Year Selection Header */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  {t('studentsModule.attendance.summaryTitle', 'Attendance & Academic Participation')}
                </h3>
                <p className="text-xs text-zinc-500">
                  {t(
                    'studentsModule.attendance.summarySubtitle',
                    'Calculated strictly against validated school working days.'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={attendanceMonth}
                onChange={(e) => setAttendanceMonth(Number(e.target.value))}
                className="text-xs font-semibold rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {[
                  { value: 1, label: 'January' },
                  { value: 2, label: 'February' },
                  { value: 3, label: 'March' },
                  { value: 4, label: 'April' },
                  { value: 5, label: 'May' },
                  { value: 6, label: 'June' },
                  { value: 7, label: 'July' },
                  { value: 8, label: 'August' },
                  { value: 9, label: 'September' },
                  { value: 10, label: 'October' },
                  { value: 11, label: 'November' },
                  { value: 12, label: 'December' },
                ].map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={attendanceYear}
                onChange={(e) => setAttendanceYear(Number(e.target.value))}
                className="w-20 text-xs font-semibold rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* KPI Cards */}
          {isAttendanceLoading ? (
            <div className="p-8 text-center text-xs text-zinc-400 bg-white rounded-2xl border border-zinc-200">
              Loading attendance data...
            </div>
          ) : attendanceSummary ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Attendance Rate */}
                <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm space-y-2">
                  <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider block">
                    {t('studentsModule.attendance.rate', 'Attendance Rate')}
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span
                      className={`text-2xl font-black ${
                        Number(attendanceSummary.percentage) < 75
                          ? 'text-rose-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {attendanceSummary.percentage}%
                    </span>
                    {Number(attendanceSummary.percentage) < 75 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                        Below 75%
                      </span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        Number(attendanceSummary.percentage) < 75
                          ? 'bg-rose-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, Number(attendanceSummary.percentage)))}%` }}
                    />
                  </div>
                </div>

                {/* Working Days */}
                <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm space-y-1">
                  <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider block">
                    {t('studentsModule.attendance.workingDays', 'School Working Days')}
                  </span>
                  <div className="text-2xl font-black text-zinc-900">
                    {attendanceSummary.workingDays}
                  </div>
                  <span className="text-[11px] text-zinc-400">Excludes holidays & weekends</span>
                </div>

                {/* Present Days */}
                <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm space-y-1">
                  <span className="text-emerald-600 text-xs font-bold uppercase tracking-wider block">
                    {t('attendanceModule.statuses.PRESENT', 'Present')}
                  </span>
                  <div className="text-2xl font-black text-emerald-700">
                    {attendanceSummary.counts?.present || 0}
                  </div>
                  <span className="text-[11px] text-zinc-400">Days attended</span>
                </div>

                {/* Absent Days */}
                <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm space-y-1">
                  <span className="text-rose-600 text-xs font-bold uppercase tracking-wider block">
                    {t('attendanceModule.statuses.ABSENT', 'Absent')}
                  </span>
                  <div className="text-2xl font-black text-rose-700">
                    {attendanceSummary.counts?.absent || 0}
                  </div>
                  <span className="text-[11px] text-zinc-400">Unexcused absences</span>
                </div>
              </div>

              {/* Status Breakdown Bar */}
              <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                  Detailed Status Breakdown
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/60">
                    <span className="text-amber-800 font-semibold block">Late</span>
                    <span className="text-lg font-bold text-amber-900">
                      {attendanceSummary.counts?.late || 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200/60">
                    <span className="text-blue-800 font-semibold block">Half Day</span>
                    <span className="text-lg font-bold text-blue-900">
                      {attendanceSummary.counts?.halfDay || 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200/60">
                    <span className="text-purple-800 font-semibold block">Excused</span>
                    <span className="text-lg font-bold text-purple-900">
                      {attendanceSummary.counts?.excused || 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200/60">
                    <span className="text-indigo-800 font-semibold block">Approved Leave</span>
                    <span className="text-lg font-bold text-indigo-900">
                      {attendanceSummary.counts?.leave || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Student Leave Applications History */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-zinc-900">
                  {t('studentsModule.attendance.leaveHistory', 'Leave Applications')}
                </h4>
                <p className="text-xs text-zinc-500">
                  Formal leave requests submitted by parent or school staff.
                </p>
              </div>
              <Link
                to="/attendance/student-leave"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                Manage All Leaves →
              </Link>
            </div>

            {!studentLeaves || studentLeaves.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400">
                No leave applications on record for this student.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {studentLeaves.map((lv) => (
                  <div key={lv.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900">
                          {lv.startDate} → {lv.endDate}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-700">
                          {lv.leaveType}
                        </span>
                      </div>
                      <p className="text-zinc-600 mt-1">{lv.reason}</p>
                      {lv.rejectionReason && (
                        <p className="text-rose-600 mt-0.5 font-medium">
                          Rejection note: {lv.rejectionReason}
                        </p>
                      )}
                    </div>
                    <div>
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          lv.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : lv.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {lv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Change Class Modal */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full border border-zinc-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-sm">Change Class / Section</h3>
              <button onClick={() => setShowClassModal(false)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            {modalError && <div className="text-xs text-rose-600">{modalError}</div>}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Target Class *</label>
                <select
                  value={newClassId}
                  onChange={(e) => {
                    setNewClassId(e.target.value);
                    setNewSectionId('');
                  }}
                  className="w-full p-2 rounded-xl border border-zinc-200"
                >
                  <option value="">Select Class</option>
                  {classes?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Target Section</label>
                <select
                  value={newSectionId}
                  onChange={(e) => setNewSectionId(e.target.value)}
                  className="w-full p-2 rounded-xl border border-zinc-200"
                >
                  <option value="">Select Section</option>
                  {classes
                    ?.find((c) => c.id === newClassId)
                    ?.sections?.map((s) => (
                      <option key={s.sectionId} value={s.sectionId}>
                        {s.section?.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Roll Number</label>
                <input
                  type="text"
                  value={newRollNumber}
                  onChange={(e) => setNewRollNumber(e.target.value)}
                  className="w-full p-2 rounded-xl border border-zinc-200 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Reason / Remarks</label>
                <input
                  type="text"
                  value={changeClassReason}
                  onChange={(e) => setChangeClassReason(e.target.value)}
                  placeholder="e.g. Promotion, section reallocation"
                  className="w-full p-2 rounded-xl border border-zinc-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowClassModal(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={changeClassMutation.isPending || !newClassId}
                onClick={async () => {
                  try {
                    await changeClassMutation.mutateAsync({
                      id: student.id,
                      data: {
                        classId: newClassId,
                        sectionId: newSectionId || null,
                        rollNumber: newRollNumber || null,
                        remarks: changeClassReason || undefined,
                      },
                    });
                    setShowClassModal(false);
                    refetch();
                  } catch (err: any) {
                    setModalError(err?.response?.data?.message || err.message);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full border border-zinc-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-sm">Withdraw Student</h3>
              <button onClick={() => setShowWithdrawModal(false)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            {modalError && <div className="text-xs text-rose-600">{modalError}</div>}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Effective Date *</label>
                <input
                  type="date"
                  value={withdrawDate}
                  onChange={(e) => setWithdrawDate(e.target.value)}
                  className="w-full p-2 rounded-xl border border-zinc-200"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Mandatory Reason *</label>
                <textarea
                  required
                  rows={2}
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  placeholder="Provide reason for withdrawal..."
                  className="w-full p-2 rounded-xl border border-zinc-200"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Last Attendance Date</label>
                <input
                  type="date"
                  value={withdrawLastAttendance}
                  onChange={(e) => setWithdrawLastAttendance(e.target.value)}
                  className="w-full p-2 rounded-xl border border-zinc-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={withdrawMutation.isPending || !withdrawReason.trim()}
                onClick={async () => {
                  try {
                    await withdrawMutation.mutateAsync({
                      id: student.id,
                      data: {
                        effectiveDate: withdrawDate,
                        reason: withdrawReason.trim(),
                        lastAttendanceDate: withdrawLastAttendance || undefined,
                      },
                    });
                    setShowWithdrawModal(false);
                    refetch();
                  } catch (err: any) {
                    setModalError(err?.response?.data?.message || err.message);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
              >
                Confirm Withdrawal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full border border-zinc-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-sm">Transfer Student Out</h3>
              <button onClick={() => setShowTransferModal(false)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            {modalError && <div className="text-xs text-rose-600">{modalError}</div>}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Destination School *</label>
                <input
                  type="text"
                  required
                  value={transferDestination}
                  onChange={(e) => setTransferDestination(e.target.value)}
                  placeholder="Target school name..."
                  className="w-full p-2 rounded-xl border border-zinc-200"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Effective Date *</label>
                <input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="w-full p-2 rounded-xl border border-zinc-200"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Reason</label>
                <textarea
                  rows={2}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Relocation, etc."
                  className="w-full p-2 rounded-xl border border-zinc-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={transferMutation.isPending || !transferDestination.trim()}
                onClick={async () => {
                  try {
                    await transferMutation.mutateAsync({
                      id: student.id,
                      data: {
                        destinationSchool: transferDestination.trim(),
                        effectiveDate: transferDate,
                        reason: transferReason.trim() || undefined,
                      },
                    });
                    setShowTransferModal(false);
                    refetch();
                  } catch (err: any) {
                    setModalError(err?.response?.data?.message || err.message);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reactivate Modal */}
      {showReactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full border border-zinc-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-sm">Reactivate Student</h3>
              <button onClick={() => setShowReactivateModal(false)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            {modalError && <div className="text-xs text-rose-600">{modalError}</div>}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Target Class *</label>
                <select
                  value={reactivateClassId}
                  onChange={(e) => {
                    setReactivateClassId(e.target.value);
                    setReactivateSectionId('');
                  }}
                  className="w-full p-2 rounded-xl border border-zinc-200"
                >
                  <option value="">Select Class</option>
                  {classes?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Target Section</label>
                <select
                  value={reactivateSectionId}
                  onChange={(e) => setReactivateSectionId(e.target.value)}
                  className="w-full p-2 rounded-xl border border-zinc-200"
                >
                  <option value="">Select Section</option>
                  {classes
                    ?.find((c) => c.id === reactivateClassId)
                    ?.sections?.map((s) => (
                      <option key={s.sectionId} value={s.sectionId}>
                        {s.section?.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Roll Number</label>
                <input
                  type="text"
                  value={reactivateRollNumber}
                  onChange={(e) => setReactivateRollNumber(e.target.value)}
                  className="w-full p-2 rounded-xl border border-zinc-200 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Mandatory Reason *</label>
                <textarea
                  required
                  rows={2}
                  value={reactivateReason}
                  onChange={(e) => setReactivateReason(e.target.value)}
                  placeholder="Reason for reactivation..."
                  className="w-full p-2 rounded-xl border border-zinc-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowReactivateModal(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reactivateMutation.isPending || !reactivateClassId || !reactivateReason.trim()}
                onClick={async () => {
                  try {
                    await reactivateMutation.mutateAsync({
                      id: student.id,
                      data: {
                        classId: reactivateClassId,
                        sectionId: reactivateSectionId || null,
                        rollNumber: reactivateRollNumber || null,
                        reason: reactivateReason.trim(),
                      },
                    });
                    setShowReactivateModal(false);
                    refetch();
                  } catch (err: any) {
                    setModalError(err?.response?.data?.message || err.message);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                Confirm Reactivation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full border border-zinc-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-sm">Upload Student Document</h3>
              <button onClick={() => setShowUploadDocModal(false)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            {modalError && <div className="text-xs text-rose-600">{modalError}</div>}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Document Type *</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full p-2 rounded-xl border border-zinc-200"
                >
                  <option value="BIRTH_CERTIFICATE">Birth Certificate</option>
                  <option value="PREVIOUS_REPORT">Previous Marksheet</option>
                  <option value="TRANSFER_CERTIFICATE">Transfer Certificate (TC)</option>
                  <option value="IDENTITY_PROOF">Identity Proof (Aadhaar/Govt)</option>
                  <option value="PASSPORT_PHOTO">Passport Photo</option>
                  <option value="ADDRESS_PROOF">Address Proof</option>
                  <option value="OTHER">Other Document</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Select File *</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full p-2 rounded-xl border border-zinc-200"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Reviewer Notes (Optional)</label>
                <input
                  type="text"
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  className="w-full p-2 rounded-xl border border-zinc-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowUploadDocModal(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={uploadDocMutation.isPending || !docFile}
                onClick={async () => {
                  if (!docFile) return;
                  try {
                    await uploadDocMutation.mutateAsync({
                      id: student.id,
                      file: docFile,
                      documentType: docType,
                      notes: docNotes || undefined,
                    });
                    setShowUploadDocModal(false);
                    refetch();
                  } catch (err: any) {
                    setModalError(err?.response?.data?.message || err.message);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-mehndi-600 text-white text-xs font-bold"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full border border-zinc-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-sm">Add Staff Note</h3>
              <button onClick={() => setShowAddNoteModal(false)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Category</label>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value)}
                  className="w-full p-2 rounded-xl border border-zinc-200"
                >
                  <option value="ACADEMIC">Academic</option>
                  <option value="BEHAVIORAL">Behavioral</option>
                  <option value="MEDICAL">Medical</option>
                  <option value="GENERAL">General</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Note Content *</label>
                <textarea
                  required
                  rows={3}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full p-2 rounded-xl border border-zinc-200"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="noteConfidential"
                  checked={noteIsConfidential}
                  onChange={(e) => setNoteIsConfidential(e.target.checked)}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                />
                <label htmlFor="noteConfidential" className="text-zinc-700 font-medium">
                  Mark as confidential note
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowAddNoteModal(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={addNoteMutation.isPending || !noteContent.trim()}
                onClick={async () => {
                  try {
                    await addNoteMutation.mutateAsync({
                      id: student.id,
                      data: {
                        category: noteCategory,
                        content: noteContent.trim(),
                        isConfidential: noteIsConfidential,
                      },
                    });
                    setShowAddNoteModal(false);
                    setNoteContent('');
                    refetch();
                  } catch (err: any) {
                    setModalError(err?.response?.data?.message || err.message);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold"
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Discipline Modal */}
      {showAddDisciplineModal && canDisciplineManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full border border-zinc-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-sm">Record Discipline Incident</h3>
              <button onClick={() => setShowAddDisciplineModal(false)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Incident Type *</label>
                  <select
                    value={disciplineType}
                    onChange={(e) => setDisciplineType(e.target.value)}
                    className="w-full p-2 rounded-xl border border-zinc-200"
                  >
                    <option value="MISCONDUCT">Misconduct</option>
                    <option value="ATTENDANCE">Attendance Issue</option>
                    <option value="ACADEMIC_DISHONESTY">Academic Dishonesty</option>
                    <option value="BULLYING">Bullying / Harassment</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={disciplineDate}
                    onChange={(e) => setDisciplineDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-zinc-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Severity *</label>
                <select
                  value={disciplineSeverity}
                  onChange={(e) => setDisciplineSeverity(e.target.value as any)}
                  className="w-full p-2 rounded-xl border border-zinc-200"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={disciplineTitle}
                  onChange={(e) => setDisciplineTitle(e.target.value)}
                  placeholder="e.g. Unexcused absence, classroom disruption"
                  className="w-full p-2 rounded-xl border border-zinc-200"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={disciplineDescription}
                  onChange={(e) => setDisciplineDescription(e.target.value)}
                  placeholder="Detailed incident description..."
                  className="w-full p-2 rounded-xl border border-zinc-200"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Action Taken</label>
                <input
                  type="text"
                  value={disciplineAction}
                  onChange={(e) => setDisciplineAction(e.target.value)}
                  placeholder="Verbal warning, parent conference..."
                  className="w-full p-2 rounded-xl border border-zinc-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowAddDisciplineModal(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={addDisciplineMutation.isPending || !disciplineTitle.trim()}
                onClick={async () => {
                  try {
                    await addDisciplineMutation.mutateAsync({
                      id: student.id,
                      data: {
                        incidentDate: disciplineDate,
                        incidentType: disciplineType,
                        title: disciplineTitle.trim(),
                        description: disciplineDescription.trim(),
                        severity: disciplineSeverity,
                        actionTaken: disciplineAction.trim() || undefined,
                      },
                    });
                    setShowAddDisciplineModal(false);
                    refetch();
                  } catch (err: any) {
                    setModalError(err?.response?.data?.message || err.message);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
              >
                Save Incident
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Guardian Modal */}
      {showLinkGuardianModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-zinc-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-sm">Link Guardian to Student</h3>
              <button onClick={() => setShowLinkGuardianModal(false)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            {modalError && <div className="text-xs text-rose-600">{modalError}</div>}

            <div className="space-y-4 text-xs">
              {/* Typeahead Search Existing */}
              <div>
                <label className="block font-bold text-zinc-700 mb-1">
                  Search Existing Guardian (by phone, name, email)
                </label>
                <input
                  type="text"
                  value={guardianSearch}
                  onChange={(e) => setGuardianSearch(e.target.value)}
                  placeholder="Type at least 3 chars..."
                  className="w-full p-2 rounded-xl border border-zinc-200"
                />
                {guardianSearchResults && guardianSearchResults.length > 0 && (
                  <div className="mt-1 border border-zinc-200 rounded-xl divide-y divide-zinc-100 max-h-36 overflow-y-auto">
                    {guardianSearchResults.map((g) => (
                      <div
                        key={g.id}
                        onClick={() => {
                          setNewGuardianData({
                            firstName: g.firstName,
                            lastName: g.lastName,
                            phone: g.phone,
                            email: g.email || '',
                            occupation: g.occupation || '',
                          });
                          setLinkRelationship(g.relationship || 'GUARDIAN');
                        }}
                        className="p-2.5 hover:bg-zinc-50 cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <div className="font-bold">{g.firstName} {g.lastName}</div>
                          <div className="text-[11px] text-zinc-500">{g.phone} {g.email ? `• ${g.email}` : ''}</div>
                        </div>
                        <span className="text-[11px] font-semibold text-mehndi-700">Select</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-zinc-100 pt-3">
                <h4 className="font-bold text-zinc-800 mb-2">Guardian Profile</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={newGuardianData.firstName}
                      onChange={(e) => setNewGuardianData({ ...newGuardianData, firstName: e.target.value })}
                      className="w-full p-2 rounded-xl border border-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={newGuardianData.lastName}
                      onChange={(e) => setNewGuardianData({ ...newGuardianData, lastName: e.target.value })}
                      className="w-full p-2 rounded-xl border border-zinc-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Relationship *</label>
                    <select
                      value={linkRelationship}
                      onChange={(e) => setLinkRelationship(e.target.value)}
                      className="w-full p-2 rounded-xl border border-zinc-200"
                    >
                      <option value="FATHER">Father</option>
                      <option value="MOTHER">Mother</option>
                      <option value="GUARDIAN">Guardian</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      value={newGuardianData.phone}
                      onChange={(e) => setNewGuardianData({ ...newGuardianData, phone: e.target.value })}
                      className="w-full p-2 rounded-xl border border-zinc-200 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={newGuardianData.email}
                      onChange={(e) => setNewGuardianData({ ...newGuardianData, email: e.target.value })}
                      className="w-full p-2 rounded-xl border border-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Occupation</label>
                    <input
                      type="text"
                      value={newGuardianData.occupation}
                      onChange={(e) => setNewGuardianData({ ...newGuardianData, occupation: e.target.value })}
                      className="w-full p-2 rounded-xl border border-zinc-200"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkIsPrimary}
                      onChange={(e) => setLinkIsPrimary(e.target.checked)}
                      className="rounded border-zinc-300"
                    />
                    <span className="font-semibold text-zinc-800">Primary Contact</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkIsEmergency}
                      onChange={(e) => setLinkIsEmergency(e.target.checked)}
                      className="rounded border-zinc-300"
                    />
                    <span className="font-semibold text-zinc-800">Emergency Contact</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowLinkGuardianModal(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={linkGuardianMutation.isPending || !newGuardianData.firstName.trim() || !newGuardianData.phone.trim()}
                onClick={async () => {
                  try {
                    await linkGuardianMutation.mutateAsync({
                      id: student.id,
                      data: {
                        relationship: linkRelationship,
                        isPrimary: linkIsPrimary,
                        isEmergencyContact: linkIsEmergency,
                        guardian: {
                          firstName: newGuardianData.firstName.trim(),
                          lastName: newGuardianData.lastName.trim(),
                          relationship: linkRelationship,
                          phone: newGuardianData.phone.trim(),
                          email: newGuardianData.email.trim() || undefined,
                          occupation: newGuardianData.occupation.trim() || undefined,
                        },
                      },
                    });
                    setShowLinkGuardianModal(false);
                    refetch();
                  } catch (err: any) {
                    setModalError(err?.response?.data?.message || err.message);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-mehndi-600 text-white text-xs font-bold"
              >
                Save & Link Guardian
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedExamReportCardId && student && (
        <ReportCardModal
          examId={selectedExamReportCardId}
          studentId={student.id}
          onClose={() => setSelectedExamReportCardId(null)}
        />
      )}
    </div>
  );
}
