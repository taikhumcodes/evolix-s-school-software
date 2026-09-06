import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bus,
  Plus,
  Search,
  MapPin,
  Gauge,
  Calendar,
} from 'lucide-react';
import {
  useVehicles,
  useRoutes,
  useTrips,
  useCreateVehicle,
  useCreateRoute,
  TransportVehicle,
  TransportRoute,
} from '../../../lib/api/operations';

export const TransportView: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'vehicles' | 'routes' | 'trips'>('vehicles');
  const [search, setSearch] = useState('');

  // Queries
  const { data: vehiclesData, isLoading: loadingVehicles } = useVehicles({ search: search || undefined });
  const { data: routesData, isLoading: loadingRoutes } = useRoutes({ search: search || undefined });
  const { data: tripsData, isLoading: loadingTrips } = useTrips();

  // Modals
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);

  // Form states
  const createVehicleMutation = useCreateVehicle();
  const createRouteMutation = useCreateRoute();

  const [vehicleForm, setVehicleForm] = useState({
    registrationNumber: '',
    vehicleNumber: '',
    make: '',
    model: '',
    seatingCapacity: 40,
    fuelType: 'DIESEL',
    currentOdometerReading: 0,
  });

  const [routeForm, setRouteForm] = useState({
    routeCode: '',
    routeName: '',
    startLocation: '',
    endLocation: '',
    estimatedDuration: 45,
  });

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    await createVehicleMutation.mutateAsync(vehicleForm);
    setShowVehicleModal(false);
    setVehicleForm({
      registrationNumber: '',
      vehicleNumber: '',
      make: '',
      model: '',
      seatingCapacity: 40,
      fuelType: 'DIESEL',
      currentOdometerReading: 0,
    });
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRouteMutation.mutateAsync(routeForm);
    setShowRouteModal(false);
    setRouteForm({
      routeCode: '',
      routeName: '',
      startLocation: '',
      endLocation: '',
      estimatedDuration: 45,
    });
  };

  const vehicles: TransportVehicle[] = Array.isArray(vehiclesData) ? (vehiclesData as any) : (vehiclesData?.items || []);
  const routes: TransportRoute[] = Array.isArray(routesData) ? (routesData as any) : (routesData?.items || []);
  const trips: any[] = Array.isArray(tripsData) ? (tripsData as any) : (tripsData?.items || []);

  return (
    <div className="space-y-6">
      {/* Header & Subtabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
            <Bus className="w-6 h-6 text-blue-600" />
            {t('operations.transport.title', 'Transport & Fleet Management')}
          </h1>
          <p className="text-xs text-zinc-500">
            {t('operations.transport.subtitle', 'Vehicles registry, route scheduling, seating capacity validation, and daily trips.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-zinc-100 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'vehicles' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Vehicles ({vehicles.length})
            </button>
            <button
              onClick={() => setActiveTab('routes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'routes' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Routes ({routes.length})
            </button>
            <button
              onClick={() => setActiveTab('trips')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'trips' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Trips ({trips.length})
            </button>
          </div>

          {activeTab === 'vehicles' && (
            <button
              onClick={() => setShowVehicleModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-mehndi-600 text-white text-xs font-semibold hover:bg-mehndi-700 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Vehicle</span>
            </button>
          )}

          {activeTab === 'routes' && (
            <button
              onClick={() => setShowRouteModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-mehndi-600 text-white text-xs font-semibold hover:bg-mehndi-700 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Route</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('common.search', 'Search by registration, name, code...')}
          className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
        />
      </div>

      {/* 1. Vehicles Table */}
      {activeTab === 'vehicles' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
          {loadingVehicles ? (
            <div className="p-8 text-center text-xs text-zinc-500">Loading vehicles...</div>
          ) : vehicles.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 space-y-2">
              <Bus className="w-8 h-8 mx-auto text-zinc-300" />
              <p className="text-sm font-medium">No vehicles registered yet</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Registration</th>
                  <th className="py-3 px-4">Make / Model</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Odometer</th>
                  <th className="py-3 px-4">Assigned Staff</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-zinc-900">
                      <div>{v.registrationNumber}</div>
                      {v.vehicleNumber && <span className="text-[10px] text-zinc-400">#{v.vehicleNumber}</span>}
                    </td>
                    <td className="py-3 px-4 text-zinc-600">
                      {v.make} {v.model}
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-900">
                      {v.seatingCapacity} seats
                    </td>
                    <td className="py-3 px-4 text-zinc-600 flex items-center gap-1.5 font-mono">
                      <Gauge className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{(v.currentOdometerReading ?? 0).toLocaleString()} km</span>
                    </td>
                    <td className="py-3 px-4 text-zinc-600">
                      {v.staffAssignments && v.staffAssignments.length > 0 ? (
                        <div className="space-y-0.5">
                          {v.staffAssignments.map((s) => (
                            <div key={s.id} className="text-[11px]">
                              <span className="font-semibold text-zinc-800">{s.assignmentRole}:</span>{' '}
                              {s.employee.firstName} {s.employee.lastName}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-400">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          v.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 2. Routes Table */}
      {activeTab === 'routes' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
          {loadingRoutes ? (
            <div className="p-8 text-center text-xs text-zinc-500">Loading routes...</div>
          ) : routes.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 space-y-2">
              <MapPin className="w-8 h-8 mx-auto text-zinc-300" />
              <p className="text-sm font-medium">No transport routes configured yet</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Route Name</th>
                  <th className="py-3 px-4">Path</th>
                  <th className="py-3 px-4">Stops</th>
                  <th className="py-3 px-4">Assigned Bus</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {routes.map((r) => {
                  const assignedVehicle = r.vehicleAssignments?.[0]?.vehicle;
                  return (
                    <tr key={r.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-zinc-900">{r.routeCode}</td>
                      <td className="py-3 px-4 font-semibold text-zinc-900">{r.routeName}</td>
                      <td className="py-3 px-4 text-zinc-600">
                        {r.startLocation} <span className="text-zinc-400">➔</span> {r.endLocation}
                      </td>
                      <td className="py-3 px-4 text-zinc-600">
                        {r.stops?.length || 0} stops
                      </td>
                      <td className="py-3 px-4 text-zinc-600">
                        {assignedVehicle ? (
                          <div className="font-semibold text-zinc-800">
                            {assignedVehicle.registrationNumber} ({assignedVehicle.seatingCapacity} seats)
                          </div>
                        ) : (
                          <span className="text-zinc-400">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            r.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 3. Trips Table */}
      {activeTab === 'trips' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
          {loadingTrips ? (
            <div className="p-8 text-center text-xs text-zinc-500">Loading trips...</div>
          ) : trips.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 space-y-2">
              <Calendar className="w-8 h-8 mx-auto text-zinc-300" />
              <p className="text-sm font-medium">No recorded trips yet</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Trip Type</th>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Students</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {trips.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-zinc-900">
                      {new Date(t.tripDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-800">{t.tripType}</td>
                    <td className="py-3 px-4 text-zinc-700">{t.route?.routeName}</td>
                    <td className="py-3 px-4 text-zinc-700">{t.vehicle?.registrationNumber}</td>
                    <td className="py-3 px-4 text-zinc-700">
                      {t.driverEmployee ? `${t.driverEmployee.firstName} ${t.driverEmployee.lastName}` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-900">{t._count?.students || 0}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-zinc-900">Add Transport Vehicle</h3>
            <form onSubmit={handleCreateVehicle} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Registration Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MH-02-AB-1234"
                  value={vehicleForm.registrationNumber}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-mehndi-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Make</label>
                  <input
                    type="text"
                    placeholder="e.g. Tata"
                    value={vehicleForm.make}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Model</label>
                  <input
                    type="text"
                    placeholder="e.g. Starbus"
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Seating Capacity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={vehicleForm.seatingCapacity}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, seatingCapacity: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Current Odometer (km)</label>
                  <input
                    type="number"
                    min="0"
                    value={vehicleForm.currentOdometerReading}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, currentOdometerReading: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createVehicleMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-mehndi-600 text-white font-semibold hover:bg-mehndi-700 disabled:opacity-50"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Route Modal */}
      {showRouteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-zinc-900">Add Transport Route</h3>
            <form onSubmit={handleCreateRoute} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Route Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Route 1 - North Campus"
                  value={routeForm.routeName}
                  onChange={(e) => setRouteForm({ ...routeForm, routeName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-mehndi-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Start Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. City Center"
                    value={routeForm.startLocation}
                    onChange={(e) => setRouteForm({ ...routeForm, startLocation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">End Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. School Gate"
                    value={routeForm.endLocation}
                    onChange={(e) => setRouteForm({ ...routeForm, endLocation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Estimated Duration (minutes)</label>
                <input
                  type="number"
                  min="1"
                  value={routeForm.estimatedDuration}
                  onChange={(e) => setRouteForm({ ...routeForm, estimatedDuration: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRouteModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRouteMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-mehndi-600 text-white font-semibold hover:bg-mehndi-700 disabled:opacity-50"
                >
                  Save Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportView;
