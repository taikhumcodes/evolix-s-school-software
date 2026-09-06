import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Bus,
  Package,
  Armchair,
  ShieldCheck,
  Trophy,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useOperationsDashboard } from '../../../lib/api/operations';

export const OperationsOverview: React.FC = () => {
  const { t } = useTranslation();
  const { data: dashboard, isLoading, error } = useOperationsDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mehndi-600" />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
        <p className="font-semibold">{t('common.errorLoading', 'Failed to load operations dashboard')}</p>
      </div>
    );
  }

  const { transport, inventory, assets, gate, events, permissions } = dashboard;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-mehndi-900 via-mehndi-800 to-zinc-900 rounded-2xl p-6 text-white shadow-xl shadow-mehndi-950/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-mehndi-500/30 text-mehndi-200 border border-mehndi-400/30">
                MAJOR MODULE 09
              </span>
              <span className="text-xs text-zinc-300 font-medium">Enterprise Operations Management</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              {t('operations.overview.title', 'School Operations & Facilities')}
            </h1>
            <p className="text-sm text-zinc-300 max-w-2xl">
              {t(
                'operations.overview.subtitle',
                'Authoritative management of student transport routes, inventory ledger, tagged assets, gate safety, and school activities.'
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/operations/reports"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all"
            >
              {t('operations.nav.reports', 'Audit Reports')}
            </Link>
          </div>
        </div>
      </div>

      {/* Domain KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. Transport Domain */}
        {permissions.hasTransport && transport && (
          <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Bus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900">
                    {t('operations.transport.cardTitle', 'Transport & Fleet')}
                  </h2>
                  <p className="text-xs text-zinc-500">
                    {transport.activeVehicles} active / {transport.totalVehicles} vehicles
                  </p>
                </div>
              </div>
              <Link
                to="/operations/transport"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>{t('common.view', 'View')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-4">
              <div className="bg-zinc-50 rounded-xl p-3">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase">Routes</span>
                <p className="text-xl font-extrabold text-zinc-900">{transport.totalRoutes}</p>
                <span className="text-[10px] text-zinc-400">{transport.activeRoutes} active</span>
              </div>
              <div className="bg-zinc-50 rounded-xl p-3">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase">Assigned</span>
                <p className="text-xl font-extrabold text-zinc-900">{transport.activeAssignments}</p>
                <span className="text-[10px] text-zinc-400">Students scoped</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. Inventory Supplies */}
        {permissions.hasInventory && inventory && (
          <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900">
                    {t('operations.inventory.cardTitle', 'Inventory & Supplies')}
                  </h2>
                  <p className="text-xs text-zinc-500">{inventory.totalItems} catalog items</p>
                </div>
              </div>
              <Link
                to="/operations/inventory"
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                <span>{t('common.view', 'View')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-4">
              <div className="bg-zinc-50 rounded-xl p-3">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase">Low Stock</span>
                <p className="text-xl font-extrabold text-red-600 flex items-center gap-1.5">
                  {inventory.lowStockItems}
                  {inventory.lowStockItems > 0 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                </p>
                <span className="text-[10px] text-zinc-400">Below minimum</span>
              </div>
              <div className="bg-zinc-50 rounded-xl p-3">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase">Movements</span>
                <p className="text-xl font-extrabold text-zinc-900">{inventory.todayMovements}</p>
                <span className="text-[10px] text-zinc-400">Signed ledger today</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Assets Register */}
        {permissions.hasAssets && assets && (
          <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Armchair className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900">
                    {t('operations.assets.cardTitle', 'Fixed Asset Register')}
                  </h2>
                  <p className="text-xs text-zinc-500">{assets.totalAssets} tracked assets</p>
                </div>
              </div>
              <Link
                to="/operations/assets"
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <span>{t('common.view', 'View')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-4 text-center">
              <div className="bg-zinc-50 rounded-xl p-2.5">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase">Available</span>
                <p className="text-lg font-bold text-emerald-600">{assets.availableAssets}</p>
              </div>
              <div className="bg-zinc-50 rounded-xl p-2.5">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase">Assigned</span>
                <p className="text-lg font-bold text-blue-600">{assets.assignedAssets}</p>
              </div>
              <div className="bg-zinc-50 rounded-xl p-2.5">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase">Service</span>
                <p className="text-lg font-bold text-amber-600">{assets.inMaintenanceAssets}</p>
              </div>
            </div>
          </div>
        )}

        {/* 4. Gate & Visitor Safety */}
        {permissions.hasGate && gate && (
          <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900">
                    {t('operations.gate.cardTitle', 'Gate & Visitors')}
                  </h2>
                  <p className="text-xs text-zinc-500">Check-in / Check-out & Pickups</p>
                </div>
              </div>
              <Link
                to="/operations/gate"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <span>{t('common.view', 'View')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-4 text-center">
              <div className="bg-zinc-50 rounded-xl p-2.5">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase">Visits Today</span>
                <p className="text-lg font-bold text-zinc-900">{gate.todayVisits}</p>
              </div>
              <div className="bg-zinc-50 rounded-xl p-2.5">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase">On Campus</span>
                <p className="text-lg font-bold text-emerald-600">{gate.currentlyCheckedIn}</p>
              </div>
              <div className="bg-zinc-50 rounded-xl p-2.5">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase">Pickups</span>
                <p className="text-lg font-bold text-blue-600">{gate.todayPickups}</p>
              </div>
            </div>
          </div>
        )}

        {/* 5. Activities & Events */}
        {permissions.hasEvents && events && (
          <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900">
                    {t('operations.events.cardTitle', 'Activities & Events')}
                  </h2>
                  <p className="text-xs text-zinc-500">Competitions & School Functions</p>
                </div>
              </div>
              <Link
                to="/operations/events"
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                <span>{t('common.view', 'View')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-4 text-center">
              <div className="bg-zinc-50 rounded-xl p-2.5">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase">Upcoming</span>
                <p className="text-lg font-bold text-zinc-900">{events.upcomingEvents}</p>
              </div>
              <div className="bg-zinc-50 rounded-xl p-2.5">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase">In Progress</span>
                <p className="text-lg font-bold text-emerald-600">{events.activeEvents}</p>
              </div>
              <div className="bg-zinc-50 rounded-xl p-2.5">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase">Students</span>
                <p className="text-lg font-bold text-blue-600">{events.totalParticipants}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Core Integrity Invariants Note */}
      <div className="bg-mehndi-50/70 border border-mehndi-200/80 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-mehndi-600 text-white shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-mehndi-950">
              {t('operations.invariants.title', '5 Operations Integrity Guarantees Active')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 text-xs text-mehndi-900">
              <div className="bg-white/80 rounded-xl p-3 border border-mehndi-200/60 shadow-xs">
                <strong className="block text-mehndi-950">1. Transport</strong>
                <span>Simultaneous passengers strictly capped to vehicle seating capacity.</span>
              </div>
              <div className="bg-white/80 rounded-xl p-3 border border-mehndi-200/60 shadow-xs">
                <strong className="block text-mehndi-950">2. Inventory</strong>
                <span>Balance is always the exact signed sum of StockMovements.</span>
              </div>
              <div className="bg-white/80 rounded-xl p-3 border border-mehndi-200/60 shadow-xs">
                <strong className="block text-mehndi-950">3. Assets</strong>
                <span>Each tagged asset has at most one active assignment.</span>
              </div>
              <div className="bg-white/80 rounded-xl p-3 border border-mehndi-200/60 shadow-xs">
                <strong className="block text-mehndi-950">4. Gate Safety</strong>
                <span>Student pickup release verified against authorized guardians.</span>
              </div>
              <div className="bg-white/80 rounded-xl p-3 border border-mehndi-200/60 shadow-xs">
                <strong className="block text-mehndi-950">5. Events</strong>
                <span>Capacity concurrency locks prevent participant overbooking.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationsOverview;
