import { useState, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  X,
} from 'lucide-react';
import { AttendanceNav } from './AttendanceNav';
import {
  useStaffLeaves,
  useCreateStaffLeave,
  useReviewStaffLeave,
  StaffLeave,
} from '../../../lib/api/attendance';
import { useAuth } from '../../../core/auth/AuthContext';

export default function StaffLeaveView() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();

  const canApprove = hasPermission('staff_leave.approve');
  const canCreate = hasPermission('staff_leave.manage');

  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reviewingLeave, setReviewingLeave] = useState<StaffLeave | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [rejectionReason, setRejectionReason] = useState('');
  const [modalError, setModalError] = useState('');

  // Form
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveType, setLeaveType] = useState('CASUAL');
  const [reason, setReason] = useState('');

  const { data: leaves, isLoading, refetch } = useStaffLeaves({
    status: statusFilter || undefined,
  });

  const createMutation = useCreateStaffLeave();
  const reviewMutation = useReviewStaffLeave();

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      setModalError(t('attendanceModule.leave.reasonMin', 'Reason must be at least 3 characters'));
      return;
    }
    setModalError('');
    try {
      await createMutation.mutateAsync({
        startDate,
        endDate,
        leaveType,
        reason: reason.trim(),
      });
      setShowCreateModal(false);
      setReason('');
      refetch();
    } catch (err: any) {
      setModalError(err?.response?.data?.message || 'Failed to submit staff leave application');
    }
  };

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reviewingLeave) return;
    if (reviewAction === 'REJECT' && !rejectionReason.trim()) {
      setModalError(t('attendanceModule.leave.rejectionReasonRequired', 'Rejection reason is required'));
      return;
    }
    setModalError('');
    try {
      await reviewMutation.mutateAsync({
        id: reviewingLeave.id,
        action: reviewAction,
        rejectionReason: reviewAction === 'REJECT' ? rejectionReason.trim() : null,
      });
      setReviewingLeave(null);
      setRejectionReason('');
      refetch();
    } catch (err: any) {
      setModalError(err?.response?.data?.message || 'Failed to review staff leave');
    }
  };

  return (
    <div className="space-y-6">
      <AttendanceNav />

      {/* Control bar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-zinc-200 bg-white text-xs font-semibold focus:ring-2 focus:ring-mehndi-500"
          >
            <option value="">{t('attendanceModule.leave.allStatuses', 'All Statuses')}</option>
            <option value="PENDING">{t('attendanceModule.leave.statusPending', 'Pending')}</option>
            <option value="APPROVED">{t('attendanceModule.leave.statusApproved', 'Approved')}</option>
            <option value="REJECTED">{t('attendanceModule.leave.statusRejected', 'Rejected')}</option>
          </select>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => {
              setShowCreateModal(true);
              setModalError('');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold shadow-md shadow-mehndi-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('attendanceModule.staffLeave.apply', 'Apply Staff Leave')}</span>
          </button>
        )}
      </div>

      {/* Leaves list */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-400 text-xs">{t('common.loading', 'Loading staff leaves...')}</div>
        ) : !leaves || leaves.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 space-y-2">
            <Clock className="w-8 h-8 mx-auto text-zinc-300" />
            <p className="text-sm font-semibold">{t('attendanceModule.staffLeave.noLeaves', 'No staff leave requests found')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {leaves.map((leave) => {
                  const staffName = leave.user
                    ? `${leave.user.firstName} ${leave.user.lastName || ''}`.trim()
                    : leave.userId;

                  return (
                    <tr key={leave.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-zinc-900">
                        <div>
                          <span>{staffName}</span>
                          {leave.user && <p className="text-[11px] font-normal text-zinc-400">{leave.user.email}</p>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-600 font-medium">
                        {leave.startDate.slice(0, 10)} → {leave.endDate.slice(0, 10)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 font-semibold text-[11px]">
                          {leave.leaveType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-700 max-w-xs truncate" title={leave.reason}>
                        {leave.reason}
                      </td>
                      <td className="py-3 px-4">
                        {leave.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approved</span>
                          </span>
                        )}
                        {leave.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
                            <XCircle className="w-3 h-3" />
                            <span>Rejected</span>
                          </span>
                        )}
                        {leave.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                            <Clock className="w-3 h-3" />
                            <span>Pending Review</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canApprove && leave.status === 'PENDING' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setReviewingLeave(leave);
                                setReviewAction('APPROVE');
                                setRejectionReason('');
                                setModalError('');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReviewingLeave(leave);
                                setReviewAction('REJECT');
                                setRejectionReason('');
                                setModalError('');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px]"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Staff Leave Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-zinc-900">
                {t('attendanceModule.staffLeave.applyTitle', 'Apply Staff Leave')}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                    {t('attendanceModule.leave.startDate', 'Start Date')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-mehndi-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                    {t('attendanceModule.leave.endDate', 'End Date')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-mehndi-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  {t('attendanceModule.leave.type', 'Leave Type')} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-mehndi-500"
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="EARNED">Earned Leave</option>
                  <option value="MATERNITY">Maternity Leave</option>
                  <option value="PATERNITY">Paternity Leave</option>
                  <option value="BEREAVEMENT">Bereavement Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  {t('attendanceModule.leave.reason', 'Reason')} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain reason for leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-3 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-mehndi-500"
                />
              </div>

              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                  {modalError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold shadow-md shadow-mehndi-600/20"
                >
                  {createMutation.isPending ? t('common.submitting', 'Submitting...') : t('attendanceModule.leave.submit', 'Submit Request')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Staff Leave Modal */}
      {reviewingLeave && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-zinc-900">
                {reviewAction === 'APPROVE'
                  ? t('attendanceModule.staffLeave.approveTitle', 'Approve Staff Leave')
                  : t('attendanceModule.staffLeave.rejectTitle', 'Reject Staff Leave')}
              </h3>
              <button
                type="button"
                onClick={() => setReviewingLeave(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1 text-xs">
                <p className="font-bold text-zinc-800">
                  {reviewingLeave.user?.firstName} {reviewingLeave.user?.lastName}
                </p>
                <p className="text-zinc-500">
                  {reviewingLeave.startDate.slice(0, 10)} → {reviewingLeave.endDate.slice(0, 10)} ({reviewingLeave.leaveType})
                </p>
                <p className="text-zinc-700 italic">"{reviewingLeave.reason}"</p>
              </div>

              {reviewAction === 'REJECT' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                    {t('attendanceModule.leave.rejectionReason', 'Rejection Reason')} <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide reason for rejecting staff leave..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full p-3 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                  {modalError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setReviewingLeave(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={reviewMutation.isPending}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md ${
                    reviewAction === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  {reviewMutation.isPending
                    ? t('common.submitting', 'Processing...')
                    : reviewAction === 'APPROVE'
                    ? 'Confirm Approval'
                    : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
