import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Plus,
  UserCheck,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import {
  useVisits,
  useStudentPickupReleases,
  useCheckInVisitor,
  useCheckOutVisitor,
  useReleaseStudentPickup,
  VisitorVisit,
} from '../../../lib/api/operations';

export const GateView: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'visits' | 'pickups'>('visits');

  // Queries
  const { data: visitsData, isLoading: loadingVisits } = useVisits();
  const { data: pickupsData, isLoading: loadingPickups } = useStudentPickupReleases();

  // Modals
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);

  // Mutations
  const checkInMutation = useCheckInVisitor();
  const checkOutMutation = useCheckOutVisitor();
  const releasePickupMutation = useReleaseStudentPickup();

  const [checkInForm, setCheckInForm] = useState({
    name: '',
    phone: '',
    purpose: '',
    vehicleNumber: '',
    numberOfVisitors: 1,
    badgeNumber: '',
  });

  const [pickupForm, setPickupForm] = useState({
    studentId: '',
    pickupType: 'AUTHORIZED_GUARDIAN' as 'AUTHORIZED_GUARDIAN' | 'AUTHORIZED_PERSON' | 'EXCEPTION',
    guardianId: '',
    authorizedPersonName: '',
    isOverride: false,
    overrideReason: '',
    pickupSession: 'AFTERNOON' as 'MORNING' | 'AFTERNOON' | 'EMERGENCY' | 'SPECIAL',
  });

  const [pickupError, setPickupError] = useState<string | null>(null);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await checkInMutation.mutateAsync({
      visitor: {
        name: checkInForm.name,
        phone: checkInForm.phone,
      },
      purpose: checkInForm.purpose,
      vehicleNumber: checkInForm.vehicleNumber || null,
      numberOfVisitors: Number(checkInForm.numberOfVisitors) || 1,
      badgeNumber: checkInForm.badgeNumber || null,
    });
    setShowCheckInModal(false);
    setCheckInForm({
      name: '',
      phone: '',
      purpose: '',
      vehicleNumber: '',
      numberOfVisitors: 1,
      badgeNumber: '',
    });
  };

  const handleCheckOut = async (visitId: string) => {
    await checkOutMutation.mutateAsync({ visitId });
  };

  const handlePickup = async (e: React.FormEvent) => {
    e.preventDefault();
    setPickupError(null);
    try {
      await releasePickupMutation.mutateAsync({
        studentId: pickupForm.studentId,
        pickupType: pickupForm.pickupType,
        guardianId: pickupForm.guardianId || null,
        authorizedPersonName: pickupForm.authorizedPersonName || null,
        isOverride: pickupForm.isOverride,
        overrideReason: pickupForm.overrideReason || null,
        pickupSession: pickupForm.pickupSession,
      });
      setShowPickupModal(false);
      setPickupForm({
        studentId: '',
        pickupType: 'AUTHORIZED_GUARDIAN',
        guardianId: '',
        authorizedPersonName: '',
        isOverride: false,
        overrideReason: '',
        pickupSession: 'AFTERNOON',
      });
    } catch (err: any) {
      setPickupError(err?.response?.data?.message || err.message || 'Failed to release pickup');
    }
  };

  const visits: VisitorVisit[] = Array.isArray(visitsData) ? (visitsData as any) : (visitsData?.items || []);
  const pickups: any[] = Array.isArray(pickupsData) ? (pickupsData as any) : (pickupsData?.items || []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            {t('operations.gate.title', 'Gate & Visitor Safety Register')}
          </h1>
          <p className="text-xs text-zinc-500">
            {t(
              'operations.gate.subtitle',
              'Visitor passes, time-stamped check-in/out, and authoritative student pickup release verification.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-zinc-100 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setActiveTab('visits')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'visits' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Visitor Visits ({visits.length})
            </button>
            <button
              onClick={() => setActiveTab('pickups')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'pickups' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Student Pickups ({pickups.length})
            </button>
          </div>

          {activeTab === 'visits' && (
            <button
              onClick={() => setShowCheckInModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Check In Visitor</span>
            </button>
          )}

          {activeTab === 'pickups' && (
            <button
              onClick={() => setShowPickupModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-mehndi-600 text-white text-xs font-semibold hover:bg-mehndi-700 flex items-center gap-1.5 shadow-sm"
            >
              <UserCheck className="w-4 h-4" />
              <span>Authorize Student Pickup</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Visits List */}
      {activeTab === 'visits' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
          {loadingVisits ? (
            <div className="p-8 text-center text-xs text-zinc-500">Loading visits...</div>
          ) : visits.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 space-y-2">
              <ShieldCheck className="w-8 h-8 mx-auto text-zinc-300" />
              <p className="text-sm font-medium">No visitor visits recorded</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Pass #</th>
                  <th className="py-3 px-4">Visitor</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {visits.map((v) => (
                  <tr key={v.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold font-mono text-zinc-900">{v.visitNumber}</td>
                    <td className="py-3 px-4 font-semibold text-zinc-900">
                      <div>{(v.visitor as any)?.fullName || (v.visitor as any)?.name}</div>
                      <span className="text-[10px] text-zinc-400">{v.visitor?.phone}</span>
                    </td>
                    <td className="py-3 px-4 text-zinc-700">{v.purpose}</td>
                    <td className="py-3 px-4 text-zinc-600 font-mono text-[11px]">
                      {v.checkInAt && !isNaN(new Date(v.checkInAt).getTime())
                        ? new Date(v.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-zinc-600 font-mono text-[11px]">
                      {v.checkOutAt ? (
                        new Date(v.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      ) : (
                        <span className="text-emerald-600 font-semibold">ON CAMPUS</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          v.status === 'CHECKED_IN'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {v.status === 'CHECKED_IN' && (
                        <button
                          onClick={() => handleCheckOut(v.id)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold inline-flex items-center gap-1"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>Check Out</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 2. Student Pickup Releases */}
      {activeTab === 'pickups' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
          {loadingPickups ? (
            <div className="p-8 text-center text-xs text-zinc-500">Loading pickups...</div>
          ) : pickups.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 space-y-2">
              <UserCheck className="w-8 h-8 mx-auto text-zinc-300" />
              <p className="text-sm font-medium">No student pickups recorded</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Session</th>
                  <th className="py-3 px-4">Picked Up By</th>
                  <th className="py-3 px-4">Type / Guardian</th>
                  <th className="py-3 px-4">Override Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {pickups.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                      {new Date(p.releasedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-zinc-900">
                      {p.student?.firstName} {p.student?.lastName}
                      <div className="text-[10px] text-zinc-400 font-normal">Adm: {p.student?.admissionNumber}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-800">{p.pickupSession}</td>
                    <td className="py-3 px-4 text-zinc-800 font-medium">
                      {p.authorizedPersonName || p.guardian?.firstName || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
                        {p.pickupType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {p.isOverride ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <AlertTriangle className="w-3 h-3" />
                          OVERRIDE
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-[11px]">VERIFIED</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Check In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-zinc-900">Check In Campus Visitor</h3>
            <form onSubmit={handleCheckIn} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Visitor Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={checkInForm.name}
                  onChange={(e) => setCheckInForm({ ...checkInForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-mehndi-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={checkInForm.phone}
                    onChange={(e) => setCheckInForm({ ...checkInForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Vehicle #</label>
                  <input
                    type="text"
                    placeholder="Optional vehicle #"
                    value={checkInForm.vehicleNumber}
                    onChange={(e) => setCheckInForm({ ...checkInForm, vehicleNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Purpose of Visit *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Parent teacher inquiry / vendor delivery"
                  value={checkInForm.purpose}
                  onChange={(e) => setCheckInForm({ ...checkInForm, purpose: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={checkInMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  Generate Pass & Check In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Authorize Pickup Modal */}
      {showPickupModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-zinc-900">Authorize Student Pickup</h3>
            {pickupError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">
                {pickupError}
              </div>
            )}
            <form onSubmit={handlePickup} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Student ID (UUID) *</label>
                <input
                  type="text"
                  required
                  placeholder="Paste Student UUID"
                  value={pickupForm.studentId}
                  onChange={(e) => setPickupForm({ ...pickupForm, studentId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Pickup Type *</label>
                <select
                  value={pickupForm.pickupType}
                  onChange={(e) => setPickupForm({ ...pickupForm, pickupType: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                >
                  <option value="AUTHORIZED_GUARDIAN">Authorized Guardian (Module 04)</option>
                  <option value="AUTHORIZED_PERSON">Authorized Person</option>
                  <option value="EXCEPTION">Exceptional Release (Override)</option>
                </select>
              </div>

              {pickupForm.pickupType === 'AUTHORIZED_GUARDIAN' ? (
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Guardian ID (UUID) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Guardian UUID with pickup permission"
                    value={pickupForm.guardianId}
                    onChange={(e) => setPickupForm({ ...pickupForm, guardianId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Verified against StudentGuardian link and hasPickupPermission.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Person Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full name of person collecting student"
                    value={pickupForm.authorizedPersonName}
                    onChange={(e) => setPickupForm({ ...pickupForm, authorizedPersonName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
              )}

              {pickupForm.pickupType !== 'AUTHORIZED_GUARDIAN' && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-amber-900 font-semibold">
                    <input
                      type="checkbox"
                      checked={pickupForm.isOverride}
                      onChange={(e) => setPickupForm({ ...pickupForm, isOverride: e.target.checked })}
                      className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span>Requires gate.pickup.override permission</span>
                  </label>
                  {pickupForm.isOverride && (
                    <input
                      type="text"
                      required
                      placeholder="Mandatory justification / authorization reason"
                      value={pickupForm.overrideReason}
                      onChange={(e) => setPickupForm({ ...pickupForm, overrideReason: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white"
                    />
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPickupModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={releasePickupMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-mehndi-600 text-white font-semibold hover:bg-mehndi-700 disabled:opacity-50"
                >
                  Authorize Release
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GateView;
