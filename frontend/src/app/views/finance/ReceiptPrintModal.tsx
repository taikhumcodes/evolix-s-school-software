import React from 'react';
import { useTranslation } from 'react-i18next';
import { Printer, X } from 'lucide-react';

interface ReceiptPrintModalProps {
  receipt: any | null;
  isOpen: boolean;
  onClose: () => void;
  isReprint?: boolean;
}

export const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({
  receipt,
  isOpen,
  onClose,
  isReprint = false,
}) => {
  const { t } = useTranslation();

  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-zinc-200 print:shadow-none print:border-none print:m-0 print:max-w-none">
        {/* Modal Actions (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-900">
              {t('finance.receipt.title', 'Official Fee Receipt')}
            </span>
            {isReprint && (
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                {t('finance.receipt.duplicateCopy', 'DUPLICATE COPY / REPRINT')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('finance.common.print', 'Print')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="p-8 print:p-6 space-y-6 text-zinc-900 font-sans">
          {/* Header & School Branding */}
          <div className="text-center border-b-2 border-zinc-900 pb-4">
            <h1 className="text-2xl font-black uppercase tracking-wider text-zinc-900">
              GREENWOOD HIGH SCHOOL
            </h1>
            <p className="text-xs font-medium text-zinc-600 uppercase tracking-widest mt-0.5">
              Affiliated with CBSE Board &bull; School Code: 20481
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">
              Main Campus, Knowledge Corridor, City Center &bull; Contact: +91 98765 43210
            </p>

            <div className="mt-3 inline-block px-4 py-1 rounded bg-zinc-100 border border-zinc-300">
              <span className="text-xs font-black uppercase tracking-widest">
                {t('finance.receipt.studentReceipt', 'FEE PAYMENT RECEIPT')}
              </span>
            </div>
          </div>

          {/* Receipt & Student Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs border border-zinc-200 rounded-xl p-4 bg-zinc-50/50">
            <div className="space-y-1.5">
              <div className="flex">
                <span className="w-28 font-bold text-zinc-600">
                  {t('finance.receipt.receiptNo', 'Receipt No')}:
                </span>
                <span className="font-mono font-black text-zinc-900">{receipt.receiptNumber}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold text-zinc-600">
                  {t('finance.receipt.date', 'Receipt Date')}:
                </span>
                <span>
                  {new Date(receipt.receiptDate || receipt.paymentDate || Date.now()).toLocaleDateString()}
                </span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold text-zinc-600">
                  {t('finance.receipt.paymentMethod', 'Payment Mode')}:
                </span>
                <span className="font-bold">
                  {receipt.feePayment?.paymentMethod ||
                    receipt.breakdownSnapshot?.paymentMethod ||
                    receipt.paymentMethod}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex">
                <span className="w-28 font-bold text-zinc-600">
                  {t('finance.receipt.studentName', 'Student Name')}:
                </span>
                <span className="font-bold text-zinc-900">
                  {receipt.studentSnapshot?.name ||
                    (receipt.student
                      ? `${receipt.student.firstName} ${receipt.student.lastName}`
                      : '')}
                </span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold text-zinc-600">
                  {t('finance.receipt.admNo', 'Admission No')}:
                </span>
                <span className="font-mono">
                  {receipt.studentSnapshot?.admissionNumber ||
                    receipt.student?.admissionNumber ||
                    '-'}
                </span>
              </div>
              {(receipt.feePayment?.transactionReference || receipt.referenceNumber) && (
                <div className="flex">
                  <span className="w-28 font-bold text-zinc-600">
                    {t('finance.receipt.refNo', 'Reference No')}:
                  </span>
                  <span className="font-mono">
                    {receipt.feePayment?.transactionReference || receipt.referenceNumber}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Fee Allocations Table */}
          <div className="border border-zinc-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-zinc-100 border-b border-zinc-200 font-bold text-zinc-700">
                  <th className="py-2.5 px-4">{t('finance.receipt.srNo', '#')}</th>
                  <th className="py-2.5 px-4">{t('finance.receipt.invoiceNo', 'Invoice Number')}</th>
                  <th className="py-2.5 px-4">{t('finance.receipt.description', 'Description')}</th>
                  <th className="py-2.5 px-4 text-right">{t('finance.receipt.amountPaid', 'Allocated (₹)')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {receipt.feePayment?.allocations && receipt.feePayment.allocations.length > 0 ? (
                  receipt.feePayment.allocations.map((alloc: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-4 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-zinc-900">
                        {alloc.feeInvoice?.invoiceNumber || 'INV-DIRECT'}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-600">
                        {t('finance.receipt.schoolFees', 'School Academic Tuition & Incidental Dues')}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold">
                        ₹{Number(alloc.allocatedAmount).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-2.5 px-4 font-mono">1</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-zinc-900">DIRECT-RECEIPT</td>
                    <td className="py-2.5 px-4 text-zinc-600">
                      {t('finance.receipt.studentPayment', 'Student Fee Payment')}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      ₹{receipt.breakdownSnapshot?.totalAmount}
                    </td>
                  </tr>
                )}
                {Number(receipt.breakdownSnapshot?.advanceAmount || 0) > 0 && (
                  <tr className="bg-amber-50/50">
                    <td className="py-2 px-4 font-mono font-bold text-amber-800" colSpan={3}>
                      {t('finance.receipt.unappliedAdvance', 'Unapplied Advance Credit Balance')}
                    </td>
                    <td className="py-2 px-4 text-right font-mono font-bold text-amber-800">
                      ₹{Number(receipt.breakdownSnapshot?.advanceAmount).toFixed(2)}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-50 border-t-2 border-zinc-300 text-zinc-900 font-extrabold text-sm">
                  <td className="py-3 px-4" colSpan={3}>
                    {t('finance.receipt.grandTotal', 'TOTAL AMOUNT RECEIVED')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-800">
                    ₹{receipt.breakdownSnapshot?.totalAmount || receipt.feePayment?.amount || receipt.amount || '0.00'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signatures & Declarations */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-xs">
            <div>
              <p className="text-[10px] text-zinc-400">
                * This receipt is computer generated and authoritatively recorded in the General Ledger.
              </p>
            </div>
            <div className="text-right space-y-8">
              <div className="border-b border-zinc-400 w-48 ml-auto" />
              <p className="font-bold text-zinc-800 uppercase tracking-wider text-[10px]">
                {t('finance.receipt.cashierSign', 'Authorized Cashier / Accounts Signatory')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
