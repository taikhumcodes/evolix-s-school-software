import { useState, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Compass,
  Edit2,
  X,
} from 'lucide-react';
import { AttendanceNav } from './AttendanceNav';
import {
  useStaffAttendance,
  useStaffCheckIn,
  useStaffCheckOut,
  useManualStaffAttendance,
  StaffAttendanceRecord,
} from '../../../lib/api/attendance';
import { useAuth } from '../../../core/auth/AuthContext';

export default function StaffAttendanceView() {
  const { t } = useTranslation();
  const { user, hasPermission } = useAuth();
  const canManage = hasPermission('staff_attendance.manage');

  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Manual correction modal state
  const [editingRecord, setEditingRecord] = useState<StaffAttendanceRecord | null>(null);
  const [manualUserId, setManualUserId] = useState('');
  const [manualStatus, setManualStatus] = useState('PRESENT');
  const [manualReason, setManualReason] = useState('');
  const [manualRemarks, setManualRemarks] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualError, setManualError] = useState('');

  const { data: records, isLoading, refetch } = useStaffAttendance({
    date: filterDate,
  });

  const checkInMutation = useStaffCheckIn();
  const checkOutMutation = useStaffCheckOut();
  const manualMutation = useManualStaffAttendance();

  // Find user's attendance today
  const myRecordToday = records?.find((r) => r.userId === user?.id);

  const handleBrowserCheckIn = () => {
    if (!navigator.geolocation) {
      setGeoError(t('attendanceModule.staff.geoNotSupported', 'Geolocation is not supported by your browser'));
      return;
    }

    setGeoLoading(true);
    setGeoError('');
    setActionSuccess('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          await checkInMutation.mutateAsync({
            latitude: lat,
            longitude: lon,
          });
          setActionSuccess(t('attendanceModule.staff.checkInSuccess', 'Check-in verified and recorded successfully!'));
          setGeoLoading(false);
          refetch();
        } catch (err: any) {
          const msg =
            err?.response?.data?.message ||
            err?.response?.data?.error?.message ||
            t('attendanceModule.staff.checkInFailed', 'Check-in failed');
          setGeoError(msg);
          setGeoLoading(false);
        }
      },
      (error) => {
        setGeoLoading(false);
        let msg = t('attendanceModule.staff.locationDenied', 'Location permission denied by browser. Please enable location.');
        if (error.code === error.POSITION_UNAVAILABLE) {
          msg = t('attendanceModule.staff.positionUnavailable', 'Location position unavailable.');
        } else if (error.code === error.TIMEOUT) {
          msg = t('attendanceModule.staff.locationTimeout', 'Location request timed out.');
        }
        setGeoError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleBrowserCheckOut = () => {
    if (!navigator.geolocation) {
      setGeoError(t('attendanceModule.staff.geoNotSupported', 'Geolocation is not supported by your browser'));
      return;
    }

    setGeoLoading(true);
    setGeoError('');
    setActionSuccess('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          await checkOutMutation.mutateAsync({
            latitude: lat,
            longitude: lon,
          });
          setActionSuccess(t('attendanceModule.staff.checkOutSuccess', 'Check-out recorded successfully!'));
          setGeoLoading(false);
          refetch();
        } catch (err: any) {
          const msg =
            err?.response?.data?.message ||
            err?.response?.data?.error?.message ||
            t('attendanceModule.staff.checkOutFailed', 'Check-out failed');
          setGeoError(msg);
          setGeoLoading(false);
        }
      },
      async () => {
        // If location denied on checkout, attempt checkout without coords if permitted
        try {
          await checkOutMutation.mutateAsync({});
          setActionSuccess(t('attendanceModule.staff.checkOutSuccess', 'Check-out recorded successfully!'));
          setGeoLoading(false);
          refetch();
        } catch (err: any) {
          setGeoError(err?.response?.data?.message || 'Check-out failed');
          setGeoLoading(false);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleManualSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!manualUserId.trim()) {
      setManualError('Valid User ID is required');
      return;
    }
    if (!manualReason.trim()) {
      setManualError(t('attendanceModule.errors.reasonRequired', 'Correction reason is required'));
      return;
    }
    setManualError('');
    try {
      await manualMutation.mutateAsync({
        userId: manualUserId.trim(),
        date: filterDate,
        status: manualStatus,
        reason: manualReason.trim(),
        remarks: manualRemarks.trim() || null,
      });
      setShowManualModal(false);
      setEditingRecord(null);
      setManualReason('');
      setManualRemarks('');
      refetch();
    } catch (err: any) {
      setManualError(err?.response?.data?.message || 'Failed to update staff attendance');
    }
  };

  return (
    <div className="space-y-6">
      <AttendanceNav />

      {/* Geofence Self Check-In Card */}
      <div className="bg-gradient-to-r from-mehndi-900 to-zinc-900 text-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-mehndi-400 text-xs font-bold uppercase tracking-wider">
              <Compass className="w-4 h-4" />
              <span>{t('attendanceModule.staff.geofenceTerminal', 'School Geofenced Attendance Terminal')}</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              {t('attendanceModule.staff.welcome', 'Hello, {{name}}', { name: user?.first_name || 'Staff' })}
            </h2>
            <p className="text-xs text-zinc-300 max-w-xl">
              {t(
                'attendanceModule.staff.privacyNotice',
                'Your location coordinates are processed only when you explicitly press Check In or Check Out. No continuous background tracking is performed.'
              )}
            </p>

            {myRecordToday && (
              <div className="flex items-center gap-4 text-xs pt-2">
                {myRecordToday.checkInAt && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Check-In: {new Date(myRecordToday.checkInAt).toLocaleTimeString()}</span>
                    {myRecordToday.checkInDistanceMeters !== null && (
                      <span className="text-zinc-400 text-[11px]">({myRecordToday.checkInDistanceMeters}m from school)</span>
                    )}
                  </span>
                )}
                {myRecordToday.checkOutAt && (
                  <span className="inline-flex items-center gap-1.5 text-blue-400 font-semibold">
                    <Clock className="w-4 h-4" />
                    <span>Check-Out: {new Date(myRecordToday.checkOutAt).toLocaleTimeString()}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!myRecordToday?.checkInAt ? (
              <button
                type="button"
                disabled={geoLoading}
                onClick={handleBrowserCheckIn}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-mehndi-500 hover:bg-mehndi-600 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-mehndi-500/30 transition-all"
              >
                <MapPin className="w-4 h-4" />
                <span>{geoLoading ? t('common.verifying', 'Verifying GPS...') : t('attendanceModule.staff.checkInButton', 'Check In Now')}</span>
              </button>
            ) : !myRecordToday?.checkOutAt ? (
              <button
                type="button"
                disabled={geoLoading}
                onClick={handleBrowserCheckOut}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-amber-500/30 transition-all"
              >
                <Clock className="w-4 h-4" />
                <span>{geoLoading ? t('common.processing', 'Processing...') : t('attendanceModule.staff.checkOutButton', 'Check Out')}</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('attendanceModule.staff.dayCompleted', 'Day Attendance Completed')}</span>
              </span>
            )}
          </div>
        </div>

        {geoError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{geoError}</span>
          </div>
        )}

        {actionSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
        )}
      </div>

      {/* Staff Attendance Register Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                {t('attendanceModule.staff.filterDate', 'Select Date')}
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="h-10 px-3 rounded-xl border border-zinc-300 bg-white text-xs font-medium focus:ring-2 focus:ring-mehndi-500"
              />
            </div>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={() => {
                setEditingRecord(null);
                setManualUserId('');
                setManualStatus('PRESENT');
                setManualReason('');
                setManualRemarks('');
                setManualError('');
                setShowManualModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{t('attendanceModule.staff.manualMark', 'Manual Staff Attendance')}</span>
            </button>
          )}
        </div>

        {/* Table */}
        <div className="border border-zinc-200 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-zinc-400 text-xs">{t('common.loading', 'Loading staff attendance...')}</div>
          ) : records?.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs font-medium">
              {t('attendanceModule.staff.noRecords', 'No staff attendance records found for this date.')}
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Distance</th>
                  <th className="py-3 px-4">Type</th>
                  {canManage && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {records?.map((record) => {
                  const name = record.user
                    ? `${record.user.firstName} ${record.user.lastName || ''}`.trim()
                    : record.userId;

                  return (
                    <tr key={record.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-zinc-900">
                        <div>
                          <span>{name}</span>
                          {record.user && <p className="text-[11px] font-normal text-zinc-400">{record.user.email}</p>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                            record.status === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : record.status === 'ABSENT'
                              ? 'bg-rose-100 text-rose-800'
                              : record.status === 'LATE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-600 font-medium">
                        {record.checkInAt ? new Date(record.checkInAt).toLocaleTimeString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-zinc-600 font-medium">
                        {record.checkOutAt ? new Date(record.checkOutAt).toLocaleTimeString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-zinc-500">
                        {record.checkInDistanceMeters !== null && record.checkInDistanceMeters !== undefined
                          ? `${record.checkInDistanceMeters}m`
                          : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {record.isManualCorrection ? (
                          <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 text-[10px] font-bold">
                            Manual
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-mehndi-50 text-mehndi-700 text-[10px] font-bold">
                            GPS Verified
                          </span>
                        )}
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRecord(record);
                              setManualUserId(record.userId);
                              setManualStatus(record.status);
                              setManualReason(record.correctionReason || '');
                              setManualRemarks(record.remarks || '');
                              setManualError('');
                              setShowManualModal(true);
                            }}
                            className="text-xs font-bold text-mehndi-700 hover:underline"
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Manual Attendance / Correction Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-zinc-900">
                {editingRecord
                  ? t('attendanceModule.staff.editModal', 'Correct Staff Attendance')
                  : t('attendanceModule.staff.newModal', 'Record Staff Attendance')}
              </h3>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  User / Staff UUID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter User UUID..."
                  value={manualUserId}
                  onChange={(e) => setManualUserId(e.target.value)}
                  disabled={Boolean(editingRecord)}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-mehndi-500 disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Attendance Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-mehndi-500"
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="LATE">LATE</option>
                  <option value="HALF_DAY">HALF_DAY</option>
                  <option value="LEAVE">LEAVE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Correction Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Mandatory explanation for audit trail..."
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full p-3 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-mehndi-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Optional note..."
                  value={manualRemarks}
                  onChange={(e) => setManualRemarks(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-mehndi-500"
                />
              </div>

              {manualError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                  {manualError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={manualMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold shadow-md"
                >
                  {manualMutation.isPending ? t('common.saving', 'Saving...') : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
