import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Armchair,
  Plus,
  Search,
  Tag,
} from 'lucide-react';
import {
  useAssets,
  useInventoryItems,
  useInventoryLocations,
  useCreateAsset,
  useAssignAsset,
  useReturnAsset,
  useDisposeAsset,
  AssetRecord,
  InventoryItem,
} from '../../../lib/api/operations';

export const AssetsView: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Queries
  const { data: assetsData, isLoading } = useAssets({
    search: search || undefined,
    status: statusFilter || undefined,
  });
  const { data: itemsData } = useInventoryItems();
  const { data: locations = [] } = useInventoryLocations();

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const [actionModal, setActionModal] = useState<'assign' | 'return' | 'dispose' | null>(null);

  // Mutations
  const createAssetMutation = useCreateAsset();
  const assignAssetMutation = useAssignAsset();
  const returnAssetMutation = useReturnAsset();
  const disposeAssetMutation = useDisposeAsset();

  const [createForm, setCreateForm] = useState({
    inventoryItemId: '',
    locationId: '',
    serialNumber: '',
    purchaseCost: 0,
    condition: 'EXCELLENT',
  });

  const [assignForm, setAssignForm] = useState({
    employeeId: '',
    departmentId: '',
    remarks: '',
  });

  const [disposeForm, setDisposeForm] = useState({
    method: 'SCRAP',
    reason: '',
    valueReceived: 0,
  });

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAssetMutation.mutateAsync({
      inventoryItemId: createForm.inventoryItemId,
      locationId: createForm.locationId,
      serialNumber: createForm.serialNumber || null,
      purchaseCost: Number(createForm.purchaseCost) || 0,
      condition: createForm.condition,
    });
    setShowCreateModal(false);
    setCreateForm({
      inventoryItemId: '',
      locationId: '',
      serialNumber: '',
      purchaseCost: 0,
      condition: 'EXCELLENT',
    });
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    await assignAssetMutation.mutateAsync({
      assetId: selectedAsset.id,
      data: {
        employeeId: assignForm.employeeId || null,
        departmentId: assignForm.departmentId || null,
        remarks: assignForm.remarks,
      },
    });
    setActionModal(null);
    setSelectedAsset(null);
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    await returnAssetMutation.mutateAsync({
      assetId: selectedAsset.id,
      data: {
        conditionOnReturn: 'GOOD',
        statusAfterReturn: 'AVAILABLE',
      },
    });
    setActionModal(null);
    setSelectedAsset(null);
  };

  const handleDispose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    await disposeAssetMutation.mutateAsync({
      assetId: selectedAsset.id,
      data: {
        disposalDate: new Date().toISOString().split('T')[0],
        method: disposeForm.method,
        reason: disposeForm.reason,
        valueReceived: Number(disposeForm.valueReceived) || 0,
      },
    });
    setActionModal(null);
    setSelectedAsset(null);
  };

  const assets: AssetRecord[] = Array.isArray(assetsData) ? (assetsData as any) : (assetsData?.items || []);
  const items = itemsData?.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
            <Armchair className="w-6 h-6 text-purple-600" />
            {t('operations.assets.title', 'Fixed Asset Register')}
          </h1>
          <p className="text-xs text-zinc-500">
            {t(
              'operations.assets.subtitle',
              'Atomic asset tagging via NumberSeries, custodial assignment tracking, and audited disposal.'
            )}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-1.5 rounded-xl bg-mehndi-600 text-white text-xs font-semibold hover:bg-mehndi-700 flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Asset</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search', 'Search by tag, serial number, item name...')}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-mehndi-500/20"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-xs border border-zinc-200 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_MAINTENANCE">In Maintenance</option>
          <option value="DISPOSED">Disposed</option>
        </select>
      </div>

      {/* Asset Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-zinc-500">Loading asset register...</div>
        ) : assets.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 space-y-2">
            <Armchair className="w-8 h-8 mx-auto text-zinc-300" />
            <p className="text-sm font-medium">No assets registered yet</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">Asset Tag</th>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Current Custodian</th>
                <th className="py-3 px-4">Condition</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {assets.map((asset) => {
                const activeAssign = asset.assignments?.[0];
                return (
                  <tr key={asset.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-zinc-900 font-mono flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{asset.assetTag}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-900">
                      <div>{(asset as any).inventoryItem?.name || (asset as any).item?.name}</div>
                      {asset.serialNumber && (
                        <span className="text-[10px] text-zinc-400">S/N: {asset.serialNumber}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-zinc-600">{asset.location?.name}</td>
                    <td className="py-3 px-4 text-zinc-600">
                      {activeAssign?.employee ? (
                        <div className="font-medium text-zinc-800">
                          {activeAssign.employee.firstName} {activeAssign.employee.lastName}
                        </div>
                      ) : activeAssign?.department ? (
                        <div className="font-medium text-zinc-800">{activeAssign.department.name}</div>
                      ) : (
                        <span className="text-zinc-400">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-zinc-600 font-medium">{asset.condition}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          asset.status === 'AVAILABLE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : asset.status === 'ASSIGNED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : asset.status === 'DISPOSED'
                            ? 'bg-zinc-100 text-zinc-500 line-through'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {asset.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {asset.status === 'AVAILABLE' && (
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setActionModal('assign');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold"
                        >
                          Assign
                        </button>
                      )}
                      {asset.status === 'ASSIGNED' && (
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setActionModal('return');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold"
                        >
                          Return
                        </button>
                      )}
                      {asset.status !== 'DISPOSED' && asset.status !== 'ASSIGNED' && (
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setActionModal('dispose');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-red-50 text-zinc-600 hover:text-red-700 font-semibold"
                        >
                          Dispose
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Asset Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-zinc-900">Register Asset</h3>
            <form onSubmit={handleCreateAsset} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Catalog Item *</label>
                <select
                  required
                  value={createForm.inventoryItemId}
                  onChange={(e) => setCreateForm({ ...createForm, inventoryItemId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                >
                  <option value="">Select Item</option>
                  {items.map((i: InventoryItem) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.itemCode})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Location *</label>
                  <select
                    required
                    value={createForm.locationId}
                    onChange={(e) => setCreateForm({ ...createForm, locationId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  >
                    <option value="">Select Location</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Condition</label>
                  <select
                    value={createForm.condition}
                    onChange={(e) => setCreateForm({ ...createForm, condition: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  >
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Serial Number</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-8921-X"
                    value={createForm.serialNumber}
                    onChange={(e) => setCreateForm({ ...createForm, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Purchase Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={createForm.purchaseCost}
                    onChange={(e) => setCreateForm({ ...createForm, purchaseCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAssetMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-mehndi-600 text-white font-semibold hover:bg-mehndi-700 disabled:opacity-50"
                >
                  Create & Tag Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Modal (Assign / Return / Dispose) */}
      {actionModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-zinc-900 uppercase">
              {actionModal} Asset — {selectedAsset.assetTag}
            </h3>

            {actionModal === 'assign' && (
              <form onSubmit={handleAssign} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Notes / Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Issued for classroom 3B"
                    value={assignForm.remarks}
                    onChange={(e) => setAssignForm({ ...assignForm, remarks: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActionModal(null)}
                    className="px-4 py-2 rounded-xl border border-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
                  >
                    Confirm Assignment
                  </button>
                </div>
              </form>
            )}

            {actionModal === 'return' && (
              <form onSubmit={handleReturn} className="space-y-3 text-xs">
                <p className="text-zinc-600">
                  Are you sure you want to mark this asset as returned to available inventory?
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActionModal(null)}
                    className="px-4 py-2 rounded-xl border border-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                  >
                    Confirm Return
                  </button>
                </div>
              </form>
            )}

            {actionModal === 'dispose' && (
              <form onSubmit={handleDispose} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Method *</label>
                  <select
                    value={disposeForm.method}
                    onChange={(e) => setDisposeForm({ ...disposeForm, method: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  >
                    <option value="SCRAP">Scrap</option>
                    <option value="SALE">Sale</option>
                    <option value="DONATION">Donation</option>
                    <option value="WRITE_OFF">Write Off</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Disposal Reason *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Beyond repair"
                    value={disposeForm.reason}
                    onChange={(e) => setDisposeForm({ ...disposeForm, reason: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActionModal(null)}
                    className="px-4 py-2 rounded-xl border border-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700"
                  >
                    Confirm Disposal
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetsView;
