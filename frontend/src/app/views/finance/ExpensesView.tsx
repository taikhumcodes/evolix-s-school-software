import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { FinanceNav } from './FinanceNav';
import {
  useExpenseBills,
  useVendors,
  useAccounts,
  useCreateExpenseBill,
  useCreateVendor,
  usePayVendorExpense,
  useInitializeStandardAccounts,
  ExpenseBill,
} from '../../../lib/api/finance';

import { useToast } from '../../../components/ui/Toast';

export const ExpensesView: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'BILLS' | 'VENDORS'>('BILLS');

  // New Expense Bill Modal
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [vendorId, setVendorId] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [isImmediatePayment, setIsImmediatePayment] = useState(false);
  const [disbursingAccountId, setDisbursingAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [lines, setLines] = useState([
    { accountId: '', description: '', amount: '' },
  ]);

  // Vendor Payment Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedBillForPay, setSelectedBillForPay] = useState<ExpenseBill | null>(null);
  const [payDisbursingAccountId, setPayDisbursingAccountId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('BANK_TRANSFER');
  const [payReference, setPayReference] = useState('');

  // New Vendor Modal
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [bankDetails, setBankDetails] = useState('');

  // Quick Add Vendor inside Bill Modal
  const [isQuickAddVendorOpen, setIsQuickAddVendorOpen] = useState(false);
  const [quickVendorName, setQuickVendorName] = useState('');
  const [quickContactPerson, setQuickContactPerson] = useState('');
  const [quickPhone, setQuickPhone] = useState('');

  const { data: billsData, refetch: refetchBills } = useExpenseBills(1);
  const { data: vendors, refetch: refetchVendors } = useVendors();
  const { data: expenseAccounts } = useAccounts('EXPENSE');
  const { data: assetAccounts } = useAccounts('ASSET');

  const createBillMutation = useCreateExpenseBill();
  const createVendorMutation = useCreateVendor();
  const payVendorMutation = usePayVendorExpense();
  const initAccountsMutation = useInitializeStandardAccounts();

  const handleSaveQuickVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickVendorName.trim()) {
      toast.warning('Please enter a vendor company or provider name.');
      return;
    }
    try {
      const created = await createVendorMutation.mutateAsync({
        name: quickVendorName.trim(),
        contactPerson: quickContactPerson.trim() || undefined,
        phone: quickPhone.trim() || undefined,
      });
      toast.success(`Vendor "${created.name}" created and selected.`);
      refetchVendors();
      setVendorId(created.id);
      setQuickVendorName('');
      setQuickContactPerson('');
      setQuickPhone('');
      setIsQuickAddVendorOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to create vendor');
    }
  };

  const handleAddLine = () => {
    setLines([...lines, { accountId: '', description: '', amount: '' }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== idx));
    }
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || lines.some((l) => !l.accountId || !l.amount)) return;

    try {
      await createBillMutation.mutateAsync({
        vendorId: vendorId || undefined,
        billDate,
        dueDate: undefined,
        description,
        isImmediatePayment,
        disbursingAccountId: isImmediatePayment ? disbursingAccountId : undefined,
        paymentMethod: isImmediatePayment ? paymentMethod : undefined,
        lines: lines.map((l) => ({
          accountId: l.accountId,
          description: l.description || description,
          amount: parseFloat(l.amount),
        })),
      });

      setIsBillModalOpen(false);
      setDescription('');
      setVendorId('');
      setLines([{ accountId: '', description: '', amount: '' }]);
      refetchBills();
      toast.success('Expense bill created successfully.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to create expense bill');
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) return;

    try {
      await createVendorMutation.mutateAsync({
        name: vendorName.trim(),
        contactPerson: contactPerson || undefined,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        taxId: taxId || undefined,
        bankDetails: bankDetails || undefined,
      });

      setIsVendorModalOpen(false);
      setVendorName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
      setTaxId('');
      setBankDetails('');
      refetchVendors();
      toast.success('Vendor profile created successfully.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to create vendor');
    }
  };

  const handlePayBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillForPay || !payDisbursingAccountId || !payAmount) return;

    try {
      await payVendorMutation.mutateAsync({
        vendorId: selectedBillForPay.vendorId,
        disbursingAccountId: payDisbursingAccountId,
        expenseBillId: selectedBillForPay.id,
        amount: parseFloat(payAmount),
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: payMethod,
        referenceNumber: payReference || undefined,
      });

      setIsPayModalOpen(false);
      setSelectedBillForPay(null);
      setPayAmount('');
      setPayReference('');
      refetchBills();
      toast.success('Vendor payment recorded and journal posted to GL.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Payment failed');
    }
  };

  return (
    <div className="space-y-6">
      <FinanceNav />

      {/* Action Header & Tabs */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('BILLS')}
            className={`pb-1 border-b-2 transition-all ${
              activeTab === 'BILLS'
                ? 'border-mehndi-600 text-mehndi-700 font-extrabold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {t('finance.expenses.tabBills', 'Expense Bills & Vouchers')}
          </button>
          <button
            onClick={() => setActiveTab('VENDORS')}
            className={`pb-1 border-b-2 transition-all ${
              activeTab === 'VENDORS'
                ? 'border-mehndi-600 text-mehndi-700 font-extrabold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {t('finance.expenses.tabVendors', 'Vendor Master')}
          </button>
        </div>

        <div>
          {activeTab === 'BILLS' ? (
            <button
              type="button"
              onClick={() => setIsBillModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t('finance.expenses.newBill', 'Record Expense Bill')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsVendorModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t('finance.expenses.newVendor', 'Add Vendor')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab: Bills */}
      {activeTab === 'BILLS' && (
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Bill #</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Total (₹)</th>
                  <th className="py-3 px-4 text-right">Paid (₹)</th>
                  <th className="py-3 px-4 text-right">Due (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {billsData?.data && billsData.data.length > 0 ? (
                  billsData.data.map((bill) => (
                    <tr key={bill.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-zinc-900">{bill.billNumber}</td>
                      <td className="py-3 px-4 font-medium text-zinc-800">
                        {bill.vendor?.name || 'Direct Campus Expense'}
                      </td>
                      <td className="py-3 px-4 text-zinc-600">
                        {new Date(bill.billDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-zinc-600 truncate max-w-xs">{bill.description}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900">
                        ₹{bill.totalAmount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">₹{bill.paidAmount}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-rose-700">
                        ₹{bill.outstandingAmount}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            bill.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : bill.status === 'PARTIALLY_PAID'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {bill.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {parseFloat(bill.outstandingAmount) > 0 && bill.vendorId && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBillForPay(bill);
                              setPayAmount(bill.outstandingAmount);
                              setIsPayModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold bg-mehndi-50 text-mehndi-700 border border-mehndi-200 rounded hover:bg-mehndi-100 transition-colors"
                          >
                            Pay Bill
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-zinc-400">
                      No expense bills recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Vendors */}
      {activeTab === 'VENDORS' && (
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Vendor Name</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Tax ID / GSTIN</th>
                  <th className="py-3 px-4">Bank Account</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {vendors && vendors.length > 0 ? (
                  vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-zinc-900">{v.name}</td>
                      <td className="py-3 px-4 text-zinc-600">{v.contactPerson || '-'}</td>
                      <td className="py-3 px-4 font-mono">{v.phone || '-'}</td>
                      <td className="py-3 px-4">{v.email || '-'}</td>
                      <td className="py-3 px-4 font-mono">{v.taxId || '-'}</td>
                      <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                        {v.bankDetails ? '•••• ' + v.bankDetails.slice(-4) : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr key="empty-vendors">
                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Users className="w-8 h-8 text-zinc-300" />
                        <p className="font-semibold text-zinc-700">No vendors added yet</p>
                        <p className="text-xs text-zinc-400">Add utility providers, suppliers, contractors, and service vendors.</p>
                        <button
                          type="button"
                          onClick={() => setIsVendorModalOpen(true)}
                          className="mt-2 px-3 py-1.5 bg-mehndi-600 hover:bg-mehndi-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors"
                        >
                          + Add First Vendor
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Expense Bill Modal */}
      {isBillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-zinc-200 space-y-4 my-8">
            <h3 className="text-base font-extrabold text-zinc-900">Record New Expense Bill / Voucher</h3>

            <form onSubmit={handleCreateBill} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-zinc-700 uppercase tracking-wider">
                      Vendor (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickAddVendorOpen(!isQuickAddVendorOpen)}
                      className="text-[11px] font-bold text-mehndi-700 hover:text-mehndi-800 flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isQuickAddVendorOpen ? 'Choose Existing' : '+ Quick Add Vendor'}</span>
                    </button>
                  </div>
                  {isQuickAddVendorOpen ? (
                    <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
                      <input
                        type="text"
                        placeholder="Vendor Company / Provider Name *"
                        value={quickVendorName}
                        onChange={(e) => setQuickVendorName(e.target.value)}
                        className="w-full px-2 py-1.5 border border-zinc-300 rounded text-xs bg-white focus:ring-1 focus:ring-mehndi-500"
                      />
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          placeholder="Contact Person"
                          value={quickContactPerson}
                          onChange={(e) => setQuickContactPerson(e.target.value)}
                          className="w-full px-2 py-1.5 border border-zinc-300 rounded text-xs bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Phone"
                          value={quickPhone}
                          onChange={(e) => setQuickPhone(e.target.value)}
                          className="w-full px-2 py-1.5 border border-zinc-300 rounded text-xs bg-white"
                        />
                      </div>
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsQuickAddVendorOpen(false)}
                          className="px-2 py-1 text-[11px] text-zinc-600 hover:text-zinc-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveQuickVendor}
                          disabled={createVendorMutation.isPending}
                          className="px-2.5 py-1 text-[11px] font-bold bg-mehndi-600 hover:bg-mehndi-700 text-white rounded shadow-xs"
                        >
                          {createVendorMutation.isPending ? 'Saving...' : 'Save & Select Vendor'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={vendorId}
                      onChange={(e) => setVendorId(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white"
                    >
                      <option value="">-- Direct Expense (No Vendor) --</option>
                      {vendors?.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} {v.phone ? `(${v.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Bill Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Overall Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly electricity bill or computer lab repairs"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white"
                />
              </div>

              {/* Dynamic Line Items */}
              <div className="space-y-2 border-t border-b border-zinc-100 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-700 uppercase tracking-wider">
                    Expense Line Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-mehndi-700 hover:text-mehndi-800 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Line</span>
                  </button>
                </div>

                {(!expenseAccounts || expenseAccounts.length === 0) && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900">
                    <span>No expense accounts configured in Chart of Accounts.</span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await initAccountsMutation.mutateAsync();
                          toast.success('Standard accounts provisioned successfully.');
                        } catch (e: any) {
                          toast.error(e?.message || 'Failed to provision accounts');
                        }
                      }}
                      className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded font-bold text-[11px]"
                    >
                      Initialize Standard Accounts
                    </button>
                  </div>
                )}

                {lines.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-5">
                      <select
                        required
                        value={l.accountId}
                        onChange={(e) => {
                          const updated = [...lines];
                          updated[idx].accountId = e.target.value;
                          setLines(updated);
                        }}
                        className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg"
                      >
                        <option value="">-- Expense Account --</option>
                        {expenseAccounts?.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} &bull; {acc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        placeholder="Line note"
                        value={l.description}
                        onChange={(e) => {
                          const updated = [...lines];
                          updated[idx].description = e.target.value;
                          setLines(updated);
                        }}
                        className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg"
                      >
                      </input>
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="Amount"
                        value={l.amount}
                        onChange={(e) => {
                          const updated = [...lines];
                          updated[idx].amount = e.target.value;
                          setLines(updated);
                        }}
                        className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div className="sm:col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        disabled={lines.length === 1}
                        className="text-zinc-400 hover:text-rose-600 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Immediate Payment Toggle */}
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="immediatePaymentCheck"
                    checked={isImmediatePayment}
                    onChange={(e) => setIsImmediatePayment(e.target.checked)}
                    className="rounded border-zinc-300 text-mehndi-600 focus:ring-mehndi-500"
                  />
                  <label htmlFor="immediatePaymentCheck" className="font-bold text-zinc-800">
                    Paid Immediately (Disburse from Cash/Bank now)
                  </label>
                </div>

                {isImmediatePayment && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block font-bold text-zinc-600 mb-1">Disbursing Account *</label>
                      <select
                        required={isImmediatePayment}
                        value={disbursingAccountId}
                        onChange={(e) => setDisbursingAccountId(e.target.value)}
                        className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg"
                      >
                        <option value="">-- Disbursing Account --</option>
                        {assetAccounts?.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} &bull; {acc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-zinc-600 mb-1">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg font-bold"
                      >
                        <option value="BANK_TRANSFER">BANK TRANSFER</option>
                        <option value="CASH">CASH</option>
                        <option value="CHEQUE">CHEQUE</option>
                        <option value="UPI">UPI</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBillModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBillMutation.isPending}
                  className="px-5 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {createBillMutation.isPending ? 'Posting...' : 'Commit Expense Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Vendor Modal */}
      {isPayModalOpen && selectedBillForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200 space-y-4">
            <h3 className="text-base font-extrabold text-zinc-900">
              Vendor Payment Settlement
            </h3>
            <p className="text-xs text-zinc-500">
              Bill <strong className="font-mono">{selectedBillForPay.billNumber}</strong> &bull; Vendor:{' '}
              {selectedBillForPay.vendor?.name}
            </p>

            <form onSubmit={handlePayBill} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={selectedBillForPay.outstandingAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Disbursing Cash / Bank Account *
                </label>
                <select
                  required
                  value={payDisbursingAccountId}
                  onChange={(e) => setPayDisbursingAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                >
                  <option value="">-- Select Disbursing Account --</option>
                  {assetAccounts?.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} &bull; {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Payment Mode *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-bold"
                >
                  <option value="BANK_TRANSFER">BANK TRANSFER (NEFT/RTGS/IMPS)</option>
                  <option value="CASH">CASH</option>
                  <option value="CHEQUE">CHEQUE</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Transaction Reference #
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-99887766"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payVendorMutation.isPending}
                  className="px-5 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {payVendorMutation.isPending ? 'Processing...' : 'Commit Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Vendor Modal */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200 space-y-4">
            <h3 className="text-base font-extrabold text-zinc-900">Add New Finance Vendor</h3>

            <form onSubmit={handleCreateVendor} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Reliance Power Ltd or Supreme Stationary"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Tax ID / GSTIN
                  </label>
                  <input
                    type="text"
                    placeholder="27AAAPA1234A1Z5"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Bank Account (Masked)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC 004812"
                    value={bankDetails}
                    onChange={(e) => setBankDetails(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVendorModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createVendorMutation.isPending}
                  className="px-5 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {createVendorMutation.isPending ? 'Saving...' : 'Save Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ExpensesView;
