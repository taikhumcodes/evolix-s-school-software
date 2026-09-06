import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  HeartHandshake,
  Printer,
} from 'lucide-react';
import { useParentChildFinance, FeeReceipt } from '../../../lib/api/finance';
import { ReceiptPrintModal } from './ReceiptPrintModal';
import { StatementPrintModal } from './StatementPrintModal';
import apiClient from '../../../lib/api-client';

export const ParentFinanceView: React.FC = () => {
  const { t } = useTranslation();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [selectedReceipt, setSelectedReceipt] = useState<FeeReceipt | null>(null);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

  // Fetch parent linked children on mount
  React.useEffect(() => {
    const fetchChildren = async () => {
      try {
        const { data } = await apiClient.get('/guardians/me/children');
        const list = Array.isArray(data) ? data : data?.data || [];
        setChildren(list);
        if (list.length > 0 && !selectedChildId) {
          setSelectedChildId(list[0].id || list[0].studentId);
        }
      } catch (err) {
        // Fallback for staff previewing parent portal
      }
    };
    fetchChildren();
  }, []);

  const { data: parentFinance, isLoading } = useParentChildFinance(selectedChildId);
  const selectedChild = children.find((c) => (c.id || c.studentId) === selectedChildId) || {
    firstName: 'My',
    lastName: 'Child',
    admissionNumber: 'N/A',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-mehndi-600" />
            <h1 className="text-xl font-black text-zinc-900 tracking-tight">
              {t('finance.parent.title', 'Parent Fee & Dues Portal')}
            </h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {t(
              'finance.parent.subtitle',
              'Inspect your linked child fee schedule, invoices, payments, and print official receipts'
            )}
          </p>
        </div>

        {/* Child Selector if multiple children linked */}
        {children.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-600">Select Child:</span>
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="text-xs px-3 py-1.5 border border-zinc-300 rounded-lg font-bold"
            >
              {children.map((c) => (
                <option key={c.id || c.studentId} value={c.id || c.studentId}>
                  {c.firstName} {c.lastName} ({c.admissionNumber})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-mehndi-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : parentFinance ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                Total Fees
              </span>
              <p className="text-xl font-black text-zinc-900 font-mono mt-1">
                ₹{parentFinance.summary.totalCharges}
              </p>
            </div>
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                Total Paid
              </span>
              <p className="text-xl font-black text-emerald-900 font-mono mt-1">
                ₹{parentFinance.summary.totalPaid}
              </p>
            </div>
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">
                Outstanding Balance
              </span>
              <p className="text-xl font-black text-rose-900 font-mono mt-1">
                ₹{parentFinance.summary.outstandingBalance}
              </p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
                Overdue
              </span>
              <p className="text-xl font-black text-amber-900 font-mono mt-1">
                ₹{parentFinance.summary.overdueAmount}
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsStatementModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-900 text-white text-xs font-bold rounded-lg shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Download / Print Full Account Statement</span>
            </button>
          </div>

          {/* Fee Invoices */}
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-3.5 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">Fee Invoices</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 font-bold text-zinc-600">
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Due Date</th>
                    <th className="py-2.5 px-4 text-right">Total Amount (₹)</th>
                    <th className="py-2.5 px-4 text-right">Paid (₹)</th>
                    <th className="py-2.5 px-4 text-right">Remaining Due (₹)</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {parentFinance.invoices && parentFinance.invoices.length > 0 ? (
                    parentFinance.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-zinc-50">
                        <td className="py-2.5 px-4 font-mono font-bold text-zinc-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-2.5 px-4 text-zinc-600">
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold">₹{inv.totalAmount}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-emerald-700">₹{inv.paidAmount}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-black text-rose-700">
                          ₹{inv.outstandingAmount}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100">
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-zinc-400">
                        No invoices found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Receipts History */}
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-3.5 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Payment Receipts & Acknowledgments
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 font-bold text-zinc-600">
                    <th className="py-2.5 px-4">Receipt #</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Mode</th>
                    <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {parentFinance.receipts && parentFinance.receipts.length > 0 ? (
                    parentFinance.receipts.map((r) => (
                      <tr key={r.id} className="hover:bg-zinc-50">
                        <td className="py-2.5 px-4 font-mono font-bold text-zinc-900">{r.receiptNumber}</td>
                        <td className="py-2.5 px-4 text-zinc-600">
                          {new Date(r.receiptDate).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100">
                            {r.feePayment?.paymentMethod || r.breakdownSnapshot?.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                          ₹{r.breakdownSnapshot?.totalAmount}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded font-semibold text-xs"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Print</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-zinc-400">
                        No receipts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 border-2 border-dashed border-zinc-200 rounded-xl text-center text-zinc-400 text-xs">
          No linked child records available for this account.
        </div>
      )}

      {/* Print Receipt Modal */}
      <ReceiptPrintModal
        isOpen={!!selectedReceipt}
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        isReprint={true}
      />

      {/* Print Statement Modal */}
      <StatementPrintModal
        isOpen={isStatementModalOpen}
        student={selectedChild}
        ledger={parentFinance ? { summary: parentFinance.summary, entries: parentFinance.statement } : null}
        onClose={() => setIsStatementModalOpen(false)}
      />
    </div>
  );
};
export default ParentFinanceView;
