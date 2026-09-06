import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  UserCheck,
  FileClock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  Phone,
  Mail,
  MapPin,
  Building,
  ExternalLink,
  X,
} from 'lucide-react';
import { StudentsNav } from './StudentsNav';
import {
  useAdmission,
  useUpdateAdmissionStatus,
  useConvertAdmission,
} from '../../../lib/api/admissions';
import { useClasses } from '../../../lib/api/master-data';
import { useNextRollNumber } from '../../../lib/api/students';
import { useAuth } from '../../../core/auth/AuthContext';
import { useTenant } from '../../../core/tenancy/TenantContext';

export default function AdmissionReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const { currentTenant } = useTenant();
  const schoolId = currentTenant?.schoolId || localStorage.getItem('selected_school_id') || undefined;
  const canManage = hasPermission('admissions.manage');

  const { data: application, isLoading, error, refetch } = useAdmission(id || '');
  const { data: classes } = useClasses(schoolId);

  // Status Action Mutations
  const updateStatusMutation = useUpdateAdmissionStatus();
  const convertMutation = useConvertAdmission();

  // Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionError, setActionError] = useState('');

  // Convert Modal State
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertSectionId, setConvertSectionId] = useState('');
  const [convertRollNumber, setConvertRollNumber] = useState('');
  const [convertAdmissionDate, setConvertAdmissionDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Selected Class details for conversion
  const appliedClassDetails = classes?.find((c) => c.id === application?.appliedClassId);

  // Roll Number auto-suggest
  const { data: suggestedRoll } = useNextRollNumber({
    academicYearId: application?.academicYearId,
    classId: application?.appliedClassId,
    sectionId: convertSectionId || undefined,
  });

  useEffect(() => {
    if (suggestedRoll?.rollNumber && !convertRollNumber) {
      setConvertRollNumber(suggestedRoll.rollNumber);
    }
  }, [suggestedRoll, convertRollNumber]);

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <StudentsNav />
        <div className="p-12 text-center text-xs text-zinc-400">Loading application details...</div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="space-y-6 pb-12">
        <StudentsNav />
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700">
          Application not found or access denied.
        </div>
      </div>
    );
  }

  const handleMoveToReview = async () => {
    setActionError('');
    try {
      await updateStatusMutation.mutateAsync({
        id: application.id,
        status: 'UNDER_REVIEW',
      });
      refetch();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err.message || 'Status update failed');
    }
  };

  const handleApprove = async () => {
    setActionError('');
    try {
      await updateStatusMutation.mutateAsync({
        id: application.id,
        status: 'APPROVED',
      });
      refetch();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err.message || 'Approval failed');
    }
  };

  const handleExecuteReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setActionError(t('studentsModule.admission.rejectionReasonRequired', 'Please enter a reason for rejection.'));
      return;
    }

    setActionError('');
    try {
      await updateStatusMutation.mutateAsync({
        id: application.id,
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
        reviewNotes: reviewNotes.trim() || undefined,
      });
      setShowRejectModal(false);
      refetch();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err.message || 'Rejection failed');
    }
  };

  const handleExecuteConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    try {
      const res = await convertMutation.mutateAsync({
        id: application.id,
        conversionData: {
          classId: application.appliedClassId,
          sectionId: convertSectionId || null,
          rollNumber: convertRollNumber || null,
          admissionDate: convertAdmissionDate,
        },
      });
      setShowConvertModal(false);
      if (res.id) {
        navigate(`/students/${res.id}`);
      }
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err.message || 'Conversion failed');
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; border: string }> = {
      SUBMITTED: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
      UNDER_REVIEW: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
      REJECTED: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
      CONVERTED: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    };
    const style = map[status] || { bg: 'bg-zinc-50', text: 'text-zinc-700', border: 'border-zinc-200' };
    return (
      <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${style.bg} ${style.text} ${style.border}`}>
        {t(`studentsModule.status.${status}`, status)}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      <StudentsNav />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/students/admissions"
            className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-zinc-900 font-mono">
                {application.applicationNumber}
              </h1>
              {getStatusBadge(application.status)}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Submitted on {new Date(application.applicationDate).toLocaleDateString()} • {application.academicYear?.name}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {canManage && (
          <div className="flex items-center gap-2 flex-wrap">
            {application.status === 'SUBMITTED' && (
              <button
                onClick={handleMoveToReview}
                disabled={updateStatusMutation.isPending}
                className="px-3.5 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 flex items-center gap-1.5 transition-colors"
              >
                <FileClock className="w-4 h-4 text-blue-600" />
                <span>{t('studentsModule.admission.moveToReview', 'Move to Review')}</span>
              </button>
            )}

            {(application.status === 'SUBMITTED' || application.status === 'UNDER_REVIEW') && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={updateStatusMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('studentsModule.admission.approve', 'Approve Application')}</span>
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={updateStatusMutation.isPending}
                  className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{t('studentsModule.admission.reject', 'Reject')}</span>
                </button>
              </>
            )}

            {application.status === 'APPROVED' && (
              <button
                onClick={() => setShowConvertModal(true)}
                className="px-5 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold shadow-sm shadow-mehndi-600/20 flex items-center gap-1.5 transition-all"
              >
                <UserCheck className="w-4 h-4" />
                <span>{t('studentsModule.admission.convert', 'Convert to Student')}</span>
              </button>
            )}

            {application.status === 'CONVERTED' && application.convertedStudent && (
              <Link
                to={`/students/${application.convertedStudent.id}`}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <span>{t('studentsModule.admission.viewStudent', 'View Student Profile')}</span>
                <ExternalLink className="w-4 h-4 text-zinc-300" />
              </Link>
            )}
          </div>
        )}
      </div>

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Converted Notice */}
      {application.status === 'CONVERTED' && (
        <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
            <span>
              {t('studentsModule.admission.convertedNotice', 'This application was converted to Student on')}{' '}
              {application.convertedAt ? new Date(application.convertedAt).toLocaleDateString() : 'N/A'}.
            </span>
          </div>
          {application.convertedStudent && (
            <span className="font-mono font-bold text-purple-700">
              Student ID: {application.convertedStudent.studentId}
            </span>
          )}
        </div>
      )}

      {/* Rejection Notice */}
      {application.status === 'REJECTED' && application.rejectionReason && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
          <div className="font-bold text-rose-700">
            {t('studentsModule.admission.rejectionReason', 'Rejection Reason')}:
          </div>
          <p className="mt-1">{application.rejectionReason}</p>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Personal & Academic Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Applicant Info Card */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <Users className="w-4 h-4 text-mehndi-600" />
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">
                Applicant Information
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-zinc-400 block text-[11px]">Full Name</span>
                <span className="font-bold text-zinc-900 text-sm">
                  {application.firstName} {application.middleName || ''} {application.lastName}
                </span>
              </div>

              <div>
                <span className="text-zinc-400 block text-[11px]">{t('studentsModule.student.dob', 'Date of Birth')}</span>
                <span className="font-medium text-zinc-800">
                  {new Date(application.dateOfBirth).toLocaleDateString()}
                </span>
              </div>

              <div>
                <span className="text-zinc-400 block text-[11px]">{t('studentsModule.student.gender', 'Gender')}</span>
                <span className="font-medium text-zinc-800">{application.gender}</span>
              </div>

              <div>
                <span className="text-zinc-400 block text-[11px]">{t('studentsModule.student.bloodGroup', 'Blood Group')}</span>
                <span className="font-medium text-zinc-800">{application.bloodGroup || '—'}</span>
              </div>

              <div>
                <span className="text-zinc-400 block text-[11px]">Place of Birth</span>
                <span className="font-medium text-zinc-800">{application.placeOfBirth || '—'}</span>
              </div>

              <div>
                <span className="text-zinc-400 block text-[11px]">Nationality</span>
                <span className="font-medium text-zinc-800">{application.nationality || 'IN'}</span>
              </div>

              <div>
                <span className="text-zinc-400 block text-[11px]">Primary Language</span>
                <span className="font-medium text-zinc-800">{application.primaryLanguage || '—'}</span>
              </div>
            </div>
          </div>

          {/* Academic Preference Card */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <Building className="w-4 h-4 text-mehndi-600" />
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">
                Academic Application
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-zinc-400 block text-[11px]">{t('studentsModule.student.class', 'Applied Class')}</span>
                <span className="font-bold text-zinc-900 text-sm">
                  {application.appliedClass?.name || '—'} ({application.appliedClass?.code || '—'})
                </span>
              </div>

              <div>
                <span className="text-zinc-400 block text-[11px]">{t('studentsModule.student.academicYear', 'Target Academic Year')}</span>
                <span className="font-bold text-zinc-900 text-sm">
                  {application.academicYear?.name || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Residential Address Card */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <MapPin className="w-4 h-4 text-mehndi-600" />
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">
                {t('studentsModule.student.address', 'Residential Address')}
              </h2>
            </div>

            <p className="text-xs text-zinc-800 leading-relaxed">
              {[
                application.addressLine1,
                application.addressLine2,
                application.city,
                application.state,
                application.postalCode,
                application.country,
              ]
                .filter(Boolean)
                .join(', ') || 'No address provided'}
            </p>
          </div>

          {/* Previous Education Record */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <Building className="w-4 h-4 text-mehndi-600" />
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">
                Previous Education History
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-zinc-400 block text-[11px]">{t('studentsModule.student.previousSchool', 'Previous School')}</span>
                <span className="font-semibold text-zinc-900">{application.previousSchool || 'None'}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">{t('studentsModule.student.previousClass', 'Previous Class')}</span>
                <span className="font-semibold text-zinc-900">{application.previousClass || 'None'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Guardian & Administrative metadata */}
        <div className="space-y-6">
          {/* Guardian Card */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <Users className="w-4 h-4 text-mehndi-600" />
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">
                {t('studentsModule.tabs.guardians', 'Primary Guardian')}
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-zinc-400 block text-[11px]">Name & Relationship</span>
                <div className="font-bold text-zinc-900 text-sm">{application.guardianName}</div>
                <div className="text-[11px] font-semibold text-mehndi-700 uppercase">
                  {application.guardianRelationship}
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 space-y-2">
                <div className="flex items-center gap-2 text-zinc-700">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="font-mono">{application.guardianPhone}</span>
                </div>
                {application.guardianAltPhone && (
                  <div className="flex items-center gap-2 text-zinc-700">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="font-mono">{application.guardianAltPhone} (Alt)</span>
                  </div>
                )}
                {application.guardianEmail && (
                  <div className="flex items-center gap-2 text-zinc-700">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{application.guardianEmail}</span>
                  </div>
                )}
              </div>

              {application.guardianOccupation && (
                <div className="pt-2 border-t border-zinc-100">
                  <span className="text-zinc-400 block text-[11px]">Occupation</span>
                  <span className="font-medium text-zinc-800">{application.guardianOccupation}</span>
                </div>
              )}
            </div>
          </div>

          {/* Audit / Review Log */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-3 text-xs">
            <div className="font-bold text-zinc-900 uppercase tracking-wide text-xs border-b border-zinc-100 pb-2">
              Application Metadata
            </div>
            <div className="space-y-2 text-zinc-600 text-[11px]">
              <div className="flex justify-between">
                <span>Submitted On:</span>
                <span className="font-medium text-zinc-800">
                  {new Date(application.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span className="font-medium text-zinc-800">
                  {new Date(application.updatedAt).toLocaleString()}
                </span>
              </div>
              {application.reviewedAt && (
                <div className="flex justify-between">
                  <span>Reviewed At:</span>
                  <span className="font-medium text-zinc-800">
                    {new Date(application.reviewedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full border border-zinc-200 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900">
                {t('studentsModule.admission.reject', 'Reject Application')}
              </h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteReject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  {t('studentsModule.admission.rejectionReason', 'Rejection Reason')} *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="State the factual basis for rejection (e.g. seats full, age criteria not met)..."
                  className="w-full p-3 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  {t('studentsModule.admission.notes', 'Internal Review Notes (Optional)')}
                </label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Internal audit notes..."
                  className="w-full p-3 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-700"
                >
                  {t('studentsModule.actions.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={updateStatusMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm shadow-rose-600/20 transition-all"
                >
                  {updateStatusMutation.isPending ? 'Rejecting...' : t('studentsModule.admission.reject', 'Reject Application')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Student Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-zinc-200 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {t('studentsModule.admission.convertConfirm', 'Create Student & Complete Admission')}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  App: {application.applicationNumber} • {application.firstName} {application.lastName}
                </p>
              </div>
              <button
                onClick={() => setShowConvertModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteConvert} className="p-6 space-y-4">
              <div className="bg-mehndi-50/50 border border-mehndi-200/80 rounded-xl p-3.5 text-xs text-mehndi-900 leading-relaxed">
                {t(
                  'studentsModule.admission.convertDescription',
                  'This will atomically generate the Student ID and Admission Number, create enrollment, and link guardians.'
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {t('studentsModule.student.class', 'Assigned Class')}
                  </label>
                  <input
                    type="text"
                    disabled
                    value={application.appliedClass?.name || 'Class'}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {t('studentsModule.student.section', 'Section (Optional)')}
                  </label>
                  <select
                    value={convertSectionId}
                    onChange={(e) => setConvertSectionId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800 focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
                  >
                    <option value="">No Section</option>
                    {appliedClassDetails?.sections?.map((sec) => (
                      <option key={sec.sectionId} value={sec.sectionId}>
                        {sec.section?.name || 'Section'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {t('studentsModule.student.rollNumber', 'Roll Number')}
                  </label>
                  <input
                    type="text"
                    value={convertRollNumber}
                    onChange={(e) => setConvertRollNumber(e.target.value)}
                    placeholder="Auto-suggested"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {t('studentsModule.lifecycle.date', 'Admission Date')}
                  </label>
                  <input
                    type="date"
                    required
                    value={convertAdmissionDate}
                    onChange={(e) => setConvertAdmissionDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-700"
                >
                  {t('studentsModule.actions.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={convertMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold shadow-sm shadow-mehndi-600/20 transition-all disabled:opacity-50"
                >
                  {convertMutation.isPending ? 'Converting...' : t('studentsModule.actions.confirm', 'Complete Conversion')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
