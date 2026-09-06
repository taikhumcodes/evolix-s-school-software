import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Package,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Search,
  AlertTriangle,
  History,
} from 'lucide-react';
import {
  useInventoryItems,
  useInventoryCategories,
  useInventoryLocations,
  useStockLedger,
  useCreateInventoryItem,
  useStockMovementMutation,
  InventoryItem,
} from '../../../lib/api/operations';

export const InventoryView: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'items' | 'ledger'>('items');
  const [search, setSearch] = useState('');

  // Queries
  const { data: itemsData, isLoading: loadingItems } = useInventoryItems({ search: search || undefined });
  const { data: categories = [] } = useInventoryCategories();
  const { data: locations = [] } = useInventoryLocations();
  const { data: ledgerData, isLoading: loadingLedger } = useStockLedger();

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [movementModalType, setMovementModalType] = useState<'inward' | 'issue' | 'transfer' | 'adjust' | null>(null);

  // Form states
  const createItemMutation = useCreateInventoryItem();
  const inwardMutation = useStockMovementMutation('inward');
  const issueMutation = useStockMovementMutation('issue');
  const transferMutation = useStockMovementMutation('transfer');
  const adjustMutation = useStockMovementMutation('adjust');

  const [itemForm, setItemForm] = useState({
    name: '',
    categoryId: '',
    unitOfMeasure: 'PCS',
    itemType: 'CONSUMABLE',
    minimumStockLevel: 5,
  });

  const [movementForm, setMovementForm] = useState({
    itemId: '',
    locationId: '',
    toLocationId: '',
    quantity: 1,
    adjustmentType: 'ADJUSTMENT_IN',
    reason: '',
    remarks: '',
  });

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    await createItemMutation.mutateAsync(itemForm);
    setShowItemModal(false);
    setItemForm({
      name: '',
      categoryId: '',
      unitOfMeasure: 'PCS',
      itemType: 'CONSUMABLE',
      minimumStockLevel: 5,
    });
  };

  const handleExecuteMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementModalType) return;

    if (movementModalType === 'inward') {
      await inwardMutation.mutateAsync({
        itemId: movementForm.itemId,
        locationId: movementForm.locationId,
        quantity: Number(movementForm.quantity),
        remarks: movementForm.remarks,
      });
    } else if (movementModalType === 'issue') {
      await issueMutation.mutateAsync({
        itemId: movementForm.itemId,
        locationId: movementForm.locationId,
        quantity: Number(movementForm.quantity),
        remarks: movementForm.remarks,
      });
    } else if (movementModalType === 'transfer') {
      await transferMutation.mutateAsync({
        itemId: movementForm.itemId,
        fromLocationId: movementForm.locationId,
        toLocationId: movementForm.toLocationId,
        quantity: Number(movementForm.quantity),
        remarks: movementForm.remarks,
      });
    } else if (movementModalType === 'adjust') {
      await adjustMutation.mutateAsync({
        itemId: movementForm.itemId,
        locationId: movementForm.locationId,
        adjustmentType: movementForm.adjustmentType,
        quantity: Number(movementForm.quantity),
        reason: movementForm.reason || 'Physical count verification',
        remarks: movementForm.remarks,
      });
    }

    setMovementModalType(null);
    setMovementForm({
      itemId: '',
      locationId: '',
      toLocationId: '',
      quantity: 1,
      adjustmentType: 'ADJUSTMENT_IN',
      reason: '',
      remarks: '',
    });
  };

  const items: InventoryItem[] = Array.isArray(itemsData) ? (itemsData as any) : (itemsData?.items || []);
  const ledger: any[] = ledgerData?.items || [];

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-600" />
            {t('operations.inventory.title', 'Inventory & Supplies Management')}
          </h1>
          <p className="text-xs text-zinc-500">
            {t(
              'operations.inventory.subtitle',
              'Authoritative double-entry stock ledger. Stock balances are strictly the signed sum of validated movements.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-zinc-100 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setActiveTab('items')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'items' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Stock Catalog ({items.length})
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'ledger' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Movement Ledger
            </button>
          </div>

          <button
            onClick={() => setShowItemModal(true)}
            className="px-3 py-1.5 rounded-xl bg-mehndi-600 text-white text-xs font-semibold hover:bg-mehndi-700 flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>

          <button
            onClick={() => setMovementModalType('inward')}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1 shadow-sm"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Inward (+)</span>
          </button>

          <button
            onClick={() => setMovementModalType('issue')}
            className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 flex items-center gap-1 shadow-sm"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Issue (-)</span>
          </button>

          <button
            onClick={() => setMovementModalType('transfer')}
            className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 flex items-center gap-1 shadow-sm"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Transfer (⇄)</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('common.search', 'Search items by code, name, category...')}
          className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
        />
      </div>

      {/* 1. Items Catalog */}
      {activeTab === 'items' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
          {loadingItems ? (
            <div className="p-8 text-center text-xs text-zinc-500">Loading inventory items...</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 space-y-2">
              <Package className="w-8 h-8 mx-auto text-zinc-300" />
              <p className="text-sm font-medium">No inventory items found</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Item Code</th>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Total Stock</th>
                  <th className="py-3 px-4">Location Breakdown</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((item) => {
                  const totalQty = (item.stockBalances || []).reduce(
                    (acc, b) => acc + Number(b.currentQuantity || 0),
                    0
                  );
                  const isLow = totalQty <= item.minimumStockLevel;

                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-zinc-900">{item.itemCode}</td>
                      <td className="py-3 px-4 font-semibold text-zinc-900">
                        <div>{item.name}</div>
                        <span className="text-[10px] text-zinc-400">Min: {item.minimumStockLevel} {item.unitOfMeasure}</span>
                      </td>
                      <td className="py-3 px-4 text-zinc-600">{item.category?.name}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
                          {item.itemType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-bold inline-flex items-center gap-1 ${
                            isLow ? 'text-red-600' : 'text-zinc-900'
                          }`}
                        >
                          {totalQty.toFixed(3)} {item.unitOfMeasure}
                          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-600">
                        {item.stockBalances && item.stockBalances.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.stockBalances.map((b) => (
                              <span
                                key={b.id}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700"
                              >
                                {b.location?.name}: <strong>{Number(b.currentQuantity).toFixed(2)}</strong>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-zinc-400">Zero stock</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {item.status}
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

      {/* 2. Stock Ledger */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
          {loadingLedger ? (
            <div className="p-8 text-center text-xs text-zinc-500">Loading ledger...</div>
          ) : ledger.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 space-y-2">
              <History className="w-8 h-8 mx-auto text-zinc-300" />
              <p className="text-sm font-medium">No stock movements recorded yet</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4">Quantity Delta</th>
                  <th className="py-3 px-4">Recipient / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {ledger.map((m) => {
                  const isPositive = ['OPENING', 'PURCHASE_RECEIPT', 'INWARD', 'RETURN', 'TRANSFER_IN', 'ADJUSTMENT_IN'].includes(
                    m.movementType
                  );

                  return (
                    <tr key={m.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                        {new Date(m.movementDate).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-zinc-900">
                        {m.item?.name} <span className="text-[10px] font-normal text-zinc-400">({m.item?.itemCode})</span>
                      </td>
                      <td className="py-3 px-4 text-zinc-700">{m.location?.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isPositive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {m.movementType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold">
                        <span className={isPositive ? 'text-emerald-600' : 'text-red-600'}>
                          {isPositive ? '+' : '-'}
                          {Number(m.quantity).toFixed(3)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-600">
                        {m.recipientEmployee
                          ? `Employee: ${m.recipientEmployee.displayName}`
                          : m.reason || m.remarks || 'Standard'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-zinc-900">Create Inventory Item</h3>
            <form onSubmit={handleCreateItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A4 Copy Paper 80GSM"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-mehndi-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Category *</label>
                  <select
                    required
                    value={itemForm.categoryId}
                    onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={itemForm.unitOfMeasure}
                    onChange={(e) => setItemForm({ ...itemForm, unitOfMeasure: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Item Type</label>
                  <select
                    value={itemForm.itemType}
                    onChange={(e) => setItemForm({ ...itemForm, itemType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  >
                    <option value="CONSUMABLE">Consumable</option>
                    <option value="NON_CONSUMABLE">Non-Consumable</option>
                    <option value="ASSET_TRACKED">Asset Tracked</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Minimum Alert Level</label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.minimumStockLevel}
                    onChange={(e) => setItemForm({ ...itemForm, minimumStockLevel: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createItemMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-mehndi-600 text-white font-semibold hover:bg-mehndi-700 disabled:opacity-50"
                >
                  Create Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement Operation Modal (Inward / Issue / Transfer / Adjust) */}
      {movementModalType && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-zinc-900 uppercase">
              Record Stock Movement — {movementModalType}
            </h3>
            <form onSubmit={handleExecuteMovement} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Item *</label>
                <select
                  required
                  value={movementForm.itemId}
                  onChange={(e) => setMovementForm({ ...movementForm, itemId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                >
                  <option value="">Select Item</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.itemCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">
                    {movementModalType === 'transfer' ? 'From Location *' : 'Location *'}
                  </label>
                  <select
                    required
                    value={movementForm.locationId}
                    onChange={(e) => setMovementForm({ ...movementForm, locationId: e.target.value })}
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

                {movementModalType === 'transfer' ? (
                  <div>
                    <label className="block font-medium text-zinc-700 mb-1">To Location *</label>
                    <select
                      required
                      value={movementForm.toLocationId}
                      onChange={(e) => setMovementForm({ ...movementForm, toLocationId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                    >
                      <option value="">Select Destination</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-medium text-zinc-700 mb-1">Quantity *</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      min="0.001"
                      value={movementForm.quantity}
                      onChange={(e) => setMovementForm({ ...movementForm, quantity: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                    />
                  </div>
                )}
              </div>

              {movementModalType === 'transfer' && (
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Transfer Quantity *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    min="0.001"
                    value={movementForm.quantity}
                    onChange={(e) => setMovementForm({ ...movementForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
              )}

              {movementModalType === 'adjust' && (
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Adjustment Type *</label>
                  <select
                    value={movementForm.adjustmentType}
                    onChange={(e) => setMovementForm({ ...movementForm, adjustmentType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  >
                    <option value="ADJUSTMENT_IN">Adjustment In (+ Surplus)</option>
                    <option value="ADJUSTMENT_OUT">Adjustment Out (- Deficit)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Remarks / Note</label>
                <input
                  type="text"
                  placeholder="Optional operational remarks"
                  value={movementForm.remarks}
                  onChange={(e) => setMovementForm({ ...movementForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMovementModalType(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-mehndi-600 text-white font-semibold hover:bg-mehndi-700"
                >
                  Commit Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryView;
